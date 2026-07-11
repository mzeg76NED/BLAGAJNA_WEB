import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession, userHasPrivilege } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { sendAnnouncementToCashierCore } from '../../_lib/paymentAnnouncements.js';

// FAZA 3w: "Pošalji u blagajnu" - DRAFT/RETURNED -> OPEN. Tek posle ovoga najava
// postoji za blagajnika (vidljiva u Knjizi/Najave ekranu, moze se upariti).
export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, ['payment_announcements:create', 'payment_announcements:match']);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const announcementId = String(body.announcement_id || '').trim();
    if (!announcementId) return apiError('Nedostaje ID najave.', 400);

    const appUser = sessionResult.session.app_user || {};
    const canOverride = userHasPrivilege(appUser, 'payment_announcements:match');
    const updated = await sendAnnouncementToCashierCore(env, announcementId, appUser, sessionResult.session, canOverride);
    return apiOk(updated);
  } catch (error) {
    return apiError(error.message || 'Slanje najave u blagajnu nije uspelo.', error.status || 500);
  }
}
