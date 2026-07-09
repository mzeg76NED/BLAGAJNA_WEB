import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { verifySession } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiOk({
      active: false,
      backendMode: env.BACKEND_MODE || 'legacy',
      reason: 'Supabase environment is not configured.'
    });
  }

  try {
    const result = await verifySession(env, getSessionId(context.request), []);
    if (!result.ok) {
      return apiOk({
        active: false,
        error: result.error
      });
    }
    return apiOk(result.session);
  } catch (error) {
    return apiError('Provera sesije nije uspela.', error.status || 500);
  }
}
