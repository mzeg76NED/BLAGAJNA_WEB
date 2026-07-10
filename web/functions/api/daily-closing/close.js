import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { closeDailyCashboxCore } from '../../_lib/dailyClosing.js';

// Creates the daily closing record and locks included POSTED cash events. Ported from
// DailyClosing.gs closeDailyCashbox. Role check (CASHIER_SUPERVISOR/FINANCE/DIRECTOR/ADMIN,
// explicitly excluding plain CASHIER) happens inside closeDailyCashboxCore, matching legacy
// DAILY_CLOSING_CLOSE_ROLES_ - this is intentionally stricter than the 'shifts:close'
// privilege (which CASHIER also holds for closing their own shift).
export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const appUser = sessionResult.session.app_user || {};
    const result = await closeDailyCashboxCore(env, appUser, sessionResult.session, {
      cashbox_id: body.cashbox_id || body.cashboxId || '',
      currency: body.currency || '',
      closing_date: body.closing_date || body.closingDate || '',
      physical_balance: body.physical_balance !== undefined ? body.physical_balance : body.physicalBalance,
      note: body.note || ''
    });
    return apiOk(result);
  } catch (error) {
    return apiError(error.message || 'Zaključavanje dana nije uspelo.', error.status || 500);
  }
}
