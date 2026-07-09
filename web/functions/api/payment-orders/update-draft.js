import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { updateDraftPaymentOrderCore } from '../../_lib/paymentOrders.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'payment_orders:create');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const orderId = String(body.order_id || body.orderId || '').trim();
    if (!orderId) return apiError('order_id je obavezan.', 400);
    const data = body.data && typeof body.data === 'object' ? body.data : {};

    const updated = await updateDraftPaymentOrderCore(env, orderId, data, sessionResult.session.app_user, sessionResult.session);
    return apiOk(updated);
  } catch (error) {
    return apiError(error.message || 'Izmena naloga nije uspela.', error.status || 500);
  }
}
