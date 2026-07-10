import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { cancelAnnouncementCore } from '../../_lib/paymentAnnouncements.js';

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    // Otkazivanje najave dozvoljeno i onima koji je smeju kreirati (npr. ANNOUNCER da
    // ispravi sopstvenu gresku) i onima koji je smeju uparivati (nadzor).
    const sessionResult = await verifySession(env, sessionId, ['payment_announcements:create', 'payment_announcements:match']);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const announcementId = String(body.announcement_id || '').trim();
    if (!announcementId) return apiError('Nedostaje ID najave.', 400);

    const appUser = sessionResult.session.app_user || {};
    const updated = await cancelAnnouncementCore(env, announcementId, body.reason || '', appUser, sessionResult.session);
    return apiOk(updated);
  } catch (error) {
    return apiError(error.message || 'Otkazivanje najave nije uspelo.', error.status || 500);
  }
}
