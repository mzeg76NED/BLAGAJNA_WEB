import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function findById(env, table, key, value) {
  const rows = await supabaseRest(env, '/' + table + '?select=*&' + key + '=' + encodeEq(value) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function findOpenShift(env, cashboxId, userEmail) {
  const rows = await supabaseRest(
    env,
    '/shifts?select=*&cashbox_id=' + encodeEq(cashboxId) + '&status=eq.OPEN&opened_by=' + encodeEq(userEmail) + '&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function getBalance(env, cashboxId, currency) {
  const rows = await supabaseRest(
    env,
    '/cashbox_balances?select=balance&cashbox_id=' + encodeEq(cashboxId) + '&currency=' + encodeEq(currency) + '&limit=1'
  );
  return rows && rows.length ? Number(rows[0].balance || 0) : 0;
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

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'payment_orders:execute');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const pendingPaymentId = String(body.pending_payment_id || body.pendingPaymentId || '').trim();
    const paymentData = body.payment_data || body.paymentData || {};
    if (!pendingPaymentId) return apiError('Pending isplata je obavezna.', 400);

    const pendingBefore = await findById(env, 'cash_events', 'event_id', pendingPaymentId);
    if (!pendingBefore) return apiError('Pending ISPLATA nije pronađena.', 404);
    if (pendingBefore.event_type !== 'CASH_OUTFLOW' || !pendingBefore.linked_order_id) {
      return apiError('Pending ISPLATA mora biti CASH_OUTFLOW vezan za nalog.', 400);
    }
    if (pendingBefore.status !== 'SUBMITTED') {
      return apiError('Pending ISPLATA nije u statusu SUBMITTED.', 409);
    }

    const orderBefore = await findById(env, 'payment_orders', 'order_id', pendingBefore.linked_order_id);
    if (!orderBefore) return apiError('Nalog nije pronađen.', 404);
    if (!['WAITING_PAYMENT', 'PARTIALLY_PAID'].includes(orderBefore.status)) {
      return apiError('Nalog nije u statusu za isplatu.', 409);
    }

    const amountOrdered = Number(orderBefore.amount_ordered || 0);
    const amountAlreadyPaid = Number(orderBefore.amount_paid || 0);
    const remainingAmount = amountOrdered - amountAlreadyPaid;
    const paymentAmount = paymentData.amount === undefined || paymentData.amount === null || paymentData.amount === ''
      ? Number(pendingBefore.amount || remainingAmount)
      : Number(paymentData.amount);
    const paymentCurrency = paymentData.currency || orderBefore.currency;
    const paymentCashboxId = paymentData.cashbox_id || orderBefore.cashbox_id;
    if (!(paymentAmount > 0)) return apiError('Iznos isplate mora biti veći od nule.', 400);
    if (paymentAmount > remainingAmount) return apiError('Iznos isplate prelazi preostali iznos naloga.', 400);
    if (paymentCurrency !== orderBefore.currency) return apiError('Valuta isplate mora odgovarati nalogu.', 400);
    if (paymentCashboxId !== orderBefore.cashbox_id) return apiError('Blagajna isplate mora odgovarati nalogu.', 400);

    const appUser = sessionResult.session.app_user || {};
    const openShift = await findOpenShift(env, paymentCashboxId, appUser.email || '');
    if (!openShift) return apiError('Aktivna smena za ovu blagajnu nije pronađena za trenutnog korisnika.', 409);

    const previousBalance = await getBalance(env, paymentCashboxId, paymentCurrency);
    if (previousBalance < paymentAmount) {
      await insertAuditLog(env, 'UPDATE', 'PAYMENT_ORDERS', orderBefore.order_id, orderBefore, orderBefore, 'Insufficient balance for pending ISPLATA ' + pendingPaymentId + '.', appUser, sessionResult.session, paymentCashboxId);
      return apiError('Nedovoljno sredstava u blagajni.', 409);
    }

    const now = new Date().toISOString();
    const cashRows = await supabaseRest(env, '/cash_events?event_id=' + encodeEq(pendingPaymentId), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        event_date: paymentData.event_date || now,
        amount: paymentAmount,
        description: (orderBefore.purpose || '') + (paymentData.note ? '\n' + String(paymentData.note).trim() : ''),
        document_status: paymentData.document_status === 'ATTACHED' ? 'ATTACHED' : 'MISSING',
        status: 'POSTED',
        posted_by: appUser.email || appUser.user_code || '',
        posted_at: now,
        updated_at: now
      })
    });
    const cashEvent = cashRows && cashRows.length ? cashRows[0] : { ...pendingBefore, status: 'POSTED' };
    const totalPaid = amountAlreadyPaid + paymentAmount;
    const fullyPaid = totalPaid >= amountOrdered;
    const orderRows = await supabaseRest(env, '/payment_orders?order_id=' + encodeEq(orderBefore.order_id), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        amount_paid: totalPaid,
        executed_by: fullyPaid ? (appUser.email || appUser.user_code || '') : (orderBefore.executed_by || null),
        executed_at: fullyPaid ? now : (orderBefore.executed_at || null),
        linked_cash_event_id: cashEvent.event_id,
        status: fullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        updated_at: now
      })
    });
    const orderAfter = orderRows && orderRows.length ? orderRows[0] : { ...orderBefore, amount_paid: totalPaid };

    await insertAuditLog(env, 'POST', 'CASH_EVENTS', cashEvent.event_id, pendingBefore, cashEvent, 'Pending ISPLATA executed by cashier and posted as CASH_OUTFLOW event.', appUser, sessionResult.session, paymentCashboxId);
    await insertAuditLog(env, 'UPDATE', 'PAYMENT_ORDERS', orderAfter.order_id, orderBefore, orderAfter, 'Payment order updated after cash payment execution.', appUser, sessionResult.session, paymentCashboxId);

    return apiOk({
      cashEvent,
      paymentOrder: orderAfter,
      previousBalance,
      newBalance: previousBalance - paymentAmount,
      pendingPayment: cashEvent
    });
  } catch (error) {
    return apiError('Izvršenje pending isplate nije uspelo.', error.status || 500);
  }
}
