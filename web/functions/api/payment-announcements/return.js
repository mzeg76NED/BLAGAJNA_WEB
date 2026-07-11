import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { returnAnnouncementForRevisionCore } from '../../_lib/paymentAnnouncements.js';

// FAZA 3w: blagajnik/supervizor vraca OPEN najavu autoru na doradu (umesto da je
// upari) - OPEN -> RETURNED, ponovo editabilna za autora dok se ne posalje ponovo.
export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'payment_announcements:match');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const announcementId = String(body.announcement_id || '').trim();
    if (!announcementId) return apiError('Nedostaje ID najave.', 400);

    const appUser = sessionResult.session.app_user || {};
    const updated = await returnAnnouncementForRevisionCore(env, announcementId, body.reason || '', appUser, sessionResult.session);
    return apiOk(updated);
  } catch (error) {
    return apiError(error.message || 'Vraćanje najave na doradu nije uspelo.', error.status || 500);
  }
}
