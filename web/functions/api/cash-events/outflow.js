import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

// Direct cash outflow ("Isplata") posted straight to the cashbook, with no Payment
// Request / Payment Order behind it. This mirrors inflow.js and treasury-handover.js.
// Historically this action was hard-disabled in the UI (see scripts.html
// showDirectOutflowDisabledMessage_) because the original design required every payout
// to go through Zahtev -> Nalog -> pending ISPLATA execution. The cashbox owner
// (Milanko) explicitly asked to unlock direct isplata for the shift owner on
// 2026-07-10, alongside the already-working Uplata/Trezor direct actions. Same
// safeguards as treasury-handover apply: requires an open shift for the current user
// and cannot exceed the live cashbox_balances balance.
function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function exists(env, table, key, value, extra = '') {
  const rows = await supabaseRest(env, '/' + table + '?select=' + key + '&' + key + '=' + encodeEq(value) + extra + '&limit=1');
  return Boolean(rows && rows.length);
}

async function findOpenShift(env, cashboxId, userEmail) {
  const rows = await supabaseRest(
    env,
    '/shifts?select=shift_id&cashbox_id=' + encodeEq(cashboxId) + '&status=eq.OPEN&opened_by=' + encodeEq(userEmail) + '&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function getBalance(env, cashboxId, currency) {
  const rows = await supabaseRest(
    env,
    '/cashbox_balances?select=balance&cashbox_id=' + encodeEq(cashboxId) + '&currency=' + encodeEq(currency) + '&limit=1'
  );
  return rows && rows.length ? Number(rows[0].balance || 0) : 0;
}

async function insertAuditLog(env, cashEvent, user, session) {
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
      google_session_email: session.google_session_email || '',
      cashbox_id: cashEvent.cashbox_id || '',
      shift_id: session.shift_id || '',
      action: 'POST',
      entity_type: 'CASH_EVENTS',
      entity_id: cashEvent.event_id || '',
      old_value: null,
      new_value: cashEvent,
      comment: 'Posted direct cash outflow (isplata bez naloga).'
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
    const sessionResult = await verifySession(env, sessionId, 'cash_events:create');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const cashboxId = String(data.cashbox_id || sessionResult.session.cashbox_id || '').trim();
    const currency = String(data.currency || '').trim();
    const amount = Number(data.amount || 0);
    const partnerName = String(data.partner_name || '').trim();
    const description = String(data.description || '').trim();
    if (!cashboxId) return apiError('Blagajna je obavezna.', 400);
    if (!currency) return apiError('Valuta je obavezna.', 400);
    if (!(amount > 0)) return apiError('Iznos mora biti veći od nule.', 400);
    if (!description && !partnerName) return apiError('Primalac ili opis su obavezni.', 400);
    if (!await exists(env, 'cashboxes', 'cashbox_id', cashboxId, '&active=eq.true')) return apiError('Blagajna nije aktivna.', 400);
    if (!await exists(env, 'currencies', 'currency_code', currency, '&active=eq.true')) return apiError('Valuta nije aktivna.', 400);

    const appUser = sessionResult.session.app_user || {};
    const openShift = await findOpenShift(env, cashboxId, appUser.email || '');
    if (!openShift) {
      return apiError('Direktna isplata zahteva otvorenu smenu trenutnog korisnika.', 409);
    }

    const previousBalance = await getBalance(env, cashboxId, currency);
    if (previousBalance < amount) {
      return apiError('Nedovoljno sredstava u blagajni.', 409);
    }

    const now = new Date().toISOString();
    const cashEvent = {
      event_id: makeId('CEV'),
      created_at: now,
      created_by: appUser.email || appUser.user_code || '',
      event_date: data.event_date || now,
      event_type: 'CASH_OUTFLOW',
      cashbox_id: cashboxId,
      currency,
      direction: 'OUT',
      amount,
      linked_request_id: null,
      linked_order_id: null,
      partner_name: partnerName,
      description: description || partnerName,
      document_status: data.document_status === 'ATTACHED' ? 'ATTACHED' : 'NONE',
      status: 'POSTED',
      posted_by: appUser.email || appUser.user_code || '',
      posted_at: now,
      locked_by: null,
      locked_at: null,
      reversal_of_event_id: null,
      updated_at: null
    };

    const rows = await supabaseRest(env, '/cash_events', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(cashEvent)
    });
    const created = rows && rows.length ? rows[0] : cashEvent;
    await insertAuditLog(env, created, appUser, sessionResult.session || {});
    return apiOk(created);
  } catch (error) {
    return apiError(error.message || 'Knjiženje isplate nije uspelo.', error.status || 500);
  }
}
