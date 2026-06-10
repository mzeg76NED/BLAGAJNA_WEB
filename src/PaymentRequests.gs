/**
 * Payment Request is only a request.
 * It never authorizes payment and never affects cashbox balance.
 */
const PAYMENT_REQUEST_CREATOR_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.CASHIER,
  USER_ROLES.APPROVER,
  USER_ROLES.REQUESTER
]);

const PAYMENT_REQUEST_REVIEWER_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.APPROVER
]);

const PAYMENT_REQUEST_LIST_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.CASHIER,
  USER_ROLES.APPROVER,
  USER_ROLES.REQUESTER,
  USER_ROLES.VIEWER
]);

const PAYMENT_REQUEST_OPEN_REVIEW_STATUSES_ = Object.freeze([
  REQUEST_STATUSES.SUBMITTED,
  REQUEST_STATUSES.IN_REVIEW,
  REQUEST_STATUSES.CASHIER_REVIEW,
  REQUEST_STATUSES.ESCALATED_TO_ORDER,
  REQUEST_STATUSES.APPROVED
]);

function createPaymentRequest(data) {
  const currentUser = requireActiveUserWithRole_(PAYMENT_REQUEST_CREATOR_ROLES_);
  const requestData = data || {};

  assertRequiredFields(requestData, [
    'requested_for_name',
    'amount',
    'currency',
    'purpose'
  ]);
  assertNonEmptyString(requestData.requested_for_name, 'requested_for_name');
  assertNonEmptyString(requestData.purpose, 'purpose');
  assertPositiveAmount(requestData.amount);
  assertActiveCurrency(requestData.currency);

  const priority = requestData.priority || REQUEST_PRIORITIES.NORMAL;
  assertAllowedValue(priority, objectValues_(REQUEST_PRIORITIES), 'priority');

  const status = requestData.status || REQUEST_STATUSES.DRAFT;
  assertAllowedValue(status, [REQUEST_STATUSES.DRAFT], 'status');

  const cashboxId = requestData.preferred_cashbox_id || requestData.cashbox_id || '';
  if (cashboxId) {
    assertActiveCashbox(cashboxId);
    assertCashboxAccess(cashboxId);
  }

  const approvalPath = getPaymentRequestApprovalPath_(requestData.amount, requestData.currency);
  const now = getCurrentTimestamp_();
  const record = {
    request_id: generateId_('REQ'),
    created_at: now,
    created_by: currentUser.email,
    requester_user_id: requestData.requester_user_id || currentUser.user_id || '',
    requested_for_name: String(requestData.requested_for_name).trim(),
    amount: Number(requestData.amount),
    currency: requestData.currency,
    purpose: String(requestData.purpose).trim(),
    description: requestData.description || '',
    preferred_cashbox_id: cashboxId,
    needed_by_date: requestData.needed_by_date || '',
    priority: priority,
    status: REQUEST_STATUSES.DRAFT,
    reviewed_by: '',
    reviewed_at: '',
    rejection_reason: '',
    linked_order_id: '',
    approval_path: approvalPath,
    direct_cash_event_id: '',
    returned_for_correction_reason: '',
    cancellation_reason: '',
    document_status: requestData.document_status || DOCUMENT_STATUSES.NONE,
    updated_at: ''
  };

  assertAllowedValue(record.document_status, [
    DOCUMENT_STATUSES.NONE,
    DOCUMENT_STATUSES.MISSING,
    DOCUMENT_STATUSES.ATTACHED
  ], 'document_status');

  appendRecord(SHEET_NAMES.PAYMENT_REQUESTS, record);
  writeAuditLog(
    AUDIT_ACTIONS.CREATE,
    SHEET_NAMES.PAYMENT_REQUESTS,
    record.request_id,
    null,
    record,
    'Payment request created. Request does not affect cashbox balance.'
  );

  return record;
}

function submitPaymentRequest(requestId) {
  assertNonEmptyString(requestId, 'requestId');
  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, [REQUEST_STATUSES.DRAFT]);
  assertCurrentUserCanOwnRequest_(match.record);
  assertPaymentRequestReadyForSubmit_(match.record);

  const submitted = updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.SUBMITTED,
      approval_path: getPaymentRequestApprovalPath_(match.record.amount, match.record.currency),
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.SUBMIT,
    'Payment request submitted for review.'
  );

  if (isPaymentRequestWithinDirectLimit_(submitted)) {
    createPaymentOrderFromRequest(requestId, {
      cashbox_id: submitted.preferred_cashbox_id || getDefaultCashboxIdForCurrentUser_(),
      auto_from_request: true
    });
    return getPaymentRequestById(requestId);
  }

  return updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.ESCALATED_TO_ORDER,
      approval_path: PAYMENT_REQUEST_APPROVAL_PATHS.PAYMENT_ORDER,
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.UPDATE,
    'Payment request exceeds limit and waits for higher approval before payment order creation.'
  );
}

