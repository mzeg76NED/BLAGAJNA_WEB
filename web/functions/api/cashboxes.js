import { apiError, apiOk, getSessionId } from '../_lib/api.js';
import { verifySession } from '../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../_lib/supabase.js';

function canAccessCashbox(user, cashbox) {
  if (!user || !cashbox) return false;
  if (user.role === 'CASHIER' && user.default_cashbox_id) {
    return String(cashbox.cashbox_id) === String(user.default_cashbox_id);
  }
  return true;
}

function sanitizeCashbox(cashbox) {
  return {
    cashbox_id: cashbox.cashbox_id || '',
    name: cashbox.name || cashbox.cashbox_id || '',
    location: cashbox.location || '',
    active: cashbox.active === true
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
    const appUser = sessionResult.session.app_user || {};
    const cashboxes = (rows || [])
      .filter((cashbox) => canAccessCashbox(appUser, cashbox))
      .map(sanitizeCashbox);

    return apiOk({
      cashboxes,
      count: cashboxes.length
    });
  } catch (error) {
    return apiError('Pregled blagajni nije uspeo.', error.status || 500);
  }
}
