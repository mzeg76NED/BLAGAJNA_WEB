/**
 * Cash Event is the only layer that changes calculated cashbox balance.
 * Only posted cash events affect balance.
 */
function executePaymentOrder(orderId, paymentData) {
  // TODO: Validate valid order, remaining amount, cashbox, currency, and balance.
  throw new Error('TODO: executePaymentOrder is not implemented yet.');
}

function createCashInflow(data) {
  // TODO: Validate cashier role, cashbox, currency, amount, and source.
  throw new Error('TODO: createCashInflow is not implemented yet.');
}

function createCashTransfer(data) {
  // TODO: Validate source and destination cashboxes, currency, amount, and permissions.
  throw new Error('TODO: createCashTransfer is not implemented yet.');
}

function calculateCashboxBalance(cashboxId, currency) {
  // TODO: Sum posted events by cashbox and currency according to event type.
  throw new Error('TODO: calculateCashboxBalance is not implemented yet.');
}

function reverseCashEvent(eventId, reason) {
  // TODO: Create reversal event instead of editing or deleting the original event.
  throw new Error('TODO: reverseCashEvent is not implemented yet.');
}
