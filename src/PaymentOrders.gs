/**
 * Payment Order authorizes payment.
 * It still does not affect cashbox balance until executed as Cash Payment Event.
 */
const PAYMENT_ORDER_CREATOR_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.APPROVER
]);

const DIRECT_PAYMENT_ORDER_CREATOR_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR
]);

const PAYMENT_ORDER_ISSUER_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.APPROVER
]);

const PAYMENT_ORDER_CANCEL_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR
]);

const PAYMENT_ORDER_CASHIER_REJECT_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.ADMIN
]);

const PAYMENT_ORDER_LIST_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.CASHIER,
  USER_ROLES.APPROVER
]);

const PAYMENT_ORDER_WAITING_LIST_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.ADMIN,
  USER_ROLES.FINANCE,
  USER_ROLES.DIRECTOR
]);

const PAYMENT_ORDER_SEND_TO_CASHIER_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.APPROVER
]);

function createPaymentOrderFromRequest(requestId, orderData) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    assertNonEmptyString(requestId, 'requestId');
    const data = orderData || {};

    const requestMatch = getPaymentRequestMatchOrThrow_(requestId);
    const request = requestMatch.record;
    assertRequestCanCreatePaymentOrder_(request);
    const currentUser = requirePaymentOrderCreatorForRequest_(request);

    if (request.linked_order_id) {
      throw new Error('Payment Request already has linked payment order: ' + request.linked_order_id);
    }
    assertNoActiveOrderForRequest_(requestId);

    assertRequiredFields(data, ['cashbox_id']);
    assertActiveCashbox(data.cashbox_id);
    assertCashboxAccess(data.cashbox_id);

    const amountOrdered = Number(data.amount_ordered || request.amount);
    const currency = data.currency || request.currency;
    const priority = data.priority || request.priority || REQUEST_PRIORITIES.NORMAL;
    const documentStatus = data.document_status || DOCUMENT_STATUSES.NONE;

    assertPositiveAmount(amountOrdered);
    assertActiveCurrency(currency);
    assertAllowedValue(priority, objectValues_(REQUEST_PRIORITIES), 'priority');
    assertAllowedValue(documentStatus, [
      DOCUMENT_STATUSES.NONE,
      DOCUMENT_STATUSES.MISSING,
      DOCUMENT_STATUSES.ATTACHED
    ], 'document_status');

    const now = getCurrentTimestamp_();
    const order = {
      order_id: generateId_('ORD'),
      created_at: now,
      created_by: currentUser.email,
      source_request_id: request.request_id,
      linked_request_id: request.request_id,
      order_type: ORDER_TYPES.FROM_REQUEST,
      cashbox_id: data.cashbox_id,
      pay_to_name: data.pay_to_name || request.requested_for_name,
      amount_ordered: amountOrdered,
      amount_paid: 0,
      currency: currency,
      purpose: data.purpose || request.purpose,
      description: buildOrderDescriptionFromRequest_(request.description, data.description),
      due_date: data.due_date || request.needed_by_date || '',
      priority: priority,
      status: ORDER_STATUSES.WAITING_PAYMENT,
      issued_by: currentUser.email,
      issued_at: now,
      executed_by: '',
      executed_at: '',
      linked_cash_event_id: '',
      document_status: documentStatus,
      cancellation_reason: '',
      cashier_rejection_reason: '',
      updated_at: ''
    };

    assertNonEmptyString(order.pay_to_name, 'pay_to_name');
    assertNonEmptyString(order.purpose, 'purpose');

    appendRecord(SHEET_NAMES.PAYMENT_ORDERS, order);

    const updatedRequest = updateRecordById(
      SHEET_NAMES.PAYMENT_REQUESTS,
      'request_id',
      request.request_id,
      {
        status: REQUEST_STATUSES.ORDER_CREATED || REQUEST_STATUSES.CONVERTED_TO_ORDER,
        linked_order_id: order.order_id,
        approval_path: PAYMENT_REQUEST_APPROVAL_PATHS.PAYMENT_ORDER,
        updated_at: now
      }
    );

    writeAuditLog(
      AUDIT_ACTIONS.CREATE,
      SHEET_NAMES.PAYMENT_ORDERS,
      order.order_id,
      null,
      order,
      'Payment order created and issued from payment request. Order does not affect cashbox balance.'
    );
    writeAuditLog(
      AUDIT_ACTIONS.UPDATE,
      SHEET_NAMES.PAYMENT_REQUESTS,
      request.request_id,
      request,
      updatedRequest,
      'Payment request converted to payment order.'
    );

    return order;
  } finally {
    lock.releaseLock();
  }
}

