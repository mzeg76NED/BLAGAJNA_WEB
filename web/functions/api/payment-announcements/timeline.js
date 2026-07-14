import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession, userHasAnyPrivilege } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { findAnnouncement, getAnnouncementTimelineCore } from '../../_lib/paymentAnnouncements.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    // Ista privilegija-logika kao list.js: :view/:match moze da vidi istoriju bilo koje
    // najave, ownOnly (npr. ANNOUNCER) samo za sopstvenu - inace bi mogao da vidi tudje
    // detalje/istoriju direktno preko announcement_id, iako list.js to vec sakriva sa liste.
    const sessionResult = await verifySession(env, getSessionId(context.request), [
      'payment_announcements:view', 'payment_announcements:match', 'payment_announcements:create'
    ]);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const announcementId = String(url.searchParams.get('announcement_id') || '').trim();
    if (!announcementId) return apiError('announcement_id je obavezan.', 400);

    const appUser = sessionResult.session.app_user || {};
    const ownOnly = !userHasAnyPrivilege(appUser, ['payment_announcements:view', 'payment_announcements:match']);
    if (ownOnly) {
      const announcement = await findAnnouncement(env, announcementId);
      if (!announcement) return apiError('Najava nije pronađena: ' + announcementId, 404);
      const email = appUser.email || appUser.user_code || '';
      if (announcement.created_by !== email) {
        return apiError('Možete videti istoriju samo sopstvenih najava.', 403);
      }
    }

    const events = await getAnnouncementTimelineCore(env, announcementId);
    return apiOk({ events });
  } catch (error) {
    return apiError(error.message || 'Pregled istorije najave nije uspeo.', error.status || 500);
  }
}
