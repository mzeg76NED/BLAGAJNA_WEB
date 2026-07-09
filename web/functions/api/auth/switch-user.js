import { apiError, apiOk, readJsonBody } from '../../_lib/api.js';
import { switchAppUser } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const result = await switchAppUser(env, {
      ...body,
      google_session_email: body.google_session_email || context.request.headers.get('x-google-session-email') || ''
    });
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return apiOk(result.session);
  } catch (error) {
    return apiError('Promena korisnika nije uspela.', error.status || 500);
  }
}
