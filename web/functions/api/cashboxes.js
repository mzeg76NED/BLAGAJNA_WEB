import { apiError, apiOk, getSessionId } from '../_lib/api.js';
import { verifySession } from '../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../_lib/supabase.js';
import { listOpenMandatoryCountsByCashbox } from '../_lib/mandatoryCount.js';

function canAccessCashbox(user, cashbox) {
  if (!user || !cashbox) return false;
  if (user.role === 'CASHIER' && user.default_cashbox_id) {
    return String(cashbox.cashbox_id) === String(user.default_cashbox_id);
  }
  return true;
}

// FAZA 3t: mandatory_count je null dok blagajna radi normalno, ili { order_id, note,
// requested_by, requested_at } dok je zakljucana obaveznim preseka stanja (vidi
// _lib/mandatoryCount.js) - frontend ovo koristi da prikaze banner i onemoguci
// Uplata/Isplata/Trezor/Nalog dugmad za tu blagajnu.
function sanitizeCashbox(cashbox, mandatoryByCashbox) {
  const openOrder = mandatoryByCashbox[cashbox.cashbox_id] || null;
  return {
    cashbox_id: cashbox.cashbox_id || '',
    name: cashbox.name || cashbox.cashbox_id || '',
    location: cashbox.location || '',
    active: cashbox.active === true,
    mandatory_count: openOrder ? {
      order_id: openOrder.order_id,
      note: openOrder.note || '',
      requested_by: openOrder.requested_by || '',
      requested_at: openOrder.requested_at || ''
    } : null
  };
}

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const sessionResult = await verifySession(env, getSessionId(context.request), []);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const rows = await supabaseRest(
      env,
      '/cashboxes?select=cashbox_id,name,location,active&active=eq.true&order=name.asc'
    );
    const mandatoryByCashbox = await listOpenMandatoryCountsByCashbox(env);
    const appUser = sessionResult.session.app_user || {};
    const cashboxes = (rows || [])
      .filter((cashbox) => canAccessCashbox(appUser, cashbox))
      .map((cashbox) => sanitizeCashbox(cashbox, mandatoryByCashbox));

    return apiOk({
      cashboxes,
      count: cashboxes.length
    });
  } catch (error) {
    return apiError('Pregled blagajni nije uspeo.', error.status || 500);
  }
}
