import { apiError, apiOk, getSessionId } from '../../../_lib/api.js';
import { verifySession } from '../../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../../_lib/supabase.js';

function sanitizeShift(shift) {
  return {
    shift_id: shift.shift_id || '',
    cashbox_id: shift.cashbox_id || '',
    opened_by: shift.opened_by || '',
    opened_at: shift.opened_at || '',
    opening_note: shift.opening_note || '',
    status: shift.status || ''
  };
}

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const sessionResult = await verifySession(env, getSessionId(context.request), []);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const appUser = sessionResult.session.app_user || {};
    if (!appUser.email) {
      return apiOk({
        shifts: [],
        count: 0
      });
    }

    const rows = await supabaseRest(
      env,
      '/shifts?select=shift_id,cashbox_id,opened_by,opened_at,opening_note,status&status=eq.OPEN&opened_by=' +
        encodeEq(appUser.email) +
        '&order=opened_at.desc'
    );
    const shifts = (rows || []).map(sanitizeShift);

    return apiOk({
      shifts,
      count: shifts.length
    });
  } catch (error) {
    return apiError('Pregled aktivnih smena nije uspeo.', error.status || 500);
  }
}
