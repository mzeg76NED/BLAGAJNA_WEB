import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { getPaymentOrderTimelineCore } from '../../_lib/paymentOrders.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'payment_orders:view');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const orderId = String(url.searchParams.get('order_id') || '').trim();
    if (!orderId) return apiError('order_id je obavezan.', 400);

    const events = await getPaymentOrderTimelineCore(env, orderId);
    return apiOk({ events });
  } catch (error) {
    return apiError(error.message || 'Pregled istorije naloga nije uspeo.', error.status || 500);
  }
}
