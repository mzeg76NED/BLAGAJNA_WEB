import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function findOrder(env, orderId) {
  const rows = await supabaseRest(env, '/payment_orders?select=*&order_id=' + encodeEq(orderId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function findPendingPayment(env, orderId) {
  const rows = await supabaseRest(
    env,
    '/cash_events?select=*&linked_order_id=' + encodeEq(orderId) + '&status=eq.SUBMITTED&event_type=eq.CASH_OUTFLOW&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function insertAuditLog(env, action, entityType, entityId, oldValue, newValue, comment, user, session) {
  await supabaseRest(env, '/audit_log', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      log_id: makeId('LOG'),
      user: user.email || user.user_code || 'system',
      app_user_id: user.user_id || user.app_user_id || '',
      app_user_name: user.full_name || '',
      user_code: user.user_code || '',
      role: user.role || '',
      google_session_email: session.google_session_email || '',
      cashbox_id: newValue.cashbox_id || oldValue.cashbox_id || '',
      shift_id: session.shift_id || '',
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue || null,
      new_value: newValue || {},
      comment
    })
  });
}

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'payment_orders:issue');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const orderId = String(body.order_id || body.orderId || '').trim();
    if (!orderId) return apiError('Nalog je obavezan.', 400);

    const order = await findOrder(env, orderId);
    if (!order) return apiError('Nalog nije pronađen.', 404);
    if (!['WAITING_PAYMENT', 'PARTIALLY_PAID'].includes(order.status)) {
      return apiError('Nalog nije u statusu za slanje blagajniku.', 409);
    }

    const existingPending = await findPendingPayment(env, orderId);
    if (existingPending) {
      return apiOk({
        paymentOrder: order,
        pendingPayment: existingPending,
        alreadyPending: true
      });
    }

    const remainingAmount = Number(order.amount_ordered || 0) - Number(order.amount_paid || 0);
    if (!(remainingAmount > 0)) {
      return apiError('Nema preostalog iznosa za isplatu.', 400);
    }

    const now = new Date().toISOString();
    const pendingPayment = {
      event_id: makeId('CEV'),
      created_at: now,
      created_by: sessionResult.session.app_user.email || sessionResult.session.app_user.user_code || '',
      event_date: now,
      event_type: 'CASH_OUTFLOW',
      cashbox_id: order.cashbox_id,
      currency: order.currency,
      direction: 'OUT',
      amount: remainingAmount,
      linked_request_id: order.linked_request_id || order.source_request_id || null,
      linked_order_id: order.order_id,
      partner_name: order.pay_to_name,
      description: (order.purpose || '') + '\nPending ISPLATA po nalogu ' + (order.ref_no ? ('#' + order.ref_no) : order.order_id),
      document_status: 'MISSING',
      status: 'SUBMITTED',
      posted_by: null,
      posted_at: null,
      locked_by: null,
      locked_at: null,
      reversal_of_event_id: null,
      updated_at: null
    };

    const inserted = await supabaseRest(env, '/cash_events', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(pendingPayment)
    });
    const created = inserted && inserted.length ? inserted[0] : pendingPayment;
    const updatedRows = await supabaseRest(env, '/payment_orders?order_id=' + encodeEq(orderId), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        linked_cash_event_id: created.event_id,
        updated_at: now
      })
    });
    const updatedOrder = updatedRows && updatedRows.length ? updatedRows[0] : { ...order, linked_cash_event_id: created.event_id };
    const user = sessionResult.session.app_user || {};
    await insertAuditLog(env, 'CREATE', 'CASH_EVENTS', created.event_id, null, created, 'Pending ISPLATA created from payment order ' + orderId + '.', user, sessionResult.session);
    await insertAuditLog(env, 'SUBMIT', 'PAYMENT_ORDERS', orderId, order, updatedOrder, 'Payment order sent to cashier as pending ISPLATA. Pending cash event does not affect balance.', user, sessionResult.session);

    return apiOk({
      paymentOrder: updatedOrder,
      pendingPayment: created,
      alreadyPending: false
    });
  } catch (error) {
    return apiError('Slanje naloga blagajniku nije uspelo.', error.status || 500);
  }
}
