import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

// Ported from WebApp.gs apiGetShiftHistory. Non-elevated users (CASHIER) only see shifts
// they opened or were handed over to; elevated roles (ADMIN/DIRECTOR/FINANCE/CASHIER_SUPERVISOR)
// see all shifts for the requested cashbox.
const ELEVATED_ROLES = ['ADMIN', 'DIRECTOR', 'FINANCE', 'CASHIER_SUPERVISOR'];

function sanitizeShift(shift) {
  return {
    shift_id: shift.shift_id || '',
    cashbox_id: shift.cashbox_id || '',
    opened_by: shift.opened_by || '',
    opened_at: shift.opened_at || '',
    opening_note: shift.opening_note || '',
    opening_balance_json: shift.opening_balance_json || {},
    closed_by: shift.closed_by || '',
    closed_at: shift.closed_at || '',
    handover_to: shift.handover_to || '',
    handover_at: shift.handover_at || '',
    closing_balance_json: shift.closing_balance_json || {},
    physical_balance_json: shift.physical_balance_json || {},
    difference_json: shift.difference_json || {},
    status: shift.status || '',
    note: shift.note || ''
  };
}

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'shifts:view');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const session = sessionResult.session || {};
    const appUser = session.app_user || {};
    const cashboxId = String(url.searchParams.get('cashbox_id') || session.cashbox_id || appUser.default_cashbox_id || '').trim();
    const status = String(url.searchParams.get('status') || '').trim();
    const limitParam = Number(url.searchParams.get('limit') || 50);
    const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 500 ? limitParam : 50;

    let path = '/shifts?select=*';
    if (cashboxId) path += '&cashbox_id=' + encodeEq(cashboxId);
    if (status) path += '&status=' + encodeEq(status);
    path += '&order=opened_at.desc&limit=' + limit;

    const rows = await supabaseRest(env, path);
    const canSeeAll = ELEVATED_ROLES.includes(appUser.role);
    const userEmail = String(appUser.email || '').toLowerCase();
    const scoped = (rows || []).filter((shift) => {
      if (canSeeAll) return true;
      const openedBy = String(shift.opened_by || '').toLowerCase();
      const handoverTo = String(shift.handover_to || '').toLowerCase();
      return (userEmail && openedBy === userEmail) || (userEmail && handoverTo === userEmail);
    });

    return apiOk({ rows: scoped.map(sanitizeShift) });
  } catch (error) {
    return apiError(error.message || 'Istorija smena nije uspela.', error.status || 500);
  }
}
