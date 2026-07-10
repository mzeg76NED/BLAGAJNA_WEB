import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { getCashCountsReportCore } from '../../_lib/cashCounts.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'shifts:count');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const filters = {
      cashbox_id: url.searchParams.get('cashbox_id') || '',
      currency: url.searchParams.get('currency') || '',
      shift_id: url.searchParams.get('shift_id') || '',
      date_from: url.searchParams.get('date_from') || '',
      date_to: url.searchParams.get('date_to') || ''
    };
    const rows = await getCashCountsReportCore(env, filters);
    return apiOk({ rows, count: rows.length });
  } catch (error) {
    return apiError(error.message || 'Pregled preseka stanja nije uspeo.', error.status || 500);
  }
}
