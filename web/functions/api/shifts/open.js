import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

function sanitizeShift(shift) {
  return {
    shift_id: shift.shift_id || '',
    cashbox_id: shift.cashbox_id || '',
    opened_by: shift.opened_by || '',
    opened_at: shift.opened_at || '',
    opening_note: shift.opening_note || '',
    opening_balance_json: shift.opening_balance_json || {},
    status: shift.status || ''
  };
}

function userCanUseCashbox(user, cashboxId) {
  if (!user || !cashboxId) return false;
  if (user.role === 'CASHIER' && user.default_cashbox_id) {
    return String(user.default_cashbox_id) === String(cashboxId);
  }
  return true;
}

async function findActiveCashbox(env, cashboxId) {
  const rows = await supabaseRest(
    env,
    '/cashboxes?select=cashbox_id,name,active&cashbox_id=' + encodeEq(cashboxId) + '&active=eq.true&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function findOpenShift(env, cashboxId) {
  const rows = await supabaseRest(
    env,
    '/shifts?select=shift_id,cashbox_id,status&cashbox_id=' + encodeEq(cashboxId) + '&status=eq.OPEN&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function buildOpeningBalance(env, cashboxId) {
  const currencies = await supabaseRest(env, '/currencies?select=currency_code&active=eq.true&order=currency_code.asc');
  const balances = await supabaseRest(
    env,
    '/cashbox_balances?select=currency,balance&cashbox_id=' + encodeEq(cashboxId)
  );
  const balanceByCurrency = {};
  (currencies || []).forEach((currency) => {
    balanceByCurrency[currency.currency_code] = 0;
  });
  (balances || []).forEach((row) => {
    balanceByCurrency[row.currency] = Number(row.balance || 0);
  });
  return balanceByCurrency;
}

async function insertAuditLog(env, shift, user, session) {
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
      cashbox_id: shift.cashbox_id || '',
      shift_id: shift.shift_id || '',
      action: 'CREATE',
      entity_type: 'SHIFTS',
      entity_id: shift.shift_id || '',
      old_value: null,
      new_value: shift,
      comment: 'Shift opened. Shift does not affect cashbox balance.'
    })
  });
}

async function attachShiftToSession(env, sessionId, shiftId) {
  await supabaseRest(env, '/app_sessions?session_id=' + encodeEq(sessionId), {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      shift_id: shiftId,
      last_seen_at: new Date().toISOString()
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
    const sessionResult = await verifySession(env, sessionId, 'shifts:open');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const session = sessionResult.session || {};
    const appUser = session.app_user || {};
    const cashboxId = String(body.cashbox_id || session.cashbox_id || appUser.default_cashbox_id || '').trim();
    if (!cashboxId) {
      return apiError('Blagajna je obavezna.', 400);
    }
    if (!userCanUseCashbox(appUser, cashboxId)) {
      return apiError('Nemate pristup izabranoj blagajni.', 403);
    }

    const cashbox = await findActiveCashbox(env, cashboxId);
    if (!cashbox) {
      return apiError('Blagajna nije aktivna ili ne postoji.', 400);
    }

    const existingShift = await findOpenShift(env, cashboxId);
    if (existingShift) {
      return apiError('Blagajna već ima otvorenu smenu: ' + existingShift.shift_id, 409);
    }

    const now = new Date().toISOString();
    const openingBalance = await buildOpeningBalance(env, cashboxId);
    const shift = {
      shift_id: makeId('SHF'),
      cashbox_id: cashboxId,
      opened_by: appUser.email || appUser.user_code || appUser.user_id || '',
      opened_at: now,
      opening_note: String(body.opening_note || body.openingNote || '').trim(),
      opening_balance_json: openingBalance,
      closed_by: null,
      closed_at: null,
      handover_to: null,
      handover_at: null,
      closing_balance_json: null,
      physical_balance_json: null,
      difference_json: null,
      status: 'OPEN',
      note: null,
      updated_at: null
    };

    const rows = await supabaseRest(env, '/shifts', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(shift)
    });
    const created = rows && rows.length ? rows[0] : shift;
    await insertAuditLog(env, created, appUser, session);
    await attachShiftToSession(env, sessionId, created.shift_id);

    return apiOk({
      shift: sanitizeShift(created)
    });
  } catch (error) {
    if (error.status === 409 || String(error.message || '').includes('duplicate key')) {
      return apiError('Blagajna već ima otvorenu smenu.', 409);
    }
    return apiError('Otvaranje smene nije uspelo.', error.status || 500);
  }
}
