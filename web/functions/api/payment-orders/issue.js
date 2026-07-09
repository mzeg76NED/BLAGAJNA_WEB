import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { issuePaymentOrderCore } from '../../_lib/paymentOrders.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'payment_orders:issue');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const orderId = String(body.order_id || body.orderId || '').trim();
    if (!orderId) return apiError('order_id je obavezan.', 400);

    const updated = await issuePaymentOrderCore(env, orderId, sessionResult.session.app_user, sessionResult.session);
    return apiOk(updated);
  } catch (error) {
    return apiError(error.message || 'Odobravanje naloga nije uspelo.', error.status || 500);
  }
}
