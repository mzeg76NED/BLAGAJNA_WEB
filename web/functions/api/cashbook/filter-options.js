import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), []);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const appUser = sessionResult.session.app_user || {};
    const cashboxId = String(
      url.searchParams.get('cashbox_id') || sessionResult.session.cashbox_id || appUser.default_cashbox_id || ''
    ).trim();

    const userRows = await supabaseRest(env, '/users?select=email,full_name,role&active=eq.true&order=email.asc');
    const users = (userRows || [])
      .map((user) => ({
        email: user.email || '',
        full_name: user.full_name || '',
        role: user.role || ''
      }))
      .filter((user) => user.email);

    let shiftsPath = '/shifts?select=shift_id,opened_by,opened_at,closed_at,status&order=opened_at.desc&limit=200';
    if (cashboxId) {
      shiftsPath += '&cashbox_id=' + encodeEq(cashboxId);
    }
    const shiftRows = await supabaseRest(env, shiftsPath);
    const shifts = (shiftRows || []).map((shift) => ({
      shift_id: shift.shift_id,
      opened_by: shift.opened_by || '',
      opened_at: shift.opened_at || '',
      closed_at: shift.closed_at || '',
      status: shift.status || ''
    }));

    return apiOk({ users, shifts });
  } catch (error) {
    return apiError('Učitavanje filtera Knjige nije uspelo.', error.status || 500);
  }
}
