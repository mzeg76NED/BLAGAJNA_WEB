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

const CASH_EVENT_CORRECTION_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR
]);

const LOCKED_CASH_EVENT_REVERSAL_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.FINANCE
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
    assertCashboxAccess(paymentCashboxId);
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
      linked_request_id: orderBefore.linked_request_id || orderBefore.source_request_id || '',
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
  assertCashboxAccess(inflowData.cashbox_id);
  assertActiveCurrency(inflowData.currency);
  assertCurrentUserOwnsOpenShiftForCashbox_(inflowData.cashbox_id);

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
    if (!isCashEventBalanceAffecting(event)) {
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

function calculateCashboxBalances(cashboxId, currencies) {
  assertNonEmptyString(cashboxId, 'cashboxId');
  const requestedCurrencies = (currencies && currencies.length ? currencies : listSupportedCurrencies())
    .map(function(currency) {
      return String(currency || '').trim();
    })
    .filter(function(currency) {
      return currency !== '';
    });
  const result = requestedCurrencies.reduce(function(index, currency) {
    assertActiveCurrency(currency);
    index[currency] = 0;
    return index;
  }, {});

  listRecords(SHEET_NAMES.CASH_EVENTS, {
    cashbox_id: cashboxId
  }).forEach(function(event) {
    const currency = String(event.currency || '').trim();
    if (!Object.prototype.hasOwnProperty.call(result, currency) || !isCashEventBalanceAffecting(event)) {
      return;
    }
    const amount = Number(event.amount || 0);
    if (event.direction === 'IN') {
      result[currency] += amount;
    } else if (event.direction === 'OUT') {
      result[currency] -= amount;
    }
  });

  return result;
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
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const currentUser = requireActiveUserWithRole_(CASH_EVENT_CORRECTION_ROLES_);
    assertNonEmptyString(eventId, 'eventId');
    assertMandatoryReason(reason);

    const match = findRecordById(SHEET_NAMES.CASH_EVENTS, 'event_id', eventId);
    if (!match) {
      throw new Error('Cash Event not found: ' + eventId);
    }

    const originalBefore = match.record;
    assertCashEventCanBeReversed_(originalBefore);

    const previousBalance = calculateCashboxBalance(originalBefore.cashbox_id, originalBefore.currency);
    const now = getCurrentTimestamp_();
    const cleanReason = String(reason).trim();
    const reversalEvent = {
      event_id: generateId_('CEV'),
      created_at: now,
      created_by: currentUser.email,
      event_date: now,
      event_type: CASH_EVENT_TYPES.REVERSAL,
      cashbox_id: originalBefore.cashbox_id,
      currency: originalBefore.currency,
      direction: getOppositeDirection_(originalBefore.direction),
      amount: Number(originalBefore.amount),
      linked_request_id: originalBefore.linked_request_id || '',
      linked_order_id: originalBefore.linked_order_id || '',
      partner_name: originalBefore.partner_name || '',
      description: buildReversalDescription_(originalBefore, cleanReason),
      document_status: DOCUMENT_STATUSES.NONE,
      status: CASH_EVENT_STATUSES.POSTED,
      posted_by: currentUser.email,
      posted_at: now,
      locked_by: '',
      locked_at: '',
      reversal_of_event_id: originalBefore.event_id,
      updated_at: ''
    };

    appendRecord(SHEET_NAMES.CASH_EVENTS, reversalEvent);
    const originalAfter = updateRecordById(
      SHEET_NAMES.CASH_EVENTS,
      'event_id',
      originalBefore.event_id,
      {
        status: CASH_EVENT_STATUSES.REVERSED,
        updated_at: now
      }
    );
    const newBalance = calculateCashboxBalance(originalBefore.cashbox_id, originalBefore.currency);

    writeAuditLog(
      AUDIT_ACTIONS.REVERSE,
      SHEET_NAMES.CASH_EVENTS,
      originalBefore.event_id,
      originalBefore,
      originalAfter,
      'Cash event reversed. Reason: ' + cleanReason
    );
    writeAuditLog(
      AUDIT_ACTIONS.POST,
      SHEET_NAMES.CASH_EVENTS,
      reversalEvent.event_id,
      null,
      reversalEvent,
      'Posted reversal event for original event: ' + originalBefore.event_id
    );

    return {
      originalEvent: originalAfter,
      reversalEvent: reversalEvent,
      previousBalance: previousBalance,
      newBalance: newBalance
    };
  } finally {
    lock.releaseLock();
  }
}