function assertRequestCanCreatePaymentOrder_(request) {
  if (!request) {
    throw new Error('Payment Request record is required.');
  }
  if ([
    REQUEST_STATUSES.CANCELLED,
    REQUEST_STATUSES.REJECTED,
    REQUEST_STATUSES.RETURNED_FOR_CORRECTION,
    REQUEST_STATUSES.ORDER_CREATED,
    REQUEST_STATUSES.CONVERTED_TO_ORDER,
    REQUEST_STATUSES.PAID
  ].indexOf(request.status) !== -1) {
    throw new Error('Payment Request status cannot create payment order: ' + request.status);
  }

  assertPositiveAmount(request.amount);
  assertActiveCurrency(request.currency);

  const withinLimit = isPaymentRequestWithinDirectLimit_(request);
  if (withinLimit) {
    assertEntityStatus(request, [
      REQUEST_STATUSES.SUBMITTED,
      REQUEST_STATUSES.CASHIER_REVIEW,
      REQUEST_STATUSES.IN_REVIEW,
      REQUEST_STATUSES.APPROVED,
      REQUEST_STATUSES.ESCALATED_TO_ORDER,
      REQUEST_STATUSES.APPROVED_FOR_DIRECT_PAYMENT
    ], 'Payment Request');
    return;
  }

  assertEntityStatus(request, [
    REQUEST_STATUSES.APPROVED
  ], 'Payment Request');
}

function requirePaymentOrderCreatorForRequest_(request) {
  const withinLimit = isPaymentRequestWithinDirectLimit_(request);
  if (withinLimit) {
    try {
      return requireActiveUserWithRole_(PAYMENT_ORDER_CREATOR_ROLES_);
    } catch (error) {
      assertCurrentUserCanOwnRequest_(request);
      return getCurrentUser();
    }
  }
  return requireActiveUserWithRole_(PAYMENT_ORDER_CREATOR_ROLES_);
}

function createDirectPaymentOrder(orderData) {
  const currentUser = requireActiveUserWithRole_(DIRECT_PAYMENT_ORDER_CREATOR_ROLES_);
  const data = orderData || {};

  assertRequiredFields(data, [
    'cashbox_id',
    'pay_to_name',
    'amount_ordered',
    'currency',
    'purpose'
  ]);
  assertNonEmptyString(data.pay_to_name, 'pay_to_name');
  assertNonEmptyString(data.purpose, 'purpose');
  assertPositiveAmount(data.amount_ordered);
  assertActiveCurrency(data.currency);
  assertActiveCashbox(data.cashbox_id);
  assertCashboxAccess(data.cashbox_id);

  const priority = data.priority || REQUEST_PRIORITIES.NORMAL;
  const documentStatus = data.document_status || DOCUMENT_STATUSES.NONE;
  assertAllowedValue(priority, objectValues_(REQUEST_PRIORITIES), 'priority');
  assertAllowedValue(documentStatus, [
    DOCUMENT_STATUSES.NONE,
    DOCUMENT_STATUSES.MISSING,
    DOCUMENT_STATUSES.ATTACHED
  ], 'document_status');

  const order = {
    order_id: generateId_('ORD'),
    created_at: getCurrentTimestamp_(),
    created_by: currentUser.email,
    source_request_id: '',
    linked_request_id: '',
    order_type: ORDER_TYPES.DIRECT_ORDER,
    cashbox_id: data.cashbox_id,
    pay_to_name: String(data.pay_to_name).trim(),
    amount_ordered: Number(data.amount_ordered),
    amount_paid: 0,
    currency: data.currency,
    purpose: String(data.purpose).trim(),
    description: data.description || '',
    due_date: data.due_date || '',
    priority: priority,
    status: ORDER_STATUSES.DRAFT,
    issued_by: '',
    issued_at: '',
    executed_by: '',
    executed_at: '',
    linked_cash_event_id: '',
    document_status: documentStatus,
    cancellation_reason: '',
    cashier_rejection_reason: '',
    updated_at: ''
  };

  appendRecord(SHEET_NAMES.PAYMENT_ORDERS, order);
  writeAuditLog(
    AUDIT_ACTIONS.CREATE,
    SHEET_NAMES.PAYMENT_ORDERS,
    order.order_id,
    null,
    order,
    'Direct payment order created. Order does not affect cashbox balance.'
  );

  return order;
}

