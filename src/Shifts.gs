/**
 * Shift workflow.
 *
 * A shift tracks cashier responsibility for a cashbox. It never changes cashbox
 * balance directly; balance is calculated from posted or locked cash events.
 */
const SHIFT_OPEN_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.ADMIN
]);

const SHIFT_ELEVATED_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.ADMIN,
  USER_ROLES.FINANCE
]);

const SHIFT_CANCEL_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR
]);

const SHIFT_VIEW_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.ADMIN,
  USER_ROLES.FINANCE,
  USER_ROLES.DIRECTOR
]);

function openShift(cashboxId, openingNote) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const currentUser = requireActiveUserWithRole_(SHIFT_OPEN_ROLES_);
    assertNonEmptyString(cashboxId, 'cashboxId');
    assertActiveCashbox(cashboxId);

    const activeShift = getActiveShiftForCashbox(cashboxId);
    if (activeShift) {
      throw new Error('Cashbox already has an open shift: ' + activeShift.shift_id);
    }

    const now = getCurrentTimestamp_();
    const openingBalance = calculateBalanceBySupportedCurrencies_(cashboxId);
    const shift = {
      shift_id: generateId_('SHF'),
      cashbox_id: cashboxId,
      opened_by: currentUser.email,
      opened_at: now,
      opening_note: openingNote || '',
      opening_balance_json: serializeJson_(openingBalance),
      closed_by: '',
      closed_at: '',
      handover_to: '',
      handover_at: '',
      closing_balance_json: '',
      physical_balance_json: '',
      difference_json: '',
      status: SHIFT_STATUSES.OPEN,
      note: '',
      updated_at: ''
    };

    appendRecord(SHEET_NAMES.SHIFTS, shift);
    writeAuditLog(
      AUDIT_ACTIONS.CREATE,
      SHEET_NAMES.SHIFTS,
      shift.shift_id,
      null,
      shift,
      'Shift opened. Shift does not affect cashbox balance.'
    );

    return shift;
  } finally {
    lock.releaseLock();
  }
}

function getActiveShiftForCashbox(cashboxId) {
  assertNonEmptyString(cashboxId, 'cashboxId');
  assertActiveCashbox(cashboxId);

  const shifts = listRecords(SHEET_NAMES.SHIFTS, {
    cashbox_id: cashboxId,
    status: SHIFT_STATUSES.OPEN
  });
  if (shifts.length > 1) {
    throw new Error('Data integrity error: multiple open shifts for cashbox ' + cashboxId + '.');
  }
  return shifts.length === 1 ? shifts[0] : null;
}

function getMyActiveShifts() {
  assertCurrentUserActive();
  const currentUser = getCurrentUser();

  return listRecords(SHEET_NAMES.SHIFTS, {
    opened_by: currentUser.email,
    status: SHIFT_STATUSES.OPEN
  });
}

function getShiftBalance(shiftId) {
  assertNonEmptyString(shiftId, 'shiftId');
  const shift = getShiftMatchOrThrow_(shiftId).record;
  assertShiftViewPermission_(shift);

  return {
    shift: shift,
    balanceByCurrency: calculateBalanceBySupportedCurrencies_(shift.cashbox_id)
  };
}

function handoverShift(shiftId, handoverToUserEmail, physicalBalanceByCurrency, note) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    assertNonEmptyString(shiftId, 'shiftId');
    assertNonEmptyString(handoverToUserEmail, 'handoverToUserEmail');
    const shift = getShiftMatchOrThrow_(shiftId).record;
    assertEntityStatus(shift, [SHIFT_STATUSES.OPEN], 'Shift');
    assertShiftOwnerOrElevated_(shift);
    assertUserCanReceiveShift(handoverToUserEmail);

    const calculatedBalance = calculateBalanceBySupportedCurrencies_(shift.cashbox_id);
    const physicalBalance = physicalBalanceByCurrency
      ? normalizePhysicalBalanceByCurrency_(calculatedBalance, physicalBalanceByCurrency)
      : calculatedBalance;
    const difference = calculateDifferenceByCurrency_(calculatedBalance, physicalBalance);
    const hasDifference = hasAnyDifference_(difference);
    const now = getCurrentTimestamp_();

    return updateShiftWithAudit_(
      shiftId,
      {
        handover_to: String(handoverToUserEmail).trim(),
        handover_at: now,
        closing_balance_json: serializeJson_(calculatedBalance),
        physical_balance_json: serializeJson_(physicalBalance),
        difference_json: serializeJson_(difference),
        status: hasDifference ? SHIFT_STATUSES.CLOSED_WITH_DIFFERENCE : SHIFT_STATUSES.HANDED_OVER,
        note: appendShiftNote_(shift.note, note),
        updated_at: now
      },
      AUDIT_ACTIONS.UPDATE,
      hasDifference
        ? 'Shift handover recorded with difference. Receiving shift is not auto-opened.'
        : 'Shift handed over. Receiving shift is not auto-opened.'
    );
  } finally {
    lock.releaseLock();
  }
}

