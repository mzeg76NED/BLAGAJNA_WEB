import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { listMyPaymentRequestsCore } from '../../_lib/paymentRequests.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const sessionResult = await verifySession(env, getSessionId(context.request), []);
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);
    const requests = await listMyPaymentRequestsCore(env, sessionResult.session.app_user);
    return apiOk({ requests });
  } catch (error) {
    return apiError(error.message || 'Pregled mojih zahteva nije uspeo.', error.status || 500);
  }
}
