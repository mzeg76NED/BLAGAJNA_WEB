import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { listRequestsForApprovalCore } from '../../_lib/paymentRequests.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const sessionResult = await verifySession(env, getSessionId(context.request), 'payment_requests:approve');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);
    const requests = await listRequestsForApprovalCore(env);
    return apiOk({ requests });
  } catch (error) {
    return apiError(error.message || 'Pregled zahteva za odobrenje nije uspeo.', error.status || 500);
  }
}