function closeShift(shiftId, physicalBalanceByCurrency, note) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    assertNonEmptyString(shiftId, 'shiftId');
    if (!physicalBalanceByCurrency) {
      throw new Error('physicalBalanceByCurrency is required to close shift.');
    }

    const shift = getShiftMatchOrThrow_(shiftId).record;
    assertEntityStatus(shift, [SHIFT_STATUSES.OPEN], 'Shift');
    assertShiftOwnerOrElevated_(shift);

    const currentUser = getCurrentUser();
    const calculatedBalance = calculateBalanceBySupportedCurrencies_(shift.cashbox_id);
    const physicalBalance = normalizePhysicalBalanceByCurrency_(calculatedBalance, physicalBalanceByCurrency);
    const difference = calculateDifferenceByCurrency_(calculatedBalance, physicalBalance);
    const hasDifference = hasAnyDifference_(difference);
    const now = getCurrentTimestamp_();

    return updateShiftWithAudit_(
      shiftId,
      {
        closed_by: currentUser.email,
        closed_at: now,
        closing_balance_json: serializeJson_(calculatedBalance),
        physical_balance_json: serializeJson_(physicalBalance),
        difference_json: serializeJson_(difference),
        status: hasDifference ? SHIFT_STATUSES.CLOSED_WITH_DIFFERENCE : SHIFT_STATUSES.CLOSED,
        note: appendShiftNote_(shift.note, note),
        updated_at: now
      },
      hasDifference ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.LOCK,
      hasDifference ? 'Shift closed with difference.' : 'Shift closed without difference.'
    );
  } finally {
    lock.releaseLock();
  }
}

function closeShiftWithLatestCashCounts(shiftId, note) {
  assertNonEmptyString(shiftId, 'shiftId');
  const shift = getShiftMatchOrThrow_(shiftId).record;
  assertEntityStatus(shift, [SHIFT_STATUSES.OPEN], 'Shift');
  assertShiftOwnerOrElevated_(shift);

  const counts = listRecords(SHEET_NAMES.CASH_COUNTS, {
    shift_id: shift.shift_id,
    status: CASH_COUNT_STATUSES.POSTED
  });
  const latestByCurrency = counts.reduce(function(result, count) {
    const currency = count.currency;
    if (!currency) {
      return result;
    }
    const current = result[currency];
    const currentTime = current ? new Date(current.posted_at || current.created_at || 0).getTime() : 0;
    const nextTime = new Date(count.posted_at || count.created_at || 0).getTime();
    if (!current || nextTime >= currentTime) {
      result[currency] = count;
    }
    return result;
  }, {});

  const supportedCurrencies = listSupportedCurrencies();
  const missing = supportedCurrencies.filter(function(currency) {
    return !latestByCurrency[currency];
  });
  if (missing.length) {
    throw new Error('Pre zatvaranja smene uradite presek blagajne za valute: ' + missing.join(', ') + '.');
  }

  const physicalBalance = supportedCurrencies.reduce(function(result, currency) {
    const count = latestByCurrency[currency];
    result[currency] = Number(count.counted_cash_total || 0) + Number(count.check_total || 0);
    return result;
  }, {});

  return closeShift(shift.shift_id, physicalBalance, note);
}

function cancelShift(shiftId, reason) {
  requireActiveUserWithRole_(SHIFT_CANCEL_ROLES_);
  assertNonEmptyString(shiftId, 'shiftId');
  assertNonEmptyString(reason, 'reason');

  const shift = getShiftMatchOrThrow_(shiftId).record;
  if (shift.status === SHIFT_STATUSES.CLOSED || shift.status === SHIFT_STATUSES.CLOSED_WITH_DIFFERENCE) {
    throw new Error('Closed shift cannot be cancelled.');
  }

  return updateShiftWithAudit_(
    shiftId,
    {
      status: SHIFT_STATUSES.CANCELLED,
      note: appendShiftNote_(shift.note, 'Cancellation reason: ' + String(reason).trim()),
      updated_at: getCurrentTimestamp_()
    },
    AUDIT_ACTIONS.CANCEL,
    'Shift cancelled administratively.'
  );
}

