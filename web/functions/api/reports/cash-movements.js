import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

function canAccessCashbox(user, cashboxId) {
  if (!user || !cashboxId) return false;
  if (user.role === 'CASHIER' && user.default_cashbox_id) {
    return String(user.default_cashbox_id) === String(cashboxId);
  }
  return true;
}

function isDateInRange(value, dateFrom, dateTo) {
  const date = String(value || '').slice(0, 10);
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

function sanitizeEvent(event, index) {
  const amount = Number(event.amount || 0);
  const signedAmount = event.direction === 'OUT' ? -amount : amount;
  return {
    event_date: event.event_date || event.created_at || '',
    event_id: event.event_id || '',
    entry_number: index + 1,
    event_type: event.event_type || '',
    direction: event.direction || '',
    amount,
    signed_amount: signedAmount,
    display_direction: event.direction || '',
    display_amount: amount,
    running_balance: null,
    cashbox_id: event.cashbox_id || '',
    currency: event.currency || '',
    partner_name: event.partner_name || '',
    description: event.description || '',
    linked_order_id: event.linked_order_id || '',
    reversal_of_event_id: event.reversal_of_event_id || '',
    status: event.status || '',
    document_status: event.document_status || '',
    posted_by: event.posted_by || '',
    posted_at: event.posted_at || '',
    created_by: event.created_by || '',
    created_at: event.created_at || '',
    source_type: 'CASH_EVENT'
  };
}

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'cash_events:view');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const appUser = sessionResult.session.app_user || {};
    const cashboxId = String(url.searchParams.get('cashbox_id') || sessionResult.session.cashbox_id || appUser.default_cashbox_id || '').trim();
    const currency = String(url.searchParams.get('currency') || '').trim();
    const status = String(url.searchParams.get('status') || '').trim();
    const dateFrom = String(url.searchParams.get('date_from') || '').slice(0, 10);
    const dateTo = String(url.searchParams.get('date_to') || '').slice(0, 10);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500);
    if (cashboxId && !canAccessCashbox(appUser, cashboxId)) {
      return apiError('Nemate pristup izabranoj blagajni.', 403);
    }

    let path = '/cash_events?select=event_id,created_at,created_by,event_date,event_type,cashbox_id,currency,direction,amount,linked_order_id,partner_name,description,document_status,status,posted_by,posted_at,reversal_of_event_id';
    if (cashboxId) path += '&cashbox_id=' + encodeEq(cashboxId);
    if (currency) path += '&currency=' + encodeEq(currency);
    if (status) path += '&status=' + encodeEq(status);
    path += '&order=event_date.desc&limit=' + limit;

    const rows = await supabaseRest(env, path);
    const events = (rows || [])
      .filter((event) => ['POSTED', 'LOCKED'].includes(event.status))
      .filter((event) => isDateInRange(event.event_date || event.created_at, dateFrom, dateTo))
      .map(sanitizeEvent);

    return apiOk({
      rows: events,
      count: events.length
    });
  } catch (error) {
    return apiError('Izveštaj gotovinskih pokreta nije uspeo.', error.status || 500);
  }
}
