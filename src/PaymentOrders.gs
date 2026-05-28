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

function createPaymentOrderFromRequest(requestId, orderData) {
  const currentUser = requireActiveUserWithRole_(PAYMENT_ORDER_CREATOR_ROLES_);
  assertNonEmptyString(requestId, 'requestId');
  const data = orderData || {};

  const requestMatch = getPaymentRequestMatchOrThrow_(requestId);
  const request = requestMatch.record;
  assertEntityStatus(request, [REQUEST_STATUSES.APPROVED], 'Payment Request');

  if (request.linked_order_id) {
    throw new Error('Payment Request already has linked payment order: ' + request.linked_order_id);
  }
  assertNoActiveOrderForRequest_(requestId);

  assertRequiredFields(data, ['cashbox_id']);
  assertActiveCashbox(data.cashbox_id);

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

  assertNonEmptyString(order.pay_to_name, 'pay_to_name');
  assertNonEmptyString(order.purpose, 'purpose');

  appendRecord(SHEET_NAMES.PAYMENT_ORDERS, order);

  const updatedRequest = updateRecordById(
    SHEET_NAMES.PAYMENT_REQUESTS,
    'request_id',
    request.request_id,
    {
      status: REQUEST_STATUSES.CONVERTED_TO_ORDER,
      linked_order_id: order.order_id,
      updated_at: now
    }
  );

  writeAuditLog(
    AUDIT_ACTIONS.CREATE,
    SHEET_NAMES.PAYMENT_ORDERS,
    order.order_id,
    null,
    order,
    'Payment order created from approved request. Order does not affect cashbox balance.'
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
    'Payment order issued to cash desk. Issued order still does not affect balance.'
  );
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
  throw new Error('Payment Order closing is handled after payment execution in Task 05 or later.');
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