function assertCashboxHasOpenShift(cashboxId) {
  const activeShift = getActiveShiftForCashbox(cashboxId);
  if (!activeShift) {
    throw new Error('Cashbox does not have an open shift: ' + cashboxId);
  }
  return activeShift;
}

function calculateBalanceBySupportedCurrencies_(cashboxId) {
  assertNonEmptyString(cashboxId, 'cashboxId');
  assertActiveCashbox(cashboxId);

  return listSupportedCurrencies().reduce(function(result, currency) {
    assertActiveCurrency(currency);
    result[currency] = calculateCashboxBalance(cashboxId, currency);
    return result;
  }, {});
}

function calculateDifferenceByCurrency_(calculatedBalance, physicalBalance) {
  const calculated = calculatedBalance || {};
  const physical = physicalBalance || {};

  return Object.keys(calculated).reduce(function(result, currency) {
    if (!Object.prototype.hasOwnProperty.call(physical, currency)) {
      throw new Error('Physical balance is missing currency: ' + currency);
    }
    const calculatedAmount = Number(calculated[currency] || 0);
    const physicalAmount = Number(physical[currency]);
    if (!isFinite(physicalAmount)) {
      throw new Error('Physical balance must be numeric for currency: ' + currency);
    }
    result[currency] = physicalAmount - calculatedAmount;
    return result;
  }, {});
}

function hasAnyDifference_(differenceByCurrency) {
  return Object.keys(differenceByCurrency || {}).some(function(currency) {
    return Math.abs(Number(differenceByCurrency[currency] || 0)) > 0.000001;
  });
}

function serializeJson_(obj) {
  return JSON.stringify(obj || {});
}

function parseJson_(text) {
  if (!text) {
    return {};
  }
  if (typeof text === 'object') {
    return text;
  }
  return JSON.parse(text);
}

function getShiftMatchOrThrow_(shiftId) {
  const match = findRecordById(SHEET_NAMES.SHIFTS, 'shift_id', shiftId);
  if (!match) {
    throw new Error('Shift not found: ' + shiftId);
  }
  return match;
}

function assertShiftOwnerOrElevated_(shift) {
  const currentUser = getCurrentUser();
  assertCurrentUserActive();
  if (shift.opened_by === currentUser.email) {
    return;
  }
  assertUserHasRole(SHIFT_ELEVATED_ROLES_);
}

function assertShiftViewPermission_(shift) {
  const currentUser = getCurrentUser();
  assertCurrentUserActive();
  if (shift.opened_by === currentUser.email || shift.handover_to === currentUser.email) {
    return;
  }
  assertUserHasRole(SHIFT_VIEW_ROLES_);
}

function assertCurrentUserOwnsOpenShiftForCashbox_(cashboxId) {
  const currentUser = getCurrentUser();
  assertCurrentUserActive();
  const activeShift = getActiveShiftForCashbox(cashboxId);
  if (!activeShift) {
    throw new Error('Direktna uplata/isplata nije dozvoljena bez otvorene smene za blagajnu.');
  }
  if (activeShift.opened_by !== currentUser.email) {
    throw new Error('Direktnu uplatu/isplatu može knjižiti samo korisnik koji je otvorio aktivnu smenu.');
  }
  return activeShift;
}

function updateShiftWithAudit_(shiftId, updates, action, comment) {
  const beforeMatch = getShiftMatchOrThrow_(shiftId);
  const updated = updateRecordById(
    SHEET_NAMES.SHIFTS,
    'shift_id',
    shiftId,
    updates
  );

  writeAuditLog(
    action,
    SHEET_NAMES.SHIFTS,
    shiftId,
    beforeMatch.record,
    updated,
    comment
  );

  return updated;
}

function normalizePhysicalBalanceByCurrency_(calculatedBalance, physicalBalanceByCurrency) {
  const physical = parseJson_(physicalBalanceByCurrency);
  return Object.keys(calculatedBalance || {}).reduce(function(result, currency) {
    if (!Object.prototype.hasOwnProperty.call(physical, currency)) {
      throw new Error('Physical balance is missing currency: ' + currency);
    }
    const amount = Number(physical[currency]);
    if (!isFinite(amount)) {
      throw new Error('Physical balance must be numeric for currency: ' + currency);
    }
    result[currency] = amount;
    return result;
  }, {});
}

function appendShiftNote_(existingNote, note) {
  if (!note) {
    return existingNote || '';
  }
  if (!existingNote) {
    return String(note).trim();
  }
  return existingNote + '\n' + String(note).trim();
}
