/**
 * Cashbox helpers.
 */
function listCashboxes() {
  const currentUser = assertCurrentUserActive();
  return listRecords(SHEET_NAMES.CASHBOXES)
    .filter(function(cashbox) {
      return isTruthy_(cashbox.active) && canUserAccessCashbox_(currentUser, cashbox);
    })
    .map(function(cashbox) {
      return {
        cashbox_id: cashbox.cashbox_id,
        name: cashbox.name || cashbox.cashbox_id,
        location: cashbox.location || '',
        active: isTruthy_(cashbox.active)
      };
    });
}

function assertCashboxAccess(cashboxId) {
  if (!cashboxId) {
    throw new Error('Cashbox is required.');
  }
  const currentUser = assertCurrentUserActive();
  const match = findRecordById(SHEET_NAMES.CASHBOXES, 'cashbox_id', cashboxId);
  if (!match || !isTruthy_(match.record.active)) {
    throw new Error('Cashbox is not active or does not exist: ' + cashboxId);
  }
  if (!canUserAccessCashbox_(currentUser, match.record)) {
    throw new Error('User does not have access to cashbox: ' + cashboxId);
  }
  return match.record;
}

function getDefaultCashboxIdForCurrentUser_() {
  return getDefaultCashboxIdForUser_(getCurrentUser());
}

function getDefaultCashboxIdForUser_(user) {
  const currentUser = user || getCurrentUser();
  if (currentUser.default_cashbox_id) {
    assertCashboxAccessForUser_(currentUser, currentUser.default_cashbox_id);
    return currentUser.default_cashbox_id;
  }

  const allowedCashboxes = listRecords(SHEET_NAMES.CASHBOXES)
    .filter(function(cashbox) {
      return isTruthy_(cashbox.active) && canUserAccessCashbox_(currentUser, cashbox);
    });
  if (!allowedCashboxes.length) {
    throw new Error('Nema aktivne blagajne dostupne za korisnika.');
  }
  return allowedCashboxes[0].cashbox_id;
}

function assertCashboxAccessForUser_(user, cashboxId) {
  const match = findRecordById(SHEET_NAMES.CASHBOXES, 'cashbox_id', cashboxId);
  if (!match || !isTruthy_(match.record.active)) {
    throw new Error('Cashbox is not active or does not exist: ' + cashboxId);
  }
  if (!canUserAccessCashbox_(user, match.record)) {
    throw new Error('User does not have access to cashbox: ' + cashboxId);
  }
  return match.record;
}

function canUserAccessCashbox_(user, cashbox) {
  if (!user || !cashbox) {
    return false;
  }
  const role = user.role;
  if ([
    USER_ROLES.ADMIN,
    USER_ROLES.DIRECTOR,
    USER_ROLES.FINANCE,
    USER_ROLES.CASHIER_SUPERVISOR,
    USER_ROLES.APPROVER,
    USER_ROLES.REQUESTER,
    USER_ROLES.VIEWER
  ].indexOf(role) !== -1) {
    return true;
  }
  if (role === USER_ROLES.CASHIER) {
    if (user.default_cashbox_id) {
      return String(cashbox.cashbox_id) === String(user.default_cashbox_id);
    }
    return true;
  }
  return false;
}
