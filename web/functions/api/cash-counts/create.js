import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { createCashCountsCore } from '../../_lib/cashCounts.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'shifts:count');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const results = await createCashCountsCore(env, body, sessionResult.session.app_user || {}, sessionResult.session);
    return apiOk(results);
  } catch (error) {
    return apiError(error.message || 'Presek stanja nije sačuvan.', error.status || 500);
  }
}
