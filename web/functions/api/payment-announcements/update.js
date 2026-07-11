import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession, userHasPrivilege } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { updateAnnouncementCore } from '../../_lib/paymentAnnouncements.js';

// FAZA 3w: izmena najave dozvoljena samo dok je DRAFT ili RETURNED (vidi
// updateAnnouncementCore) - autoru sopstvene najave, ili nekome sa :match
// privilegijom (blagajnik/supervizor koji ispravlja umesto autora).
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
    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const updated = await updateAnnouncementCore(env, announcementId, data, appUser, sessionResult.session, canOverride);
    return apiOk(updated);
  } catch (error) {
    return apiError(error.message || 'Izmena najave nije uspela.', error.status || 500);
  }
}
