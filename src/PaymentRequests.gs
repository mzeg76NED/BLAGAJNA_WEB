/**
 * Payment Request is only a request.
 * It never authorizes payment and never affects cashbox balance.
 */
function createPaymentRequest(data) {
  // TODO: Validate requester, required fields, amount, currency, and status.
  throw new Error('TODO: createPaymentRequest is not implemented yet.');
}

function submitPaymentRequest(requestId) {
  // TODO: Allow transition from DRAFT to SUBMITTED and write audit log.
  throw new Error('TODO: submitPaymentRequest is not implemented yet.');
}

function approvePaymentRequest(requestId, approvalData) {
  // TODO: Validate approver role and transition request to APPROVED.
  throw new Error('TODO: approvePaymentRequest is not implemented yet.');
}

function rejectPaymentRequest(requestId, reason) {
  // TODO: Require rejection reason and write audit log.
  throw new Error('TODO: rejectPaymentRequest is not implemented yet.');
}

function cancelPaymentRequest(requestId, reason) {
  // TODO: Validate allowed statuses and write audit log.
  throw new Error('TODO: cancelPaymentRequest is not implemented yet.');
}

function listMyPaymentRequests() {
  // TODO: Return requests for current user.
  throw new Error('TODO: listMyPaymentRequests is not implemented yet.');
}

function listRequestsForApproval() {
  // TODO: Return submitted requests visible to current approver.
  throw new Error('TODO: listRequestsForApproval is not implemented yet.');
}