function updatePaymentRequest(requestId, data) {
  assertNonEmptyString(requestId, 'requestId');
  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, [REQUEST_STATUSES.DRAFT]);
  assertCurrentUserCanOwnRequest_(match.record);

  const requestData = data || {};
  const updates = {};

  if (requestData.requested_for_name !== undefined) {
    assertNonEmptyString(requestData.requested_for_name, 'requested_for_name');
    updates.requested_for_name = String(requestData.requested_for_name).trim();
  }
  if (requestData.amount !== undefined) {
    assertPositiveAmount(requestData.amount);
    updates.amount = Number(requestData.amount);
  }
  if (requestData.currency !== undefined) {
    assertActiveCurrency(requestData.currency);
    updates.currency = requestData.currency;
  }
  if (requestData.purpose !== undefined) {
    assertNonEmptyString(requestData.purpose, 'purpose');
    updates.purpose = String(requestData.purpose).trim();
  }
  if (requestData.description !== undefined) {
    updates.description = requestData.description || '';
  }
  if (requestData.preferred_cashbox_id !== undefined || requestData.cashbox_id !== undefined) {
    const cashboxId = requestData.preferred_cashbox_id || requestData.cashbox_id || '';
    if (cashboxId) {
      assertActiveCashbox(cashboxId);
      assertCashboxAccess(cashboxId);
    }
    updates.preferred_cashbox_id = cashboxId;
  }
  if (requestData.needed_by_date !== undefined) {
    updates.needed_by_date = requestData.needed_by_date || '';
  }
  if (requestData.priority !== undefined) {
    const priority = requestData.priority || REQUEST_PRIORITIES.NORMAL;
    assertAllowedValue(priority, objectValues_(REQUEST_PRIORITIES), 'priority');
    updates.priority = priority;
  }
  if (requestData.document_status !== undefined) {
    assertAllowedValue(requestData.document_status, [
      DOCUMENT_STATUSES.NONE,
      DOCUMENT_STATUSES.MISSING,
      DOCUMENT_STATUSES.ATTACHED
    ], 'document_status');
    updates.document_status = requestData.document_status;
  }

  const nextAmount = updates.amount !== undefined ? updates.amount : match.record.amount;
  const nextCurrency = updates.currency !== undefined ? updates.currency : match.record.currency;
  updates.approval_path = getPaymentRequestApprovalPath_(nextAmount, nextCurrency);
  updates.updated_at = getCurrentTimestamp_();

  return updatePaymentRequestWithAudit_(
    requestId,
    updates,
    AUDIT_ACTIONS.UPDATE,
    'Payment request draft updated. Request does not affect cashbox balance.'
  );
}

function markPaymentRequestInReview(requestId) {
  assertNonEmptyString(requestId, 'requestId');
  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, [REQUEST_STATUSES.SUBMITTED]);
  requireActiveUserWithRole_(PAYMENT_REQUEST_REVIEWER_ROLES_);

  return updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.CASHIER_REVIEW,
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.UPDATE,
    'Payment request marked as in review.'
  );
}

function approvePaymentRequest(requestId, approvalData) {
  assertNonEmptyString(requestId, 'requestId');
  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, PAYMENT_REQUEST_OPEN_REVIEW_STATUSES_);

  const currentUser = requireActiveUserWithRole_(PAYMENT_REQUEST_REVIEWER_ROLES_);
  const data = approvalData || {};
  const now = getCurrentTimestamp_();
  const approvalPath = getPaymentRequestApprovalPath_(match.record.amount, match.record.currency);

  const approved = updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.APPROVED,
      approval_path: approvalPath,
      reviewed_by: data.reviewed_by || currentUser.email,
      reviewed_at: now,
      rejection_reason: '',
      updated_at: now
    },
    AUDIT_ACTIONS.APPROVE,
    'Payment request approved. Approval does not create payment order and does not affect balance.'
  );

  createPaymentOrderFromRequest(requestId, {
    cashbox_id: data.cashbox_id || approved.preferred_cashbox_id || getDefaultCashboxIdForCurrentUser_(),
    auto_from_request: true
  });
  return getPaymentRequestById(requestId);
}

