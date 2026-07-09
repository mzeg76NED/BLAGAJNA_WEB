import { apiError, apiOk, getSessionId } from '../_lib/api.js';
import { verifySession } from '../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../_lib/supabase.js';

function canAccessCashbox(user, cashboxId) {
  if (!user || !cashboxId) return false;
  if (user.role === 'CASHIER' && user.default_cashbox_id) {
    return String(user.default_cashbox_id) === String(cashboxId);
  }
  return true;
}

async function listActiveCurrencies(env) {
  const rows = await supabaseRest(env, '/currencies?select=currency_code&active=eq.true&order=currency_code.asc');
  return (rows || []).map((row) => row.currency_code).filter(Boolean);
}

async function listBalances(env, cashboxId) {
  const rows = await supabaseRest(
    env,
    '/cashbox_balances?select=cashbox_id,currency,balance&cashbox_id=' + encodeEq(cashboxId)
  );
  return rows || [];
}

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), []);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const appUser = sessionResult.session.app_user || {};
    const cashboxId = String(url.searchParams.get('cashbox_id') || sessionResult.session.cashbox_id || appUser.default_cashbox_id || '').trim();
    const requestedCurrency = String(url.searchParams.get('currency') || '').trim();
    if (!cashboxId) {
      return apiError('Blagajna je obavezna.', 400);
    }
    if (!canAccessCashbox(appUser, cashboxId)) {
      return apiError('Nemate pristup izabranoj blagajni.', 403);
    }

    const currencies = await listActiveCurrencies(env);
    const balances = await listBalances(env, cashboxId);
    const balanceByCurrency = {};
    currencies.forEach((currency) => {
      balanceByCurrency[currency] = 0;
    });
    balances.forEach((row) => {
      balanceByCurrency[row.currency] = Number(row.balance || 0);
    });

    const currency = requestedCurrency || currencies[0] || 'RSD';
    return apiOk({
      cashbox_id: cashboxId,
      currency,
      balance: Number(balanceByCurrency[currency] || 0),
      balanceByCurrency,
      rows: Object.keys(balanceByCurrency).map((code) => ({
        cashbox_id: cashboxId,
        currency: code,
        balance: Number(balanceByCurrency[code] || 0)
      }))
    });
  } catch (error) {
    return apiError('Pregled stanja blagajne nije uspeo.', error.status || 500);
  }
}
