import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

function canAccessCashbox(user, cashboxId) {
  if (!user || !cashboxId) return false;
  if (user.role === 'CASHIER' && user.default_cashbox_id) {
    return String(user.default_cashbox_id) === String(cashboxId);
  }
  return true;
}

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'cash_events:view');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const appUser = sessionResult.session.app_user || {};
    const cashboxFilter = String(url.searchParams.get('cashbox_id') || '').trim();
    const currencyFilter = String(url.searchParams.get('currency') || '').trim();
    const cashboxes = await supabaseRest(env, '/cashboxes?select=cashbox_id,name,active&active=eq.true&order=name.asc');
    const currencies = await supabaseRest(env, '/currencies?select=currency_code&active=eq.true&order=currency_code.asc');
    const balances = await supabaseRest(env, '/cashbox_balances?select=cashbox_id,currency,balance');
    const balanceIndex = {};
    (balances || []).forEach((row) => {
      balanceIndex[row.cashbox_id + '|' + row.currency] = Number(row.balance || 0);
    });

    const rows = [];
    (cashboxes || []).forEach((cashbox) => {
      if (cashboxFilter && cashbox.cashbox_id !== cashboxFilter) return;
      if (!canAccessCashbox(appUser, cashbox.cashbox_id)) return;
      (currencies || []).forEach((currency) => {
        const code = currency.currency_code;
        if (currencyFilter && code !== currencyFilter) return;
        rows.push({
          cashbox_id: cashbox.cashbox_id,
          cashbox_name: cashbox.name || cashbox.cashbox_id,
          currency: code,
          balance: Number(balanceIndex[cashbox.cashbox_id + '|' + code] || 0)
        });
      });
    });

    return apiOk({
      rows,
      count: rows.length
    });
  } catch (error) {
    return apiError('Izveštaj stanja blagajne nije uspeo.', error.status || 500);
  }
}
