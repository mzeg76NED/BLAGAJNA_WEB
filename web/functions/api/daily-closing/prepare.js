import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { prepareDailyClosingCore } from '../../_lib/dailyClosing.js';

// Read-only preview of a daily closing (opening balance, totals, calculated balance).
// Does not write anything. Ported from DailyClosing.gs prepareDailyClosing.
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
    const preview = await prepareDailyClosingCore(env, appUser, {
      cashbox_id: body.cashbox_id || body.cashboxId || '',
      currency: body.currency || '',
      closing_date: body.closing_date || body.closingDate || ''
    });
    return apiOk(preview);
  } catch (error) {
    return apiError(error.message || 'Pregled dnevnog zaključka nije uspeo.', error.status || 500);
  }
}
