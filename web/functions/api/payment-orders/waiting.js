import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

function sanitizeOrder(order) {
  const amountOrdered = Number(order.amount_ordered || 0);
  const amountPaid = Number(order.amount_paid || 0);
  return {
    order_id: order.order_id || '',
    created_at: order.created_at || '',
    created_by: order.created_by || '',
    source_request_id: order.source_request_id || '',
    linked_request_id: order.linked_request_id || '',
    order_type: order.order_type || '',
    cashbox_id: order.cashbox_id || '',
    pay_to_name: order.pay_to_name || '',
    amount_ordered: amountOrdered,
    amount_paid: amountPaid,
    remaining_amount: Math.max(amountOrdered - amountPaid, 0),
    currency: order.currency || '',
    purpose: order.purpose || '',
    description: order.description || '',
    due_date: order.due_date || '',
    priority: order.priority || '',
    status: order.status || '',
    issued_by: order.issued_by || '',
    issued_at: order.issued_at || '',
    linked_cash_event_id: order.linked_cash_event_id || '',
    document_status: order.document_status || '',
    cashier_rejection_reason: order.cashier_rejection_reason || ''
  };
}

function sortOrders(left, right) {
  const leftUrgent = left.priority === 'URGENT' || left.priority === 'VERY_URGENT' ? 1 : 0;
  const rightUrgent = right.priority === 'URGENT' || right.priority === 'VERY_URGENT' ? 1 : 0;
  if (leftUrgent !== rightUrgent) return rightUrgent - leftUrgent;
  return String(left.due_date || left.created_at || '').localeCompare(String(right.due_date || right.created_at || ''));
}

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const sessionResult = await verifySession(env, getSessionId(context.request), 'payment_orders:view');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const rows = await supabaseRest(
      env,
      '/payment_orders?select=*&status=in.(WAITING_PAYMENT,PARTIALLY_PAID)&order=due_date.asc.nullslast,created_at.asc'
    );
    const orders = (rows || []).map(sanitizeOrder).sort(sortOrders);
    return apiOk({
      orders,
      count: orders.length
    });
  } catch (error) {
    return apiError('Pregled naloga za isplatu nije uspeo.', error.status || 500);
  }
}
