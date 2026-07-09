import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { logoutAppUser } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const result = await logoutAppUser(env, getSessionId(context.request, body));
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return apiOk(result.session);
  } catch (error) {
    return apiError('Odjava nije uspela.', error.status || 500);
  }
}