function approvePaymentRequestForDirectPayment(requestId) {
  // Deprecated / emergency-only compatibility stub. Regular Payment Request flow must create Payment Order.
  throw new Error('Deprecated: Payment Request cannot be approved for direct payment. Create Payment Order from request instead.');
}

function rejectPaymentRequest(requestId, reason) {
  assertNonEmptyString(requestId, 'requestId');
  assertNonEmptyString(reason, 'reason');

  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, PAYMENT_REQUEST_OPEN_REVIEW_STATUSES_);

  const currentUser = requireActiveUserWithRole_(PAYMENT_REQUEST_REVIEWER_ROLES_);
  const now = getCurrentTimestamp_();

  return updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.REJECTED,
      reviewed_by: currentUser.email,
      reviewed_at: now,
      rejection_reason: String(reason).trim(),
      updated_at: now
    },
    AUDIT_ACTIONS.REJECT,
    'Payment request rejected.'
  );
}

function returnPaymentRequestForCorrection(requestId, note) {
  assertNonEmptyString(requestId, 'requestId');
  assertNonEmptyString(note, 'note');

  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, PAYMENT_REQUEST_OPEN_REVIEW_STATUSES_);

  const currentUser = requireActiveUserWithRole_(PAYMENT_REQUEST_REVIEWER_ROLES_);
  const now = getCurrentTimestamp_();
  return updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.RETURNED_FOR_CORRECTION,
      reviewed_by: currentUser.email,
      reviewed_at: now,
      returned_for_correction_reason: String(note).trim(),
      updated_at: now
    },
    AUDIT_ACTIONS.UPDATE,
    'Payment request returned for correction.'
  );
}

function cancelPaymentRequest(requestId, reason) {
  assertNonEmptyString(requestId, 'requestId');

  const match = getPaymentRequestMatchOrThrow_(requestId);
  if ([
    REQUEST_STATUSES.CONVERTED_TO_ORDER,
    REQUEST_STATUSES.ORDER_CREATED,
    REQUEST_STATUSES.PAID
  ].indexOf(match.record.status) !== -1) {
    throw new Error('Payment Request with order or payment cannot be cancelled.');
  }
  if ([
    REQUEST_STATUSES.APPROVED,
    REQUEST_STATUSES.ESCALATED_TO_ORDER
  ].indexOf(match.record.status) !== -1) {
    assertNonEmptyString(reason, 'reason');
  }

  assertCurrentUserCanOwnRequest_(match.record);

  return updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.CANCELLED,
      cancellation_reason: reason || '',
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.CANCEL,
    reason || 'Payment request cancelled.'
  );
}

function getPaymentRequestById(requestId) {
  const match = findRecordById(SHEET_NAMES.PAYMENT_REQUESTS, 'request_id', requestId);
  return match ? match.record : null;
}

function listMyPaymentRequests() {
  const currentUser = getCurrentUser();
  if (!currentUser.email) {
    return [];
  }

  return sortRequestsNewestFirst_(
    listRecords(SHEET_NAMES.PAYMENT_REQUESTS, { created_by: currentUser.email })
  );
}

function listRequestsForApproval() {
  requireActiveUserWithRole_(PAYMENT_REQUEST_REVIEWER_ROLES_);

  return listRecords(SHEET_NAMES.PAYMENT_REQUESTS)
    .filter(function(record) {
      return PAYMENT_REQUEST_OPEN_REVIEW_STATUSES_.indexOf(record.status) !== -1;
    })
    .sort(function(left, right) {
      const leftUrgent = left.priority === REQUEST_PRIORITIES.URGENT ? 1 : 0;
      const rightUrgent = right.priority === REQUEST_PRIORITIES.URGENT ? 1 : 0;
      if (leftUrgent !== rightUrgent) {
        return rightUrgent - leftUrgent;
      }
      return toTime_(right.created_at) - toTime_(left.created_at);
    });
}

function listPaymentRequests(filters) {
  const currentUser = assertUserHasRole(PAYMENT_REQUEST_LIST_ROLES_);
  const data = filters || {};
  const activeFilters = {};
  [
    'status',
    'currency',
    'preferred_cashbox_id',
    'cashbox_id',
    'approval_path',
    'linked_order_id'
  ].forEach(function(field) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      activeFilters[field] = data[field];
    }
  });

  let records = listRecords(SHEET_NAMES.PAYMENT_REQUESTS);
  if (currentUser.role === USER_ROLES.REQUESTER) {
    records = records.filter(function(record) {
      return record.created_by === currentUser.email || record.requester_user_id === currentUser.user_id;
    });
  }

  records = records.filter(function(record) {
    return Object.keys(activeFilters).every(function(field) {
      if (field === 'cashbox_id') {
        return record.preferred_cashbox_id === activeFilters[field] || record.cashbox_id === activeFilters[field];
      }
      return record[field] === activeFilters[field];
    });
  });

  return sortRequestsNewestFirst_(records).map(enrichPaymentRequestForUi_);
}

