/**
 * Cashbox helpers.
 */
function listCashboxes() {
  // TODO: Return active cashboxes available to the current user.
  throw new Error('TODO: listCashboxes is not implemented yet.');
}

function assertCashboxAccess(cashboxId) {
  // TODO: Validate cashbox permission for current user.
  if (!cashboxId) {
    throw new Error('Cashbox is required.');
  }
}
