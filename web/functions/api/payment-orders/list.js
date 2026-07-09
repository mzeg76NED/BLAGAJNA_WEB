import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { listPaymentOrdersCore } from '../../_lib/paymentOrders.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'payment_orders:view');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const filters = {};
    ['status', 'cashbox_id', 'currency', 'order_type', 'source_request_id'].forEach((field) => {
      const value = url.searchParams.get(field);
      if (value) filters[field] = value;
    });

    const orders = await listPaymentOrdersCore(env, filters);
    return apiOk({ orders });
  } catch (error) {
    return apiError(error.message || 'Pregled naloga nije uspeo.', error.status || 500);
  }
}
