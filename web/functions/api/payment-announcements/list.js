import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession, userHasAnyPrivilege } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { listAnnouncementsCore } from '../../_lib/paymentAnnouncements.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    // ANNOUNCER only has payment_announcements:create - they may not browse everyone
    // else's najave (spec: "moze SAMO da uradi najavu uplate"), but they still need to
    // be able to see the ones THEY created (otherwise creating one just throws it into
    // a void with no confirmation and no way to check its status). So :create is allowed
    // in here too, but scoped to created_by = self below when that's the only privilege
    // the caller has.
    const sessionResult = await verifySession(env, getSessionId(context.request), [
      'payment_announcements:view', 'payment_announcements:match', 'payment_announcements:create'
    ]);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const appUser = sessionResult.session.app_user || {};
    const ownOnly = !userHasAnyPrivilege(appUser, ['payment_announcements:view', 'payment_announcements:match']);
    // FAZA 3w: :view/:match korisnici mogu dodatno filtrirati po perioda i po
    // konkretnom kreatoru ("u najavu dodati filter po periodu i korisniku") - ownOnly
    // (ANNOUNCER) i dalje ne moze da bira tudji created_by, uvek vidi samo svoje.
    const created_by = ownOnly
      ? (appUser.email || appUser.user_code || '')
      : (url.searchParams.get('created_by') || url.searchParams.get('user') || '');
    const announcements = await listAnnouncementsCore(env, appUser, {
      cashbox_id: url.searchParams.get('cashbox_id') || sessionResult.session.cashbox_id || '',
      currency: url.searchParams.get('currency') || '',
      status: url.searchParams.get('status') || '',
      created_by,
      date_from: url.searchParams.get('date_from') || '',
      date_to: url.searchParams.get('date_to') || ''
    });
    return apiOk({ announcements });
  } catch (error) {
    return apiError(error.message || 'Pregled najava nije uspeo.', error.status || 500);
  }
}
