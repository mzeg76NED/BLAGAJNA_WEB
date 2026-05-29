/**
 * Daily closing workflow.
 *
 * Daily closing records calculated and physical balance for one cashbox,
 * currency and date. It does not create cash movement and does not change cash
 * event amounts; it only locks included posted events.
 */
const DAILY_CLOSING_PREPARE_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.FINANCE,
  USER_ROLES.DIRECTOR,
  USER_ROLES.ADMIN,
  USER_ROLES.CASHIER
]);

const DAILY_CLOSING_CLOSE_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.FINANCE,
  USER_ROLES.DIRECTOR,
  USER_ROLES.ADMIN
]);

const DAILY_CLOSING_LOCK_ROLES_ = Object.freeze([
  USER_ROLES.FINANCE,
  USER_ROLES.DIRECTOR,
  USER_ROLES.ADMIN
]);

const DAILY_CLOSING_CANCEL_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.FINANCE
]);

function prepareDailyClosing(cashboxId, currency, closingDate) {
  requireActiveUserWithRole_(DAILY_CLOSING_PREPARE_ROLES_);
  const context = buildDailyClosingContext_(cashboxId, currency, closingDate);
  const existingClosing = findDailyClosing(context.cashboxId, context.currency, context.closingDate);
  if (existingClosing) {
    throw new Error('Daily closing already exists for cashbox/currency/date: ' +
      context.cashboxId + '/' + context.currency + '/' + context.closingDate);
  }

  return buildDailyClosingPreview_(context.cashboxId, context.currency, context.closingDate);
}

