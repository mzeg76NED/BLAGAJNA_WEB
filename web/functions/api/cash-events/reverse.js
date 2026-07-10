import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { assertCashboxNotLocked } from '../../_lib/mandatoryCount.js';

// "Storno" - reverses a POSTED/LOCKED cash event by posting a NEW event on the SAME
// side (same `direction` as the original, e.g. a storno of an "uplata" is itself also
// stored as direction=IN, so it renders in the same Uplata/Isplata column as the event
// it corrects: Uplata 100 / Storno uplata -100, both under Uplata). The `amount` column
// has a DB check (amount >= 0), so the reversal is stored with the SAME positive amount
// as the original - the fact that it's event_type='REVERSAL' is what tells every balance
// calculation (cashbox_balances view, cashEventMath.js, cashSheet.js, dailyClosing.js,
// reports/cash-movements.js) to treat it as the OPPOSITE effect of a normal event with
// that direction. See _lib/cashEventMath.js for the shared sign convention.
// The original event is NEVER mutated or hidden - it stays exactly as it was (status
// untouched), so it remains fully visible in the Knjiga. Idempotency (preventing
// double-storno) is enforced by checking whether a reversal event already references
// this event_id, not by a status flag on the original.
const LOCKED_REVERSAL_ROLES = ['ADMIN', 'FINANCE'];

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

function buildReversalDescription(originalEvent, reason) {
  const prefix = originalEvent.status === 'LOCKED' ? 'POST_CLOSING_CORRECTION. ' : '';
  const ref = originalEvent.ref_no ? ('#' + originalEvent.ref_no) : originalEvent.event_id;
  return prefix + 'STORNO stavke ' + ref + '. Razlog: ' + reason;
}

function buildReversalPartnerName(originalEvent) {
  return 'STORNO' + (originalEvent.partner_name ? ' - ' + originalEvent.partner_name : '');
}

async function findEvent(env, eventId) {
  const rows = await supabaseRest(env, '/cash_events?select=*&event_id=' + encodeEq(eventId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function findExistingReversal(env, eventId) {
  const rows = await supabaseRest(
    env,
    '/cash_events?select=event_id&reversal_of_event_id=' + encodeEq(eventId) + '&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function getCashboxBalance(env, cashboxId, currency) {
  const rows = await supabaseRest(
    env,
    '/cashbox_balances?select=balance&cashbox_id=' + encodeEq(cashboxId) + '&currency=' + encodeEq(currency) + '&limit=1'
  );
  return rows && rows.length ? Number(rows[0].balance || 0) : 0;
}

async function insertAuditLog(env, action, entityType, entityId, oldValue, newValue, comment, user, session, cashboxId) {
  await supabaseRest(env, '/audit_log', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      log_id: makeId('LOG'),
      user: user.email || user.user_code || 'system',
      app_user_id: user.user_id || user.app_user_id || '',
      app_user_name: user.full_name || '',
      user_code: user.user_code || '',
      role: user.role || '',
      google_session_email: (session && session.google_session_email) || '',
      cashbox_id: cashboxId || '',
      shift_id: (session && session.shift_id) || '',
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue || null,
      new_value: newValue || {},
      comment
    })
  });
}

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'cash_events:reverse');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const eventId = String(body.event_id || body.eventId || '').trim();
    const reason = String(body.reason || '').trim();
    if (!eventId) return apiError('event_id je obavezan.', 400);
    if (!reason) return apiError('Razlog storna je obavezan.', 400);

    const originalBefore = await findEvent(env, eventId);
    if (!originalBefore) return apiError('Stavka nije pronađena: ' + eventId, 404);
    if (originalBefore.event_type === 'REVERSAL') return apiError('Storno stavka se ne može ponovo stornirati.', 409);
    if (originalBefore.status === 'CANCELLED') return apiError('Otkazana stavka ne može biti stornirana: ' + eventId, 409);
    if (!['POSTED', 'LOCKED'].includes(originalBefore.status)) {
      return apiError('Samo proknjižena ili zaključana stavka može biti stornirana.', 409);
    }

    const existingReversal = await findExistingReversal(env, eventId);
    if (existingReversal) return apiError('Stavka je već stornirana: ' + eventId, 409);

    await assertCashboxNotLocked(env, originalBefore.cashbox_id);

    const appUser = sessionResult.session.app_user || {};
    if (originalBefore.status === 'LOCKED' && !LOCKED_REVERSAL_ROLES.includes(appUser.role) && appUser.role !== 'ADMIN') {
      return apiError('Storno zaključane stavke može da radi samo Admin ili Finansije.', 403);
    }

    const previousBalance = await getCashboxBalance(env, originalBefore.cashbox_id, originalBefore.currency);
    const now = new Date().toISOString();
    const actorEmail = appUser.email || appUser.user_code || '';

    const reversalEvent = {
      event_id: makeId('CEV'),
      created_at: now,
      created_by: actorEmail,
      event_date: now,
      event_type: 'REVERSAL',
      cashbox_id: originalBefore.cashbox_id,
      currency: originalBefore.currency,
      direction: originalBefore.direction,
      amount: Number(originalBefore.amount || 0),
      linked_request_id: originalBefore.linked_request_id || null,
      linked_order_id: originalBefore.linked_order_id || null,
      partner_name: buildReversalPartnerName(originalBefore),
      description: buildReversalDescription(originalBefore, reason),
      document_status: 'NONE',
      status: 'POSTED',
      posted_by: actorEmail,
      posted_at: now,
      locked_by: null,
      locked_at: null,
      reversal_of_event_id: originalBefore.event_id,
      updated_at: null
    };

    const reversalRows = await supabaseRest(env, '/cash_events', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(reversalEvent)
    });
    const insertedReversal = reversalRows && reversalRows.length ? reversalRows[0] : reversalEvent;

    const newBalance = await getCashboxBalance(env, originalBefore.cashbox_id, originalBefore.currency);

    await insertAuditLog(
      env, 'REVERSE', 'CASH_EVENTS', originalBefore.event_id, originalBefore, originalBefore,
      'Cash event reversed (original left unchanged). Reason: ' + reason + '. Storno event: ' + insertedReversal.event_id,
      appUser, sessionResult.session, originalBefore.cashbox_id
    );
    await insertAuditLog(
      env, 'POST', 'CASH_EVENTS', insertedReversal.event_id, null, insertedReversal,
      'Posted reversal event for original event: ' + originalBefore.event_id, appUser, sessionResult.session, originalBefore.cashbox_id
    );

    return apiOk({
      originalEvent: originalBefore,
      reversalEvent: insertedReversal,
      previousBalance,
      newBalance
    });
  } catch (error) {
    return apiError(error.message || 'Storno stavke nije uspeo.', error.status || 500);
  }
}
