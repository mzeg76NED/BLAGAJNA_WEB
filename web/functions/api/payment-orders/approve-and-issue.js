import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { approvePaymentRequestCore } from '../../_lib/paymentRequests.js';
import { findOrderById } from '../../_lib/paymentOrders.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'payment_requests:approve');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const requestId = String(body.request_id || body.requestId || '').trim();
    if (!requestId) return apiError('request_id je obavezan.', 400);
    const orderData = body.order_data && typeof body.order_data === 'object' ? body.order_data : {};

    const approved = await approvePaymentRequestCore(env, requestId, orderData, sessionResult.session.app_user, sessionResult.session);
    const order = approved.linked_order_id ? await findOrderById(env, approved.linked_order_id) : approved;
    return apiOk(order);
  } catch (error) {
    return apiError(error.message || 'Odobravanje i izdavanje naloga nije uspelo.', error.status || 500);
  }
}
