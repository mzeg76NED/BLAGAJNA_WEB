import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
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
      comment: 'Treasury handover posted.'
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
    const sessionResult = await verifySession(env, sessionId, 'treasury:create');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const cashboxId = String(data.cashbox_id || sessionResult.session.cashbox_id || '').trim();
    const currency = String(data.currency || '').trim();
    const amount = Number(data.amount || 0);
    if (!cashboxId) return apiError('Blagajna je obavezna.', 400);
    if (!currency) return apiError('Valuta je obavezna.', 400);
    if (!(amount > 0)) return apiError('Iznos mora biti veći od nule.', 400);

    const appUser = sessionResult.session.app_user || {};
    const openShift = await findOpenShift(env, cashboxId, appUser.email || '');
    if (!openShift) return apiError('Predaja u trezor zahteva otvorenu smenu trenutnog korisnika.', 409);
    const previousBalance = await getBalance(env, cashboxId, currency);
    if (previousBalance < amount) return apiError('Nedovoljno sredstava u blagajni.', 409);

    const now = new Date().toISOString();
    const cashEvent = {
      event_id: makeId('CEV'),
      created_at: now,
      created_by: appUser.email || appUser.user_code || '',
      event_date: data.event_date || now,
      event_type: 'TREASURY_HANDOVER',
      cashbox_id: cashboxId,
      currency,
      direction: 'OUT',
      amount,
      linked_request_id: null,
      linked_order_id: null,
      partner_name: 'Trezor',
      description: 'Predaja u trezor' + (data.description ? '. ' + String(data.description).trim() : ''),
      document_status: 'NONE',
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
    return apiError('Predaja u trezor nije uspela.', error.status || 500);
  }
}
