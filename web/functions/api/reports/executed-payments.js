import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { getExecutedPaymentsReportCore } from '../../_lib/reports.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'cash_events:view');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const filters = {
      cashbox_id: url.searchParams.get('cashbox_id') || '',
      currency: url.searchParams.get('currency') || '',
      date_from: url.searchParams.get('date_from') || '',
      date_to: url.searchParams.get('date_to') || '',
      pay_to_name: url.searchParams.get('pay_to_name') || url.searchParams.get('partner_name') || ''
    };
    const rows = await getExecutedPaymentsReportCore(env, sessionResult.session.app_user || {}, filters);
    return apiOk({ rows, count: rows.length });
  } catch (error) {
    return apiError(error.message || 'Izveštaj izvršenih isplata nije uspeo.', error.status || 500);
  }
}
