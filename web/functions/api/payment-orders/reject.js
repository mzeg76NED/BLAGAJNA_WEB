import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function insertAuditLog(env, order, updatedOrder, user, session) {
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
      cashbox_id: order.cashbox_id || '',
      shift_id: session.shift_id || '',
      action: 'REJECT',
      entity_type: 'PAYMENT_ORDERS',
      entity_id: order.order_id || '',
      old_value: order,
      new_value: updatedOrder,
      comment: 'Payment order rejected by cashier.'
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
    const sessionResult = await verifySession(env, sessionId, 'payment_orders:reject');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const orderId = String(body.order_id || body.orderId || '').trim();
    const reason = String(body.reason || '').trim();
    if (!orderId) return apiError('Nalog je obavezan.', 400);
    if (!reason) return apiError('Razlog odbijanja je obavezan.', 400);

    const rows = await supabaseRest(env, '/payment_orders?select=*&order_id=' + encodeEq(orderId) + '&limit=1');
    const order = rows && rows.length ? rows[0] : null;
    if (!order) return apiError('Nalog nije pronađen.', 404);
    if (order.status !== 'WAITING_PAYMENT') {
      return apiError('Samo nalog koji čeka isplatu može biti odbijen od blagajnika.', 409);
    }

    const now = new Date().toISOString();
    const updatedRows = await supabaseRest(env, '/payment_orders?order_id=' + encodeEq(orderId), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'REJECTED_BY_CASHIER',
        cashier_rejection_reason: reason,
        updated_at: now
      })
    });
    const updatedOrder = updatedRows && updatedRows.length ? updatedRows[0] : { ...order, status: 'REJECTED_BY_CASHIER', cashier_rejection_reason: reason };
    await insertAuditLog(env, order, updatedOrder, sessionResult.session.app_user || {}, sessionResult.session || {});

    return apiOk(updatedOrder);
  } catch (error) {
    return apiError('Odbijanje naloga nije uspelo.', error.status || 500);
  }
}
