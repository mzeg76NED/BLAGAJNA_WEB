import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

// "Storno" - reverses a POSTED/LOCKED cash event by posting a REVERSAL event with the
// opposite direction (never mutates/deletes the original), and flips the original's
// status to REVERSED. Ported from CashEvents.gs reverseCashEvent/assertCashEventCanBeReversed_.
const LOCKED_REVERSAL_ROLES = ['ADMIN', 'FINANCE'];

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

function getOppositeDirection(direction) {
  if (direction === 'IN') return 'OUT';
  if (direction === 'OUT') return 'IN';
  throw Object.assign(new Error('Neutral Cash Event cannot be reversed with this workflow.'), { status: 400 });
}

function buildReversalDescription(originalEvent, reason) {
  const prefix = originalEvent.status === 'LOCKED' ? 'POST_CLOSING_CORRECTION. ' : '';
  return prefix + 'Reversal of ' + originalEvent.event_id + '. Reason: ' + reason;
}

async function findEvent(env, eventId) {
  const rows = await supabaseRest(env, '/cash_events?select=*&event_id=' + encodeEq(eventId) + '&limit=1');
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
    if (originalBefore.status === 'REVERSED') return apiError('Stavka je već stornirana: ' + eventId, 409);
    if (originalBefore.status === 'CANCELLED') return apiError('Otkazana stavka ne može biti stornirana: ' + eventId, 409);
    if (!['POSTED', 'LOCKED'].includes(originalBefore.status)) {
      return apiError('Samo proknjižena ili zaključana stavka može biti stornirana.', 409);
    }

    const appUser = sessionResult.session.app_user || {};
    if (originalBefore.status === 'LOCKED' && !LOCKED_REVERSAL_ROLES.includes(appUser.role) && appUser.role !== 'ADMIN') {
      return apiError('Storno zaključane stavke može da radi samo Admin ili Finansije.', 403);
    }

    const direction = getOppositeDirection(originalBefore.direction);
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
      direction,
      amount: Number(originalBefore.amount || 0),
      linked_request_id: originalBefore.linked_request_id || null,
      linked_order_id: originalBefore.linked_order_id || null,
      partner_name: originalBefore.partner_name || '',
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

    const originalRows = await supabaseRest(env, '/cash_events?event_id=' + encodeEq(eventId), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ status: 'REVERSED', updated_at: now })
    });
    const originalAfter = originalRows && originalRows.length ? originalRows[0] : { ...originalBefore, status: 'REVERSED' };

    const newBalance = await getCashboxBalance(env, originalBefore.cashbox_id, originalBefore.currency);

    await insertAuditLog(
      env, 'REVERSE', 'CASH_EVENTS', originalBefore.event_id, originalBefore, originalAfter,
      'Cash event reversed. Reason: ' + reason, appUser, sessionResult.session, originalBefore.cashbox_id
    );
    await insertAuditLog(
      env, 'POST', 'CASH_EVENTS', insertedReversal.event_id, null, insertedReversal,
      'Posted reversal event for original event: ' + originalBefore.event_id, appUser, sessionResult.session, originalBefore.cashbox_id
    );

    return apiOk({
      originalEvent: originalAfter,
      reversalEvent: insertedReversal,
      previousBalance,
      newBalance
    });
  } catch (error) {
    return apiError(error.message || 'Storno stavke nije uspeo.', error.status || 500);
  }
}
