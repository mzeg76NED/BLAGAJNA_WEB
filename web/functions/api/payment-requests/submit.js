import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { submitPaymentRequestCore } from '../../_lib/paymentRequests.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'payment_requests:create');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const requestId = String(body.request_id || body.requestId || '').trim();
    if (!requestId) return apiError('request_id je obavezan.', 400);

    const updated = await submitPaymentRequestCore(env, requestId, sessionResult.session.app_user, sessionResult.session);
    return apiOk(updated);
  } catch (error) {
    return apiError(error.message || 'Slanje zahteva nije uspelo.', error.status || 500);
  }
}
