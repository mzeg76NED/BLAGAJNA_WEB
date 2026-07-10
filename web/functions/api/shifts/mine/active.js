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

    const session = sessionResult.session || {};
    const appUser = session.app_user || {};

    // A shift belongs to a CASHBOX, not to whoever happened to open it (only one OPEN
    // shift per cashbox is allowed - see shifts_one_open_per_cashbox_idx). Different
    // users logging into the same cashbox must see and work within the SAME open
    // shift. Previously this endpoint filtered by opened_by=<current user>, which
    // meant a second cashier logging in on an already-open cashbox saw "no active
    // shift" and could not post transactions or would fail trying to open a
    // duplicate one. Scope by cashbox instead.
    const url = new URL(context.request.url);
    const cashboxId = String(url.searchParams.get('cashbox_id') || session.cashbox_id || appUser.default_cashbox_id || '').trim();

    let path = '/shifts?select=shift_id,cashbox_id,opened_by,opened_at,opening_note,status&status=eq.OPEN';
    if (cashboxId) {
      path += '&cashbox_id=' + encodeEq(cashboxId);
    } else if (appUser.email) {
      // Fallback for accounts with no cashbox context at all (e.g. no default_cashbox_id
      // and no cashbox selected in-session): keep the old per-user scoping rather than
      // returning every open shift in the system.
      path += '&opened_by=' + encodeEq(appUser.email);
    }
    path += '&order=opened_at.desc';

    const rows = await supabaseRest(env, path);
    const shifts = (rows || []).map(sanitizeShift);

    return apiOk({
      shifts,
      count: shifts.length
    });
  } catch (error) {
    return apiError('Pregled aktivnih smena nije uspeo.', error.status || 500);
  }
}
