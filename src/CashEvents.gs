/**
 * Cash Event is the only layer that changes calculated cashbox balance.
 * Only posted or locked cash events affect balance.
 */
const CASH_EVENT_POSTER_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.FINANCE,
  USER_ROLES.ADMIN
]);

const PAYMENT_EXECUTION_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.ADMIN
]);

const CASH_EVENT_VIEW_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.FINANCE,
  USER_ROLES.DIRECTOR,
  USER_ROLES.ADMIN
]);

function executePaymentOrder(orderId, paymentData) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const currentUser = requireActiveUserWithRole_(PAYMENT_EXECUTION_ROLES_);
    assertNonEmptyString(orderId, 'orderId');

    const orderBefore = getPaymentOrderById(orderId);
    if (!orderBefore) {
      throw new Error('Payment Order not found: ' + orderId);
    }
    assertEntityStatus(orderBefore, [
      ORDER_STATUSES.WAITING_PAYMENT,
      ORDER_STATUSES.PARTIALLY_PAID
    ], 'Payment Order');

    const data = paymentData || {};
    const amountOrdered = Number(orderBefore.amount_ordered);
    const amountAlreadyPaid = Number(orderBefore.amount_paid || 0);
    const remainingAmount = amountOrdered - amountAlreadyPaid;
    const paymentAmount = data.amount === undefined || data.amount === null || data.amount === ''
      ? remainingAmount
      : Number(data.amount);
    const paymentCurrency = data.currency || orderBefore.currency;
    const paymentCashboxId = data.cashbox_id || orderBefore.cashbox_id;

    assertPositiveAmount(paymentAmount);
    if (paymentAmount > remainingAmount) {
      throw new Error('Payment amount exceeds remaining ordered amount. Remaining: ' + remainingAmount + '.');
    }
    if (paymentCurrency !== orderBefore.currency) {
      throw new Error('Payment currency must match order currency: ' + orderBefore.currency);
    }
    if (paymentCashboxId !== orderBefore.cashbox_id) {
      throw new Error('Payment cashbox must match order cashbox: ' + orderBefore.cashbox_id);
    }

    assertActiveCashbox(paymentCashboxId);
    assertActiveCurrency(paymentCurrency);

    const previousBalance = calculateCashboxBalance(paymentCashboxId, paymentCurrency);
    assertSufficientBalance(previousBalance, paymentAmount, paymentCashboxId, paymentCurrency);

    const now = getCurrentTimestamp_();
    const cashEvent = {
      event_id: generateId_('CEV'),
      created_at: now,
      created_by: currentUser.email,
      event_date: data.event_date || now,
      event_type: CASH_EVENT_TYPES.CASH_OUTFLOW,
      cashbox_id: paymentCashboxId,
      currency: paymentCurrency,
      direction: 'OUT',
      amount: paymentAmount,
      linked_request_id: orderBefore.source_request_id || '',
      linked_order_id: orderBefore.order_id,
      partner_name: orderBefore.pay_to_name,
      description: buildCashPaymentDescription_(orderBefore.purpose, data.note),
      document_status: data.document_status === DOCUMENT_STATUSES.ATTACHED
        ? DOCUMENT_STATUSES.ATTACHED
        : DOCUMENT_STATUSES.MISSING,
      status: CASH_EVENT_STATUSES.POSTED,
      posted_by: currentUser.email,
      posted_at: now,
      locked_by: '',
      locked_at: '',
      reversal_of_event_id: '',
      updated_at: ''
    };

    appendRecord(SHEET_NAMES.CASH_EVENTS, cashEvent);

    const totalPaid = amountAlreadyPaid + paymentAmount;
    const fullyPaid = totalPaid >= amountOrdered;
    const orderAfter = updatePaymentOrderAfterExecution(orderBefore.order_id, {
      amount_paid: totalPaid,
      executed_by: fullyPaid ? currentUser.email : orderBefore.executed_by || '',
      executed_at: fullyPaid ? now : orderBefore.executed_at || '',
      linked_cash_event_id: cashEvent.event_id,
      status: fullyPaid ? ORDER_STATUSES.PAID : ORDER_STATUSES.PARTIALLY_PAID,
      updated_at: now
    });

    writeAuditLog(
      AUDIT_ACTIONS.POST,
      SHEET_NAMES.CASH_EVENTS,
      cashEvent.event_id,
      null,
      cashEvent,
      'Payment order executed by posted CASH_OUTFLOW event.'
    );
    writeAuditLog(
      AUDIT_ACTIONS.UPDATE,
      SHEET_NAMES.PAYMENT_ORDERS,
      orderBefore.order_id,
      orderBefore,
      orderAfter,
      'Payment order updated after cash payment execution.'
    );

    return {
      cashEvent: cashEvent,
      paymentOrder: orderAfter,
      previousBalance: previousBalance,
      newBalance: previousBalance - paymentAmount
    };
  } finally {
    lock.releaseLock();
  }
}

