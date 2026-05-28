/**
 * Payment Order authorizes payment.
 * It still does not affect cashbox balance until executed as Cash Payment Event.
 */
function createPaymentOrderFromRequest(requestId, orderData) {
  // TODO: Validate approved request and create linked payment order.
  throw new Error('TODO: createPaymentOrderFromRequest is not implemented yet.');
}

function createDirectPaymentOrder(orderData) {
  // TODO: Validate authorized role, amount, currency, cashbox, and recipient.
  throw new Error('TODO: createDirectPaymentOrder is not implemented yet.');
}

function issuePaymentOrder(orderId) {
  // TODO: Transition valid order to WAITING_PAYMENT and write audit log.
  throw new Error('TODO: issuePaymentOrder is not implemented yet.');
}

function cancelPaymentOrder(orderId, reason) {
  // TODO: Validate status, require reason, and write audit log.
  throw new Error('TODO: cancelPaymentOrder is not implemented yet.');
}

function listOrdersWaitingForPayment() {
  // TODO: Return valid orders waiting for cashier execution.
  throw new Error('TODO: listOrdersWaitingForPayment is not implemented yet.');
}