function createCorrectionEvent(data) {
  const currentUser = requireActiveUserWithRole_(CASH_EVENT_CORRECTION_ROLES_);
  const correctionData = data || {};

  assertRequiredFields(correctionData, [
    'cashbox_id',
    'currency',
    'direction',
    'amount',
    'description',
    'reason'
  ]);
  assertActiveCashbox(correctionData.cashbox_id);
  assertActiveCurrency(correctionData.currency);
  assertAllowedValue(correctionData.direction, ['IN', 'OUT'], 'direction');
  assertPositiveAmount(correctionData.amount, 'amount');
  assertNonEmptyString(correctionData.description, 'description');
  assertMandatoryReason(correctionData.reason);

  const now = getCurrentTimestamp_();
  const correctionType = correctionData.correction_type || 'OTHER';
  const description = buildCorrectionDescription_(
    correctionType,
    correctionData.description,
    correctionData.reason
  );
  const event = {
    event_id: generateId_('CEV'),
    created_at: now,
    created_by: currentUser.email,
    event_date: correctionData.event_date || now,
    event_type: CASH_EVENT_TYPES.CORRECTION,
    cashbox_id: correctionData.cashbox_id,
    currency: correctionData.currency,
    direction: correctionData.direction,
    amount: Number(correctionData.amount),
    linked_request_id: correctionData.linked_request_id || '',
    linked_order_id: correctionData.linked_order_id || '',
    partner_name: correctionData.partner_name || '',
    description: description,
    document_status: correctionData.document_status === DOCUMENT_STATUSES.ATTACHED
      ? DOCUMENT_STATUSES.ATTACHED
      : DOCUMENT_STATUSES.NONE,
    status: CASH_EVENT_STATUSES.POSTED,
    posted_by: currentUser.email,
    posted_at: now,
    locked_by: '',
    locked_at: '',
    reversal_of_event_id: correctionData.reversal_of_event_id || '',
    updated_at: ''
  };

  appendRecord(SHEET_NAMES.CASH_EVENTS, event);
  writeAuditLog(
    AUDIT_ACTIONS.POST,
    SHEET_NAMES.CASH_EVENTS,
    event.event_id,
    null,
    event,
    'Posted correction event. Reason: ' + String(correctionData.reason).trim()
  );

  return event;
}

function assertCashEventCanBeReversed_(event) {
  if (!event) {
    throw new Error('Cash Event is required.');
  }
  if (event.status === CASH_EVENT_STATUSES.REVERSED) {
    throw new Error('Cash Event is already reversed: ' + event.event_id);
  }
  if (event.status === CASH_EVENT_STATUSES.CANCELLED) {
    throw new Error('Cancelled Cash Event cannot be reversed: ' + event.event_id);
  }
  assertEntityStatus(event, [
    CASH_EVENT_STATUSES.POSTED,
    CASH_EVENT_STATUSES.LOCKED
  ], 'Cash Event');
  if (event.direction === 'NEUTRAL') {
    throw new Error('Neutral Cash Event cannot be reversed with this workflow.');
  }
  if (event.status === CASH_EVENT_STATUSES.LOCKED) {
    assertUserHasRole(LOCKED_CASH_EVENT_REVERSAL_ROLES_);
  }
}

function getOppositeDirection_(direction) {
  if (direction === 'IN') {
    return 'OUT';
  }
  if (direction === 'OUT') {
    return 'IN';
  }
  throw new Error('Unsupported direction for reversal: ' + direction);
}

function isCashEventBalanceAffecting(event) {
  return Boolean(event) && (
    event.status === CASH_EVENT_STATUSES.POSTED ||
    event.status === CASH_EVENT_STATUSES.LOCKED ||
    event.status === CASH_EVENT_STATUSES.REVERSED
  );
}

function preventDirectEditOfLockedCashEvent(eventId, updates) {
  assertNonEmptyString(eventId, 'eventId');
  const match = findRecordById(SHEET_NAMES.CASH_EVENTS, 'event_id', eventId);
  if (!match) {
    throw new Error('Cash Event not found: ' + eventId);
  }

  const protectedStatuses = [
    CASH_EVENT_STATUSES.POSTED,
    CASH_EVENT_STATUSES.LOCKED,
    CASH_EVENT_STATUSES.REVERSED
  ];
  if (protectedStatuses.indexOf(match.record.status) === -1) {
    return true;
  }

  const protectedFields = [
    'amount',
    'currency',
    'cashbox_id',
    'direction',
    'event_type',
    'linked_order_id'
  ];
  const attempted = Object.keys(updates || {}).filter(function(field) {
    return protectedFields.indexOf(field) !== -1 &&
      String(updates[field]) !== String(match.record[field]);
  });
  if (attempted.length > 0) {
    throw new Error('Posted, locked or reversed Cash Event cannot be edited directly. Use reversal/correction workflow.');
  }

  return true;
}