function convertApprovedRequestToOrderPlaceholder(requestId, orderData) {
  assertNonEmptyString(requestId, 'requestId');
  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, [
    REQUEST_STATUSES.APPROVED,
    REQUEST_STATUSES.SUBMITTED,
    REQUEST_STATUSES.CASHIER_REVIEW,
    REQUEST_STATUSES.ESCALATED_TO_ORDER
  ]);

  return createPaymentOrderFromRequest(requestId, orderData || {});
}

function getPaymentRequestMatchOrThrow_(requestId) {
  const match = findRecordById(SHEET_NAMES.PAYMENT_REQUESTS, 'request_id', requestId);
  if (!match) {
    throw new Error('Payment Request not found: ' + requestId);
  }
  return match;
}

function requireActiveUserWithRole_(allowedRoles) {
  assertCurrentUserActive();
  assertUserHasRole(allowedRoles);
  return getCurrentUser();
}

function assertRequestStatus_(request, allowedStatuses) {
  assertAllowedValue(request.status, allowedStatuses, 'status');
}

function assertCurrentUserCanOwnRequest_(request) {
  const currentUser = getCurrentUser();
  assertCurrentUserActive();

  if (request.created_by === currentUser.email || request.requester_user_id === currentUser.user_id) {
    return;
  }

  assertUserHasRole(PAYMENT_REQUEST_REVIEWER_ROLES_);
}

function assertPaymentRequestReadyForSubmit_(request) {
  assertNonEmptyString(request.requested_for_name, 'requested_for_name');
  assertPositiveAmount(request.amount);
  assertActiveCurrency(request.currency);
  assertNonEmptyString(request.purpose, 'purpose');
  assertNonEmptyString(request.description, 'description');
  if (String(request.description).trim().length < 10) {
    throw new Error('description must contain at least 10 characters.');
  }
  if (request.preferred_cashbox_id) {
    assertActiveCashbox(request.preferred_cashbox_id);
    assertCashboxAccess(request.preferred_cashbox_id);
  }
}

function getPaymentRequestApprovalPath_(amount, currency) {
  const numericAmount = Number(amount || 0);
  if (!isFinite(numericAmount) || numericAmount <= 0) {
    return PAYMENT_REQUEST_APPROVAL_PATHS.UNDECIDED;
  }
  return numericAmount <= getPaymentRequestDirectLimit_(currency)
    ? PAYMENT_REQUEST_APPROVAL_PATHS.AUTO_ORDER
    : PAYMENT_REQUEST_APPROVAL_PATHS.PAYMENT_ORDER;
}

function isPaymentRequestWithinDirectLimit_(request) {
  return Number(request.amount || 0) > 0 &&
    Number(request.amount || 0) <= getPaymentRequestDirectLimit_(request.currency);
}

function getPaymentRequestDirectLimit_(currency) {
  const rules = PAYMENT_REQUEST_APPROVAL_RULES[String(currency || 'RSD')] ||
    PAYMENT_REQUEST_APPROVAL_RULES.RSD;
  return Number(rules.cashierDirectApprovalLimit || 0);
}

function enrichPaymentRequestForUi_(record) {
  const result = Object.assign({}, record);
  result.approval_path = result.approval_path ||
    getPaymentRequestApprovalPath_(result.amount, result.currency);
  result.cashbox_id = result.cashbox_id || result.preferred_cashbox_id || '';
  return result;
}

function updatePaymentRequestWithAudit_(requestId, updates, action, comment) {
  const beforeMatch = getPaymentRequestMatchOrThrow_(requestId);
  const updated = updateRecordById(
    SHEET_NAMES.PAYMENT_REQUESTS,
    'request_id',
    requestId,
    updates
  );

  writeAuditLog(
    action,
    SHEET_NAMES.PAYMENT_REQUESTS,
    requestId,
    beforeMatch.record,
    updated,
    comment
  );

  return updated;
}

function sortRequestsNewestFirst_(records) {
  return records.sort(function(left, right) {
    return toTime_(right.created_at) - toTime_(left.created_at);
  });
}

function toTime_(value) {
  if (!value) {
    return 0;
  }
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}
