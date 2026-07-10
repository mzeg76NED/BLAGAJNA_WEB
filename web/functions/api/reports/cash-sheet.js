import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { getCashSheetReportCore } from '../../_lib/cashSheet.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'shifts:view');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const filters = {
      cashbox_id: url.searchParams.get('cashbox_id') || '',
      currency: url.searchParams.get('currency') || '',
      date: url.searchParams.get('date') || '',
      date_from: url.searchParams.get('date_from') || '',
      date_to: url.searchParams.get('date_to') || '',
      shift_id: url.searchParams.get('shift_id') || ''
    };
    const sheet = await getCashSheetReportCore(env, sessionResult.session.app_user || {}, filters);
    return apiOk(sheet);
  } catch (error) {
    return apiError(error.message || 'Blagajnički list nije uspeo.', error.status || 500);
  }
}