function buildCashPaymentDescription_(purpose, note) {
  if (purpose && note) {
    return purpose + '\n' + note;
  }
  return note || purpose || '';
}

function buildReversalDescription_(originalEvent, reason) {
  const prefix = originalEvent.status === CASH_EVENT_STATUSES.LOCKED
    ? 'POST_CLOSING_CORRECTION. '
    : '';
  return prefix + 'Reversal of ' + originalEvent.event_id + '. Reason: ' + reason;
}

/**
 * Creates a direct (no payment order) cash outflow for ad-hoc expenses.
 * Called from quick entry UI on mobile and desktop.
 * Payment Request and Payment Order are NOT required for this flow.
 */
function createDirectCashOutflow(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const currentUser = requireActiveUserWithRole_(CASH_EVENT_POSTER_ROLES_);
    const d = data || {};

    assertRequiredFields(d, ['cashbox_id', 'currency', 'amount', 'description']);
    assertNonEmptyString(d.description, 'description');
    assertPositiveAmount(d.amount);
    assertActiveCashbox(d.cashbox_id);
    assertCashboxAccess(d.cashbox_id);
    assertActiveCurrency(d.currency);
    assertCurrentUserOwnsOpenShiftForCashbox_(d.cashbox_id);

    const previousBalance = calculateCashboxBalance(d.cashbox_id, d.currency);
    assertSufficientBalance(previousBalance, d.amount, d.cashbox_id, d.currency);

    const now = getCurrentTimestamp_();
    const cashEvent = {
      event_id:             generateId_('CEV'),
      created_at:           now,
      created_by:           currentUser.email,
      event_date:           d.event_date || now,
      event_type:           CASH_EVENT_TYPES.CASH_OUTFLOW,
      cashbox_id:           d.cashbox_id,
      currency:             d.currency,
      direction:            'OUT',
      amount:               Number(d.amount),
      linked_request_id:    '',
      linked_order_id:      '',
      partner_name:         d.partner_name || '',
      description:          String(d.description).trim(),
      document_status:      DOCUMENT_STATUSES.NONE,
      status:               CASH_EVENT_STATUSES.POSTED,
      posted_by:            currentUser.email,
      posted_at:            now,
      locked_by:            '',
      locked_at:            '',
      reversal_of_event_id: '',
      updated_at:           ''
    };

    appendRecord(SHEET_NAMES.CASH_EVENTS, cashEvent);
    writeAuditLog(
      AUDIT_ACTIONS.POST,
      SHEET_NAMES.CASH_EVENTS,
      cashEvent.event_id,
      null,
      cashEvent,
      'Direct cash outflow posted without payment order.'
    );

    return cashEvent;
  } finally {
    lock.releaseLock();
  }
}

function createTreasuryHandover(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const currentUser = requireActiveUserWithRole_(CASH_EVENT_POSTER_ROLES_);
    const d = data || {};

    assertRequiredFields(d, ['cashbox_id', 'currency', 'amount']);
    assertPositiveAmount(d.amount);
    assertActiveCashbox(d.cashbox_id);
    assertCashboxAccess(d.cashbox_id);
    assertActiveCurrency(d.currency);
    assertCurrentUserOwnsOpenShiftForCashbox_(d.cashbox_id);

    const previousBalance = calculateCashboxBalance(d.cashbox_id, d.currency);
    assertSufficientBalance(previousBalance, d.amount, d.cashbox_id, d.currency);

    const now = getCurrentTimestamp_();
    const cashEvent = {
      event_id: generateId_('CEV'),
      created_at: now,
      created_by: currentUser.email,
      event_date: d.event_date || now,
      event_type: CASH_EVENT_TYPES.TREASURY_HANDOVER,
      cashbox_id: d.cashbox_id,
      currency: d.currency,
      direction: 'OUT',
      amount: Number(d.amount),
      linked_request_id: '',
      linked_order_id: '',
      partner_name: 'Trezor',
      description: 'Predaja u trezor' + (d.description ? '. ' + String(d.description).trim() : ''),
      document_status: DOCUMENT_STATUSES.NONE,
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
      'Treasury handover posted.'
    );

    return cashEvent;
  } finally {
    lock.releaseLock();
  }
}