function createCashInflow(data) {
  const currentUser = requireActiveUserWithRole_(CASH_EVENT_POSTER_ROLES_);
  const inflowData = data || {};

  assertRequiredFields(inflowData, [
    'cashbox_id',
    'currency',
    'amount',
    'description'
  ]);
  assertNonEmptyString(inflowData.description, 'description');
  assertPositiveAmount(inflowData.amount);
  assertActiveCashbox(inflowData.cashbox_id);
  assertActiveCurrency(inflowData.currency);

  const now = getCurrentTimestamp_();
  const cashEvent = {
    event_id: generateId_('CEV'),
    created_at: now,
    created_by: currentUser.email,
    event_date: inflowData.event_date || now,
    event_type: CASH_EVENT_TYPES.CASH_INFLOW,
    cashbox_id: inflowData.cashbox_id,
    currency: inflowData.currency,
    direction: 'IN',
    amount: Number(inflowData.amount),
    linked_request_id: '',
    linked_order_id: '',
    partner_name: inflowData.partner_name || '',
    description: String(inflowData.description).trim(),
    document_status: inflowData.document_status === DOCUMENT_STATUSES.ATTACHED
      ? DOCUMENT_STATUSES.ATTACHED
      : DOCUMENT_STATUSES.NONE,
    status: CASH_EVENT_STATUSES.POSTED,
    posted_by: currentUser.email,
    posted_at: now,
    locked_by: '',
    locked_at: '',
    reversal_of_event_id: '',
    updated_at: ''
  };

  appendRecord(SHEET_NAMES.CASH_EVENTS, cashEvent);
  writeAuditLog(
    AUDIT_ACTIONS.POST,
    SHEET_NAMES.CASH_EVENTS,
    cashEvent.event_id,
    null,
    cashEvent,
    'Posted cash inflow.'
  );

  return cashEvent;
}

function createCashTransfer(data) {
  throw new Error('Cash transfer is not implemented in Task 05. Use later cash transfer workflow.');
}

function calculateCashboxBalance(cashboxId, currency) {
  assertNonEmptyString(cashboxId, 'cashboxId');
  assertNonEmptyString(currency, 'currency');

  return listRecords(SHEET_NAMES.CASH_EVENTS, {
    cashbox_id: cashboxId,
    currency: currency
  }).reduce(function(balance, event) {
    if (event.status !== CASH_EVENT_STATUSES.POSTED && event.status !== CASH_EVENT_STATUSES.LOCKED) {
      return balance;
    }

    const amount = Number(event.amount || 0);
    if (event.direction === 'IN') {
      return balance + amount;
    }
    if (event.direction === 'OUT') {
      return balance - amount;
    }
    return balance;
  }, 0);
}

function getCashEventsForCashbox(cashboxId, currency) {
  requireActiveUserWithRole_(CASH_EVENT_VIEW_ROLES_);
  assertNonEmptyString(cashboxId, 'cashboxId');
  assertNonEmptyString(currency, 'currency');

  return listRecords(SHEET_NAMES.CASH_EVENTS, {
    cashbox_id: cashboxId,
    currency: currency
  }).sort(function(left, right) {
    return toTime_(right.created_at) - toTime_(left.created_at);
  });
}

function reverseCashEvent(eventId, reason) {
  throw new Error('Cash event reversal is not implemented in Task 05. Use later correction/reversal workflow.');
}

function buildCashPaymentDescription_(purpose, note) {
  if (purpose && note) {
    return purpose + '\n' + note;
  }
  return note || purpose || '';
}
