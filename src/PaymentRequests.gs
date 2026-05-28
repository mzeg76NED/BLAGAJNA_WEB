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

  if (requestData.preferred_cashbox_id) {
    assertActiveCashbox(requestData.preferred_cashbox_id);
  }

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
    preferred_cashbox_id: requestData.preferred_cashbox_id || '',
    needed_by_date: requestData.needed_by_date || '',
    priority: priority,
    status: REQUEST_STATUSES.DRAFT,
    reviewed_by: '',
    reviewed_at: '',
    rejection_reason: '',
    linked_order_id: '',
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

  return updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.SUBMITTED,
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.SUBMIT,
    'Payment request submitted for review.'
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
      status: REQUEST_STATUSES.IN_REVIEW,
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.UPDATE,
    'Payment request marked as in review.'
  );
}

function approvePaymentRequest(requestId, approvalData) {
  assertNonEmptyString(requestId, 'requestId');
  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, [
    REQUEST_STATUSES.SUBMITTED,
    REQUEST_STATUSES.IN_REVIEW
  ]);

  const currentUser = requireActiveUserWithRole_(PAYMENT_REQUEST_REVIEWER_ROLES_);
  const data = approvalData || {};
  const now = getCurrentTimestamp_();

  return updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.APPROVED,
      reviewed_by: data.reviewed_by || currentUser.email,
      reviewed_at: now,
      rejection_reason: '',
      updated_at: now
    },
    AUDIT_ACTIONS.APPROVE,
    'Payment request approved. Approval does not create payment order and does not affect balance.'
  );
}

function rejectPaymentRequest(requestId, reason) {
  assertNonEmptyString(requestId, 'requestId');
  assertNonEmptyString(reason, 'reason');

  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, [
    REQUEST_STATUSES.SUBMITTED,
    REQUEST_STATUSES.IN_REVIEW
  ]);

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

function cancelPaymentRequest(requestId, reason) {
  assertNonEmptyString(requestId, 'requestId');

  const match = getPaymentRequestMatchOrThrow_(requestId);
  if (match.record.status === REQUEST_STATUSES.CONVERTED_TO_ORDER) {
    throw new Error('Payment Request converted to order cannot be cancelled.');
  }
  if (match.record.status === REQUEST_STATUSES.APPROVED) {
    assertNonEmptyString(reason, 'reason');
  }

  assertCurrentUserCanOwnRequest_(match.record);

  return updatePaymentRequestWithAudit_(
    requestId,
    {
      status: REQUEST_STATUSES.CANCELLED,
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
      return record.status === REQUEST_STATUSES.SUBMITTED ||
        record.status === REQUEST_STATUSES.IN_REVIEW;
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

function convertApprovedRequestToOrderPlaceholder(requestId) {
  assertNonEmptyString(requestId, 'requestId');
  const match = getPaymentRequestMatchOrThrow_(requestId);
  assertRequestStatus_(match.record, [REQUEST_STATUSES.APPROVED]);

  throw new Error('Full Payment Order creation belongs to Task 04. This placeholder does not modify data.');
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