function updateDraftPaymentOrder(orderId, orderData) {
  const currentUser = requireActiveUserWithRole_(DIRECT_PAYMENT_ORDER_CREATOR_ROLES_);
  assertNonEmptyString(orderId, 'orderId');
  const data = orderData || {};
  const match = getPaymentOrderMatchOrThrow_(orderId);
  assertEntityStatus(match.record, [ORDER_STATUSES.DRAFT], 'Payment Order');

  assertRequiredFields(data, [
    'cashbox_id',
    'pay_to_name',
    'amount_ordered',
    'currency',
    'purpose'
  ]);
  assertNonEmptyString(data.pay_to_name, 'pay_to_name');
  assertNonEmptyString(data.purpose, 'purpose');
  assertPositiveAmount(data.amount_ordered);
  assertActiveCurrency(data.currency);
  assertActiveCashbox(data.cashbox_id);
  assertCashboxAccess(data.cashbox_id);

  const documentStatus = data.document_status || match.record.document_status || DOCUMENT_STATUSES.NONE;
  assertAllowedValue(documentStatus, [
    DOCUMENT_STATUSES.NONE,
    DOCUMENT_STATUSES.MISSING,
    DOCUMENT_STATUSES.ATTACHED
  ], 'document_status');

  return updatePaymentOrderWithAudit_(
    orderId,
    {
      cashbox_id: data.cashbox_id,
      pay_to_name: String(data.pay_to_name).trim(),
      amount_ordered: Number(data.amount_ordered),
      currency: data.currency,
      purpose: String(data.purpose).trim(),
      description: data.description || '',
      due_date: data.due_date || '',
      document_status: documentStatus,
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.UPDATE,
    'Draft payment order updated by ' + currentUser.email + '.'
  );
}

function issuePaymentOrder(orderId) {
  const currentUser = requireActiveUserWithRole_(PAYMENT_ORDER_ISSUER_ROLES_);
  assertNonEmptyString(orderId, 'orderId');

  const match = getPaymentOrderMatchOrThrow_(orderId);
  assertEntityStatus(match.record, [ORDER_STATUSES.DRAFT], 'Payment Order');
  const now = getCurrentTimestamp_();

  return updatePaymentOrderWithAudit_(
    orderId,
    {
      status: ORDER_STATUSES.WAITING_PAYMENT,
      issued_by: currentUser.email,
      issued_at: now,
      updated_at: now
    },
    AUDIT_ACTIONS.SUBMIT,
    'Payment order approved. Approved order still does not affect balance and must be sent to cashier before payment.'
  );
}

function sendPaymentOrderToCashier(orderId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const currentUser = requireActiveUserWithRole_(PAYMENT_ORDER_SEND_TO_CASHIER_ROLES_);
    assertNonEmptyString(orderId, 'orderId');

    const match = getPaymentOrderMatchOrThrow_(orderId);
    const order = match.record;
    assertEntityStatus(order, [
      ORDER_STATUSES.WAITING_PAYMENT,
      ORDER_STATUSES.PARTIALLY_PAID
    ], 'Payment Order');

    const existingPending = findPendingPaymentOutflowForOrder_(order.order_id);
    if (existingPending) {
      return {
        paymentOrder: order,
        pendingPayment: existingPending,
        alreadyPending: true
      };
    }

    const amountOrdered = Number(order.amount_ordered);
    const amountPaid = Number(order.amount_paid || 0);
    const remainingAmount = amountOrdered - amountPaid;
    assertPositiveAmount(remainingAmount, 'remainingAmount');
    assertActiveCashbox(order.cashbox_id);
    assertCashboxAccess(order.cashbox_id);
    assertActiveCurrency(order.currency);

    const now = getCurrentTimestamp_();
    const pendingPayment = {
      event_id: generateId_('CEV'),
      created_at: now,
      created_by: currentUser.email,
      event_date: now,
      event_type: CASH_EVENT_TYPES.CASH_OUTFLOW,
      cashbox_id: order.cashbox_id,
      currency: order.currency,
      direction: 'OUT',
      amount: remainingAmount,
      linked_request_id: order.linked_request_id || order.source_request_id || '',
      linked_order_id: order.order_id,
      partner_name: order.pay_to_name,
      description: buildCashPaymentDescription_(order.purpose, 'Pending ISPLATA po nalogu ' + order.order_id),
      document_status: DOCUMENT_STATUSES.MISSING,
      status: CASH_EVENT_STATUSES.SUBMITTED,
      posted_by: '',
      posted_at: '',
      locked_by: '',
      locked_at: '',
      reversal_of_event_id: '',
      updated_at: ''
    };

    appendRecord(SHEET_NAMES.CASH_EVENTS, pendingPayment);
    const orderAfter = updatePaymentOrderWithAudit_(
      order.order_id,
      {
        status: ORDER_STATUSES.WAITING_PAYMENT,
        linked_cash_event_id: pendingPayment.event_id,
        updated_at: now
      },
      AUDIT_ACTIONS.SUBMIT,
      'Payment order sent to cashier as pending ISPLATA. Pending cash event does not affect balance.'
    );

    writeAuditLog(
      AUDIT_ACTIONS.CREATE,
      SHEET_NAMES.CASH_EVENTS,
      pendingPayment.event_id,
      null,
      pendingPayment,
      'Pending ISPLATA created from payment order ' + order.order_id + '.'
    );

    return {
      paymentOrder: orderAfter,
      pendingPayment: pendingPayment,
      alreadyPending: false
    };
  } finally {
    lock.releaseLock();
  }
}

