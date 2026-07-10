import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { createAnnouncementCore } from '../../_lib/paymentAnnouncements.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'payment_announcements:create');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const appUser = sessionResult.session.app_user || {};
    const created = await createAnnouncementCore(env, data, appUser, sessionResult.session);
    return apiOk(created);
  } catch (error) {
    return apiError(error.message || 'Kreiranje najave nije uspelo.', error.status || 500);
  }
}
