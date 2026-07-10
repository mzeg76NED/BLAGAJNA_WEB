import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

async function findOrder(env, orderId) {
  if (!orderId) return null;
  const rows = await supabaseRest(env, '/payment_orders?select=*&order_id=' + encodeEq(orderId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function sanitizePending(env, event) {
  const order = await findOrder(env, event.linked_order_id);
  return {
    pending_payment_id: event.event_id || '',
    event_id: event.event_id || '',
    ref_no: event.ref_no || null,
    order_id: event.linked_order_id || '',
    order_ref_no: order && order.ref_no || null,
    linked_order_id: event.linked_order_id || '',
    cashbox_id: event.cashbox_id || '',
    currency: event.currency || '',
    amount: Number(event.amount || 0),
    pay_to_name: order && order.pay_to_name ? order.pay_to_name : event.partner_name || '',
    partner_name: event.partner_name || '',
    purpose: order && order.purpose ? order.purpose : '',
    description: event.description || '',
    status: event.status || '',
    created_at: event.created_at || '',
    event_date: event.event_date || ''
  };
}

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'payment_orders:execute');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const cashboxId = String(url.searchParams.get('cashbox_id') || '').trim();
    const currency = String(url.searchParams.get('currency') || '').trim();
    let path = '/cash_events?select=*&status=eq.SUBMITTED&event_type=eq.CASH_OUTFLOW&order=created_at.asc';
    if (cashboxId) path += '&cashbox_id=' + encodeEq(cashboxId);
    if (currency) path += '&currency=' + encodeEq(currency);

    const rows = await supabaseRest(env, path);
    const pending = await Promise.all((rows || [])
      .filter((event) => event.linked_order_id)
      .map((event) => sanitizePending(env, event)));

    return apiOk({
      pending,
      rows: pending,
      count: pending.length
    });
  } catch (error) {
    return apiError('Pregled pending isplata nije uspeo.', error.status || 500);
  }
}