function closeDailyCashbox(cashboxId, currency, closingDate, physicalBalance, note) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const currentUser = requireActiveUserWithRole_(DAILY_CLOSING_CLOSE_ROLES_);
    const context = buildDailyClosingContext_(cashboxId, currency, closingDate);
    assertNonNegativeAmount(physicalBalance, 'physicalBalance');
    assertNoOpenShiftForCashbox(context.cashboxId);

    const existingClosing = findDailyClosing(context.cashboxId, context.currency, context.closingDate);
    if (existingClosing) {
      throw new Error('Daily closing already exists for cashbox/currency/date: ' +
        context.cashboxId + '/' + context.currency + '/' + context.closingDate);
    }

    const preview = buildDailyClosingPreview_(context.cashboxId, context.currency, context.closingDate);
    const numericPhysicalBalance = Number(physicalBalance);
    const difference = numericPhysicalBalance - preview.calculated_balance;
    const now = getCurrentTimestamp_();
    const closing = {
      closing_id: generateId_('DCL'),
      closing_date: context.closingDate,
      cashbox_id: context.cashboxId,
      currency: context.currency,
      opening_balance: preview.opening_balance,
      total_in: preview.total_in,
      total_out: preview.total_out,
      calculated_balance: preview.calculated_balance,
      physical_balance: numericPhysicalBalance,
      difference: difference,
      status: Math.abs(difference) > 0.000001
        ? DAILY_CLOSING_STATUSES.CLOSED_WITH_DIFFERENCE
        : DAILY_CLOSING_STATUSES.CLOSED,
      closed_by: currentUser.email,
      closed_at: now,
      locked_by: '',
      locked_at: '',
      note: note || '',
      updated_at: ''
    };

    appendRecord(SHEET_NAMES.DAILY_CLOSING, closing);
    const lockSummary = lockCashEventsForClosing_(preview.included_events, closing.closing_id);

    writeAuditLog(
      AUDIT_ACTIONS.CREATE,
      SHEET_NAMES.DAILY_CLOSING,
      closing.closing_id,
      null,
      closing,
      'Daily closing created. Closing does not create cash movement.'
    );
    writeAuditLog(
      AUDIT_ACTIONS.LOCK,
      SHEET_NAMES.CASH_EVENTS,
      closing.closing_id,
      null,
      lockSummary,
      'Daily closing locked included posted cash events.'
    );

    return {
      closing: closing,
      summary: {
        included_event_count: preview.included_event_count,
        locked_event_count: lockSummary.locked_event_count,
        locked_event_ids: lockSummary.locked_event_ids
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function getDailyClosingById(closingId) {
  const match = findRecordById(SHEET_NAMES.DAILY_CLOSING, 'closing_id', closingId);
  return match ? match.record : null;
}

function findDailyClosing(cashboxId, currency, closingDate) {
  const context = buildDailyClosingContext_(cashboxId, currency, closingDate);
  const matches = listRecords(SHEET_NAMES.DAILY_CLOSING, {
    cashbox_id: context.cashboxId,
    currency: context.currency
  }).filter(function(closing) {
    return normalizeDateKey_(closing.closing_date) === context.closingDate &&
      closing.status !== DAILY_CLOSING_STATUSES.CANCELLED;
  });

  return matches.length > 0 ? matches[0] : null;
}

function listDailyClosings(filters) {
  requireActiveUserWithRole_(DAILY_CLOSING_PREPARE_ROLES_);
  const allowedFilters = [
    'cashbox_id',
    'currency',
    'status',
    'closing_date'
  ];
  const activeFilters = {};
  Object.keys(filters || {}).forEach(function(field) {
    if (allowedFilters.indexOf(field) === -1) {
      return;
    }
    if (field !== 'closing_date') {
      activeFilters[field] = filters[field];
    }
  });

  const dateFilter = filters && filters.closing_date ? normalizeDateKey_(filters.closing_date) : '';
  return listRecords(SHEET_NAMES.DAILY_CLOSING, activeFilters)
    .filter(function(closing) {
      return !dateFilter || normalizeDateKey_(closing.closing_date) === dateFilter;
    })
    .sort(function(left, right) {
      return toTime_(right.closing_date) - toTime_(left.closing_date);
    });
}

function lockDailyClosing(closingId) {
  const currentUser = requireActiveUserWithRole_(DAILY_CLOSING_LOCK_ROLES_);
  assertNonEmptyString(closingId, 'closingId');
  const match = getDailyClosingMatchOrThrow_(closingId);
  assertEntityStatus(match.record, [
    DAILY_CLOSING_STATUSES.CLOSED,
    DAILY_CLOSING_STATUSES.CLOSED_WITH_DIFFERENCE
  ], 'Daily Closing');

  const now = getCurrentTimestamp_();
  const updated = updateRecordById(
    SHEET_NAMES.DAILY_CLOSING,
    'closing_id',
    closingId,
    {
      status: DAILY_CLOSING_STATUSES.LOCKED,
      locked_by: currentUser.email,
      locked_at: now,
      updated_at: now
    }
  );

  writeAuditLog(
    AUDIT_ACTIONS.LOCK,
    SHEET_NAMES.DAILY_CLOSING,
    closingId,
    match.record,
    updated,
    'Daily closing administratively locked.'
  );

  return updated;
}

function cancelDailyClosing(closingId, reason) {
  requireActiveUserWithRole_(DAILY_CLOSING_CANCEL_ROLES_);
  assertNonEmptyString(closingId, 'closingId');
  assertNonEmptyString(reason, 'reason');
  throw new Error('Daily closing cancellation is not implemented in Task 08. Use later correction workflow.');
}

function getCashEventsForDate_(cashboxId, currency, closingDate) {
  const dateKey = normalizeDateKey_(closingDate);
  return listRecords(SHEET_NAMES.CASH_EVENTS, {
    cashbox_id: cashboxId,
    currency: currency
  }).filter(function(event) {
    return event.status === CASH_EVENT_STATUSES.POSTED &&
      normalizeDateKey_(event.event_date) === dateKey;
  });
}

function calculateOpeningBalanceBeforeDate_(cashboxId, currency, closingDate) {
  const closingDateKey = normalizeDateKey_(closingDate);
  return listRecords(SHEET_NAMES.CASH_EVENTS, {
    cashbox_id: cashboxId,
    currency: currency
  }).reduce(function(balance, event) {
    if (!isCashEventBalanceAffecting(event)) {
      return balance;
    }
    if (normalizeDateKey_(event.event_date) >= closingDateKey) {
      return balance;
    }

    const amount = Number(event.amount || 0);
    if (event.direction === 'IN') {
      return balance + amount;
    }
    if (event.direction === 'OUT') {
      return balance - amount;
    }
    return balance;
  }, 0);
}

function calculateDailyTotals_(events) {
  return (events || []).reduce(function(totals, event) {
    const amount = Number(event.amount || 0);
    if (event.direction === 'IN') {
      totals.total_in += amount;
    } else if (event.direction === 'OUT') {
      totals.total_out += amount;
    }
    return totals;
  }, {
    total_in: 0,
    total_out: 0
  });
}

function lockCashEventsForClosing_(events, closingId) {
  const now = getCurrentTimestamp_();
  const currentUser = getCurrentUser();
  const lockedEventIds = [];

  (events || []).forEach(function(event) {
    if (event.status !== CASH_EVENT_STATUSES.POSTED) {
      return;
    }
    const updated = updateRecordById(
      SHEET_NAMES.CASH_EVENTS,
      'event_id',
      event.event_id,
      {
        status: CASH_EVENT_STATUSES.LOCKED,
        locked_by: currentUser.email,
        locked_at: now,
        updated_at: now
      }
    );
    lockedEventIds.push(updated.event_id);
  });

  return {
    closing_id: closingId,
    locked_event_count: lockedEventIds.length,
    locked_event_ids: lockedEventIds
  };
}

function normalizeDateKey_(dateValue) {
  if (!dateValue) {
    throw new Error('closingDate is required.');
  }

  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd');
  }

  const text = String(dateValue).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3];
  }

  const parsedDate = new Date(text);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid closingDate: ' + dateValue);
  }
  return Utilities.formatDate(parsedDate, Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd');
}

function buildDailyClosingContext_(cashboxId, currency, closingDate) {
  assertNonEmptyString(cashboxId, 'cashboxId');
  assertNonEmptyString(currency, 'currency');
  assertActiveCashbox(cashboxId);
  assertActiveCurrency(currency);

  return {
    cashboxId: cashboxId,
    currency: currency,
    closingDate: normalizeDateKey_(closingDate)
  };
}

function buildDailyClosingPreview_(cashboxId, currency, closingDate) {
  const openingBalance = calculateOpeningBalanceBeforeDate_(cashboxId, currency, closingDate);
  const events = getCashEventsForDate_(cashboxId, currency, closingDate);
  const totals = calculateDailyTotals_(events);
  const calculatedBalance = openingBalance + totals.total_in - totals.total_out;

  return {
    cashbox_id: cashboxId,
    currency: currency,
    closing_date: normalizeDateKey_(closingDate),
    opening_balance: openingBalance,
    total_in: totals.total_in,
    total_out: totals.total_out,
    calculated_balance: calculatedBalance,
    included_event_count: events.length,
    included_events: events
  };
}

function getDailyClosingMatchOrThrow_(closingId) {
  const match = findRecordById(SHEET_NAMES.DAILY_CLOSING, 'closing_id', closingId);
  if (!match) {
    throw new Error('Daily Closing not found: ' + closingId);
  }
  return match;
}
