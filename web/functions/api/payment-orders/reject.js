import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function insertAuditLog(env, action, entityType, entityId, oldValue, newValue, comment, user, session, cashboxId) {
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
      cashbox_id: cashboxId || '',
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

// FAZA 3x: nalog poslat blagajniku na isplatu ima povezanu "pending ISPLATA" stavku u
// cash_events (status SUBMITTED, event_type CASH_OUTFLOW, linked_order_id) - kreira je
// send-to-cashier.js, i UPRAVO ta stavka se prikazuje u Knjizi kao "na čekanju". Ranije
// je ovaj endpoint menjao SAMO payment_orders.status, ostavljajući tu cash_events stavku
// zauvek u statusu SUBMITTED - trajno "visi" u Knjizi kao da čeka isplatu, a istovremeno
// je neizvršiva (execute-pending.js zahteva da nalog bude WAITING_PAYMENT/PARTIALLY_PAID).
// Ispravka: ako postoji takva pending stavka, ona se sada otkazuje (status CANCELLED -
// isti status koji cash_events tabela već podržava, vidi cash-events/reverse.js) kao deo
// iste akcije odbijanja, sa sopstvenim audit log zapisom.
async function findPendingPayment(env, orderId) {
  const rows = await supabaseRest(
    env,
    '/cash_events?select=*&linked_order_id=' + encodeEq(orderId) + '&status=eq.SUBMITTED&event_type=eq.CASH_OUTFLOW&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
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

    const appUser = sessionResult.session.app_user || {};
    const session = sessionResult.session || {};
    const now = new Date().toISOString();

    // Otkaži povezanu pending ISPLATA stavku (ako postoji) PRE menjanja statusa naloga,
    // da ne ostane siroče u Knjizi/redu čekanja ako nešto usput pukne.
    const pendingPayment = await findPendingPayment(env, orderId);
    if (pendingPayment) {
      const cancelledRows = await supabaseRest(env, '/cash_events?event_id=' + encodeEq(pendingPayment.event_id), {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'CANCELLED',
          updated_at: now
        })
      });
      const cancelledPayment = cancelledRows && cancelledRows.length ? cancelledRows[0] : { ...pendingPayment, status: 'CANCELLED' };
      await insertAuditLog(
        env,
        'CANCEL',
        'CASH_EVENTS',
        pendingPayment.event_id,
        pendingPayment,
        cancelledPayment,
        'Pending ISPLATA otkazana jer je blagajnik odbio nalog ' + orderId + ' pre isplate. Razlog odbijanja: ' + reason,
        appUser,
        session,
        pendingPayment.cashbox_id || order.cashbox_id
      );
    }

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
    await insertAuditLog(
      env,
      'REJECT',
      'PAYMENT_ORDERS',
      order.order_id || '',
      order,
      updatedOrder,
      'Payment order rejected by cashier.' + (pendingPayment ? ' Pending ISPLATA ' + pendingPayment.event_id + ' otkazana istovremeno.' : ''),
      appUser,
      session,
      order.cashbox_id
    );

    return apiOk(updatedOrder);
  } catch (error) {
    return apiError('Odbijanje naloga nije uspelo.', error.status || 500);
  }
}