function cancelPaymentOrder(orderId, reason) {
  requireActiveUserWithRole_(PAYMENT_ORDER_CANCEL_ROLES_);
  assertNonEmptyString(orderId, 'orderId');
  assertNonEmptyString(reason, 'reason');

  const match = getPaymentOrderMatchOrThrow_(orderId);
  if (match.record.status === ORDER_STATUSES.PAID || match.record.status === ORDER_STATUSES.CLOSED) {
    throw new Error('Paid or closed payment order cannot be cancelled directly.');
  }
  if (match.record.status === ORDER_STATUSES.PARTIALLY_PAID) {
    throw new Error('Partial payment cancellation/reversal belongs to a later correction workflow.');
  }

  return updatePaymentOrderWithAudit_(
    orderId,
    {
      status: ORDER_STATUSES.CANCELLED,
      cancellation_reason: String(reason).trim(),
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.CANCEL,
    'Payment order cancelled.'
  );
}

function rejectPaymentOrderByCashier(orderId, reason) {
  requireActiveUserWithRole_(PAYMENT_ORDER_CASHIER_REJECT_ROLES_);
  assertNonEmptyString(orderId, 'orderId');
  assertNonEmptyString(reason, 'reason');

  const match = getPaymentOrderMatchOrThrow_(orderId);
  assertEntityStatus(match.record, [ORDER_STATUSES.WAITING_PAYMENT], 'Payment Order');

  return updatePaymentOrderWithAudit_(
    orderId,
    {
      status: ORDER_STATUSES.REJECTED_BY_CASHIER,
      cashier_rejection_reason: String(reason).trim(),
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.REJECT,
    'Payment order rejected by cashier.'
  );
}

function getPaymentOrderById(orderId) {
  const match = findRecordById(SHEET_NAMES.PAYMENT_ORDERS, 'order_id', orderId);
  return match ? match.record : null;
}

function updatePaymentOrderAfterExecution(orderId, executionData) {
  assertNonEmptyString(orderId, 'orderId');
  const data = executionData || {};
  const updates = {};

  [
    'amount_paid',
    'executed_by',
    'executed_at',
    'linked_cash_event_id',
    'status',
    'updated_at'
  ].forEach(function(field) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      updates[field] = data[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new Error('No payment order execution updates provided.');
  }

  return updateRecordById(
    SHEET_NAMES.PAYMENT_ORDERS,
    'order_id',
    orderId,
    updates
  );
}

function listOrdersWaitingForPayment() {
  requireActiveUserWithRole_(PAYMENT_ORDER_WAITING_LIST_ROLES_);

  return listRecords(SHEET_NAMES.PAYMENT_ORDERS)
    .filter(function(order) {
      return order.status === ORDER_STATUSES.WAITING_PAYMENT ||
        order.status === ORDER_STATUSES.PARTIALLY_PAID;
    })
    .sort(function(left, right) {
      const leftUrgent = left.priority === REQUEST_PRIORITIES.URGENT ? 1 : 0;
      const rightUrgent = right.priority === REQUEST_PRIORITIES.URGENT ? 1 : 0;
      if (leftUrgent !== rightUrgent) {
        return rightUrgent - leftUrgent;
      }

      const leftDue = toTime_(left.due_date) || toTime_(left.created_at);
      const rightDue = toTime_(right.due_date) || toTime_(right.created_at);
      return leftDue - rightDue;
    });
}

function findPendingPaymentOutflowForOrder_(orderId) {
  const pending = listRecords(SHEET_NAMES.CASH_EVENTS, {
    linked_order_id: orderId,
    status: CASH_EVENT_STATUSES.SUBMITTED
  }).filter(function(event) {
    return event.event_type === CASH_EVENT_TYPES.CASH_OUTFLOW;
  });
  return pending.length ? pending[0] : null;
}

function listPendingPaymentOrderOutflows(filters) {
  requireActiveUserWithRole_(PAYMENT_ORDER_WAITING_LIST_ROLES_);
  const scoped = filters || {};
  return listRecords(SHEET_NAMES.CASH_EVENTS, {
    status: CASH_EVENT_STATUSES.SUBMITTED
  }).filter(function(event) {
    return event.event_type === CASH_EVENT_TYPES.CASH_OUTFLOW &&
      event.linked_order_id &&
      (!scoped.cashbox_id || event.cashbox_id === scoped.cashbox_id) &&
      (!scoped.currency || event.currency === scoped.currency);
  }).map(function(event) {
    const order = getPaymentOrderById(event.linked_order_id) || {};
    return {
      pending_payment_id: event.event_id,
      event_id: event.event_id,
      created_at: event.created_at,
      event_date: event.event_date,
      cashbox_id: event.cashbox_id,
      currency: event.currency,
      amount: Number(event.amount || 0),
      status: event.status,
      linked_order_id: event.linked_order_id,
      linked_request_id: event.linked_request_id || '',
      partner_name: event.partner_name || order.pay_to_name || '',
      description: event.description || order.purpose || '',
      order_id: order.order_id || event.linked_order_id,
      order_status: order.status || '',
      purpose: order.purpose || event.description || '',
      pay_to_name: order.pay_to_name || event.partner_name || ''
    };
  }).sort(function(left, right) {
    return toTime_(right.created_at || right.event_date) - toTime_(left.created_at || left.event_date);
  });
}

function getPaymentOrderTimeline(orderId) {
  requireActiveUserWithRole_(PAYMENT_ORDER_LIST_ROLES_);
  assertNonEmptyString(orderId, 'orderId');
  const order = getPaymentOrderById(orderId);
  if (!order) {
    throw new Error('Payment Order not found: ' + orderId);
  }
  const events = [];
  events.push({
    label: 'Nalog kreiran',
    at: order.created_at,
    by: order.created_by,
    tone: ''
  });
  if (order.issued_at || order.status !== ORDER_STATUSES.DRAFT) {
    events.push({
      label: 'Nalog odobren',
      at: order.issued_at || order.created_at,
      by: order.issued_by || order.created_by,
      tone: ''
    });
  }

  listRecords(SHEET_NAMES.AUDIT_LOG).filter(function(log) {
    return String(log.entity_type) === String(SHEET_NAMES.PAYMENT_ORDERS) &&
      String(log.entity_id) === String(orderId);
  }).forEach(function(log) {
    const comment = String(log.comment || '');
    if (comment.indexOf('sent to cashier as pending ISPLATA') !== -1) {
      events.push({
        label: 'Poslato blagajni na isplatu',
        at: log.timestamp,
        by: log.user,
        tone: 'warning'
      });
    }
    if (comment.indexOf('Insufficient balance') !== -1) {
      events.push({
        label: 'Nedovoljno sredstava za isplatu',
        at: log.timestamp,
        by: log.user,
        tone: 'danger'
      });
    }
    if (comment.indexOf('cash payment execution') !== -1 || comment.indexOf('Pending ISPLATA executed') !== -1) {
      events.push({
        label: 'Stvarna isplata izvršena',
        at: log.timestamp,
        by: log.user,
        tone: 'success'
      });
    }
  });

  listRecords(SHEET_NAMES.CASH_EVENTS, {
    linked_order_id: orderId
  }).filter(function(event) {
    return event.event_type === CASH_EVENT_TYPES.CASH_OUTFLOW;
  }).forEach(function(event) {
    if (event.status === CASH_EVENT_STATUSES.SUBMITTED) {
      events.push({
        label: 'Pending ISPLATA čeka blagajnika',
        at: event.created_at,
        by: event.created_by,
        tone: 'warning'
      });
    }
    if (event.status === CASH_EVENT_STATUSES.POSTED || event.status === CASH_EVENT_STATUSES.LOCKED) {
      events.push({
        label: 'CASH_OUTFLOW proknjižen',
        at: event.posted_at || event.created_at,
        by: event.posted_by || event.created_by,
        tone: 'success'
      });
    }
  });

  if (order.status === ORDER_STATUSES.REJECTED_BY_CASHIER) {
    events.push({
      label: 'Odbijen od blagajne',
      at: order.updated_at || order.created_at,
      by: order.executed_by || order.issued_by || order.created_by,
      tone: 'danger'
    });
  }
  if (order.status === ORDER_STATUSES.CANCELLED) {
    events.push({
      label: 'Otkazan',
      at: order.updated_at || order.created_at,
      by: order.issued_by || order.created_by,
      tone: 'danger'
    });
  }

  return events.sort(function(left, right) {
    return toTime_(left.at) - toTime_(right.at);
  });
}

function listPaymentOrders(filters) {
  requireActiveUserWithRole_(PAYMENT_ORDER_LIST_ROLES_);

  const allowedFilters = [
    'status',
    'cashbox_id',
    'currency',
    'order_type',
    'source_request_id'
  ];
  const activeFilters = {};
  Object.keys(filters || {}).forEach(function(field) {
    if (allowedFilters.indexOf(field) !== -1) {
      activeFilters[field] = filters[field];
    }
  });

  return listRecords(SHEET_NAMES.PAYMENT_ORDERS, activeFilters);
}

function markPaymentOrderClosed(orderId, reason) {
  assertNonEmptyString(orderId, 'orderId');
  const match = getPaymentOrderMatchOrThrow_(orderId);
  if (match.record.status === ORDER_STATUSES.CLOSED) {
    return match.record;
  }
  assertEntityStatus(match.record, [ORDER_STATUSES.PAID], 'Payment Order');
  return updatePaymentOrderWithAudit_(
    orderId,
    {
      status: ORDER_STATUSES.CLOSED,
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.UPDATE,
    reason || 'Payment order closed after completed payment.'
  );
}

function getPaymentOrderMatchOrThrow_(orderId) {
  const match = findRecordById(SHEET_NAMES.PAYMENT_ORDERS, 'order_id', orderId);
  if (!match) {
    throw new Error('Payment Order not found: ' + orderId);
  }
  return match;
}

function updatePaymentOrderWithAudit_(orderId, updates, action, comment) {
  const beforeMatch = getPaymentOrderMatchOrThrow_(orderId);
  const updated = updateRecordById(
    SHEET_NAMES.PAYMENT_ORDERS,
    'order_id',
    orderId,
    updates
  );

  writeAuditLog(
    action,
    SHEET_NAMES.PAYMENT_ORDERS,
    orderId,
    beforeMatch.record,
    updated,
    comment
  );

  return updated;
}

function assertNoActiveOrderForRequest_(requestId) {
  const existingOrders = listRecords(SHEET_NAMES.PAYMENT_ORDERS, {
    source_request_id: requestId
  });
  const activeOrders = existingOrders.filter(function(order) {
    return order.status !== ORDER_STATUSES.CANCELLED;
  });

  if (activeOrders.length > 0) {
    throw new Error('Payment Request already has active payment order: ' + activeOrders[0].order_id);
  }
}

function buildOrderDescriptionFromRequest_(requestDescription, orderDescription) {
  if (requestDescription && orderDescription) {
    return requestDescription + '\n' + orderDescription;
  }
  return orderDescription || requestDescription || '';
}
