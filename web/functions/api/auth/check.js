import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { verifySession } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const required = body.required_permissions || body.requiredPrivileges || body.required_permission || [];
    const result = await verifySession(env, getSessionId(context.request, body), required);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return apiOk({
      allowed: true,
      session: result.session
    });
  } catch (error) {
    return apiError('Provera korisnika/sesije nije uspela.', error.status || 500);
  }
}
