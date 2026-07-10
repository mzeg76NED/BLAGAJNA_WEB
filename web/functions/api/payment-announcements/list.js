import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { listAnnouncementsCore } from '../../_lib/paymentAnnouncements.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    // Namerno BEZ 'payment_announcements:create' ovde - ANNOUNCER rola sme da kreira
    // najavu ali ne i da pregleda tudje (spec: "moze SAMO da uradi najavu uplate").
    const sessionResult = await verifySession(env, getSessionId(context.request), ['payment_announcements:view', 'payment_announcements:match']);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const appUser = sessionResult.session.app_user || {};
    const announcements = await listAnnouncementsCore(env, appUser, {
      cashbox_id: url.searchParams.get('cashbox_id') || sessionResult.session.cashbox_id || '',
      currency: url.searchParams.get('currency') || '',
      status: url.searchParams.get('status') || ''
    });
    return apiOk({ announcements });
  } catch (error) {
    return apiError(error.message || 'Pregled najava nije uspeo.', error.status || 500);
  }
}
