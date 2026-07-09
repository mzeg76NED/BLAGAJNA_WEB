import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { listPaymentRequestsCore } from '../../_lib/paymentRequests.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), ['payment_requests:view_own', 'payment_requests:view_all']);
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const filters = {};
    ['status', 'currency', 'preferred_cashbox_id', 'cashbox_id', 'approval_path', 'linked_order_id'].forEach((field) => {
      const value = url.searchParams.get(field);
      if (value) filters[field] = value;
    });

    const requests = await listPaymentRequestsCore(env, filters, sessionResult.session.app_user);
    return apiOk({ requests });
  } catch (error) {
    return apiError(error.message || 'Pregled zahteva nije uspeo.', error.status || 500);
  }
}
