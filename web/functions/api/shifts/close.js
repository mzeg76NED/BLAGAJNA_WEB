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
    closed_by: shift.closed_by || '',
    closed_at: shift.closed_at || '',
    closing_balance_json: shift.closing_balance_json || {},
    physical_balance_json: shift.physical_balance_json || {},
    difference_json: shift.difference_json || {},
    status: shift.status || '',
    note: shift.note || ''
  };
}

function appendNote(existingNote, note) {
  const cleanNote = String(note || '').trim();
  if (!cleanNote) return existingNote || '';
  if (!existingNote) return cleanNote;
  return existingNote + '\n' + cleanNote;
}

function canCloseShift(shift, user) {
  if (!shift || !user) return false;
  if (['ADMIN', 'FINANCE', 'CASHIER_SUPERVISOR'].includes(user.role)) return true;
  return String(shift.opened_by || '').toLowerCase() === String(user.email || '').toLowerCase();
}

function normalizePhysicalBalance(calculatedBalance, physicalBalance) {
  const source = physicalBalance || {};
  return Object.keys(calculatedBalance || {}).reduce((result, currency) => {
    if (!Object.prototype.hasOwnProperty.call(source, currency)) {
      throw new Error('Physical balance is missing currency: ' + currency);
    }
    const amount = Number(source[currency]);
    if (!Number.isFinite(amount)) {
      throw new Error('Physical balance must be numeric for currency: ' + currency);
    }
    result[currency] = amount;
    return result;
  }, {});
}

function calculateDifference(calculatedBalance, physicalBalance) {
  return Object.keys(calculatedBalance || {}).reduce((result, currency) => {
    result[currency] = Number(physicalBalance[currency] || 0) - Number(calculatedBalance[currency] || 0);
    return result;
  }, {});
}

function hasAnyDifference(differenceByCurrency) {
  return Object.keys(differenceByCurrency || {}).some((currency) => (
    Math.abs(Number(differenceByCurrency[currency] || 0)) > 0.000001
  ));
}

async function findOpenShift(env, shiftId) {
  const rows = await supabaseRest(
    env,
    '/shifts?select=*&shift_id=' + encodeEq(shiftId) + '&status=eq.OPEN&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function buildClosingBalance(env, cashboxId) {
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

async function insertAuditLog(env, shift, oldShift, user, session, hasDifference) {
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
      action: hasDifference ? 'UPDATE' : 'LOCK',
      entity_type: 'SHIFTS',
      entity_id: shift.shift_id || '',
      old_value: oldShift,
      new_value: shift,
      comment: hasDifference ? 'Shift closed with difference.' : 'Shift closed without difference.'
    })
  });
}

async function clearShiftFromSessions(env, shiftId) {
  await supabaseRest(env, '/app_sessions?shift_id=' + encodeEq(shiftId), {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      shift_id: null,
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
    const sessionResult = await verifySession(env, sessionId, 'shifts:close');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const session = sessionResult.session || {};
    const appUser = session.app_user || {};
    const shiftId = String(body.shift_id || body.shiftId || session.shift_id || '').trim();
    if (!shiftId) {
      return apiError('Smena je obavezna.', 400);
    }

    const shift = await findOpenShift(env, shiftId);
    if (!shift) {
      return apiError('Otvorena smena nije pronađena.', 404);
    }
    if (!canCloseShift(shift, appUser)) {
      return apiError('Nemate ovlašćenje za zatvaranje ove smene.', 403);
    }

    const physicalInput = body.physical_balance_json || body.physicalBalanceByCurrency || body.physical_balance;
    if (!physicalInput || typeof physicalInput !== 'object') {
      return apiError('Fizičko stanje po valutama je obavezno.', 400);
    }

    const now = new Date().toISOString();
    const calculatedBalance = await buildClosingBalance(env, shift.cashbox_id);
    const physicalBalance = normalizePhysicalBalance(calculatedBalance, physicalInput);
    const difference = calculateDifference(calculatedBalance, physicalBalance);
    const hasDifference = hasAnyDifference(difference);
    const updates = {
      closed_by: appUser.email || appUser.user_code || appUser.user_id || '',
      closed_at: now,
      closing_balance_json: calculatedBalance,
      physical_balance_json: physicalBalance,
      difference_json: difference,
      status: hasDifference ? 'CLOSED_WITH_DIFFERENCE' : 'CLOSED',
      note: appendNote(shift.note, body.note),
      updated_at: now
    };

    const rows = await supabaseRest(env, '/shifts?shift_id=' + encodeEq(shiftId), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(updates)
    });
    const closed = rows && rows.length ? rows[0] : { ...shift, ...updates };
    await insertAuditLog(env, closed, shift, appUser, session, hasDifference);
    await clearShiftFromSessions(env, shiftId);

    return apiOk({
      shift: sanitizeShift(closed)
    });
  } catch (error) {
    if (String(error.message || '').includes('Physical balance is missing currency')) {
      return apiError('Fizičko stanje mora sadržati sve aktivne valute.', 400);
    }
    if (String(error.message || '').includes('Physical balance must be numeric')) {
      return apiError('Fizičko stanje mora biti numeričko po valutama.', 400);
    }
    return apiError('Zatvaranje smene nije uspelo.', error.status || 500);
  }
}
