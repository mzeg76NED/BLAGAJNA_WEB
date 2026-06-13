/**
 * Cash count workflow.
 *
 * Cash counts are controlled physical inventory records. They are audit evidence
 * and do not change cash event history or cashbox balance by themselves.
 */
const CASH_COUNT_ROLES_ = Object.freeze([
  USER_ROLES.CASHIER,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.ADMIN,
  USER_ROLES.FINANCE
]);

const CASH_DENOMINATIONS_ = Object.freeze({
  RSD: Object.freeze([5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]),
  EUR: Object.freeze([500, 200, 100, 50, 20, 10, 5, 2, 1])
});

function getCashDenominations(currency) {
  assertActiveCurrency(currency);
  const configured = getCurrencyDenominationMap()[currency];
  return (configured && configured.length ? configured : (CASH_DENOMINATIONS_[currency] || [])).slice();
}

function prepareCashCount(cashboxId, currency, countType) {
  requireActiveUserWithRole_(CASH_COUNT_ROLES_);
  assertNonEmptyString(cashboxId, 'cashboxId');
  assertActiveCashbox(cashboxId);
  assertActiveCurrency(currency);

  return {
    cashbox_id: cashboxId,
    currency: currency,
    count_type: countType || CASH_COUNT_TYPES.CASHBOX_COUNT,
    active_shift: getActiveShiftForCashbox(cashboxId),
    calculated_balance_before: calculateCashboxBalance(cashboxId, currency),
    denominations: getCashDenominations(currency)
  };
}

function createCashCount(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const currentUser = requireActiveUserWithRole_(CASH_COUNT_ROLES_);
    const countData = data || {};
    const balances = calculateCashboxBalances(countData.cashbox_id, [countData.currency]);
    return createCashCountRecord_(countData, currentUser, getCurrentTimestamp_(), undefined, balances);
  } finally {
    lock.releaseLock();
  }
}

function createCashCounts(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const currentUser = requireActiveUserWithRole_(CASH_COUNT_ROLES_);
    data = data || {};
    const grouped = groupCashCountDenominationsByCurrency_(data);
    const currencies = Object.keys(grouped);
    const balances = calculateCashboxBalances(data.cashbox_id, currencies);
    const now = getCurrentTimestamp_();
    const activeShift = getActiveShiftForCashbox(data.cashbox_id);

    return currencies.map(function(currency) {
      const countData = Object.assign({}, data, {
        currency: currency,
        denominations: grouped[currency],
        check_count: 0,
        check_total: 0
      });
      return createCashCountRecord_(countData, currentUser, now, activeShift, balances);
    });
  } finally {
    lock.releaseLock();
  }
}

function groupCashCountDenominationsByCurrency_(data) {
  const grouped = ((data && data.denominations) || []).reduce(function(result, row) {
    const currency = row.currency || data.currency;
    if (!currency) {
      return result;
    }
    if (!result[currency]) {
      result[currency] = [];
    }
    result[currency].push(row);
    return result;
  }, {});

  if (data && isTruthy_(data.include_all_currencies)) {
    listSupportedCurrencies().forEach(function(currency) {
      if (!grouped[currency]) {
        grouped[currency] = [];
      }
    });
  }

  if (!Object.keys(grouped).length) {
    grouped[(data && data.currency) || getDefaultCurrencyCode()] = [];
  }

  return grouped;
}

function createCashCountRecord_(data, currentUser, timestamp, activeShiftOverride, calculatedBalances) {
  data = data || {};
  const cashboxId = data.cashbox_id;
  const currency = data.currency;
  const countType = data.count_type || CASH_COUNT_TYPES.CASHBOX_COUNT;

  assertNonEmptyString(cashboxId, 'cashbox_id');
  assertActiveCashbox(cashboxId);
  assertActiveCurrency(currency);
  assertAllowedValue(countType, objectValues_(CASH_COUNT_TYPES), 'count_type');

  const activeShift = activeShiftOverride === undefined
    ? getActiveShiftForCashbox(cashboxId)
    : activeShiftOverride;
  if (countType !== CASH_COUNT_TYPES.SHIFT_OPENING && !activeShift) {
    throw new Error('Presek stanja nije dozvoljen bez aktivne smene.');
  }

  const denominations = normalizeDenominations_(currency, data.denominations || []);
  const countedCashTotal = denominations.reduce(function(total, item) {
    return total + item.denomination * item.quantity;
  }, 0);
  const now = timestamp || getCurrentTimestamp_();
  const calculatedBalance = calculatedBalances && Object.prototype.hasOwnProperty.call(calculatedBalances, currency)
    ? Number(calculatedBalances[currency] || 0)
    : calculateCashboxBalance(cashboxId, currency);
  const difference = countedCashTotal - calculatedBalance;
  const countId = generateId_('CNT');
  const adjustmentEvent = buildCashCountAdjustmentEvent_(
    countId,
    cashboxId,
    currency,
    difference,
    currentUser.email,
    now,
    data.note
  );
  const record = {
    count_id: countId,
    created_at: now,
    created_by: currentUser.email,
    count_type: countType,
    cashbox_id: cashboxId,
    shift_id: activeShift ? activeShift.shift_id : (data.shift_id || ''),
    currency: currency,
    counted_cash_total: countedCashTotal,
    check_count: 0,
    check_total: 0,
    calculated_balance_before: calculatedBalance,
    difference: difference,
    denominations_json: serializeJson_(denominations),
    adjustment_event_id: adjustmentEvent ? adjustmentEvent.event_id : '',
    note: data.note || '',
    status: CASH_COUNT_STATUSES.POSTED,
    posted_by: currentUser.email,
    posted_at: now,
    updated_at: ''
  };

  appendRecord(SHEET_NAMES.CASH_COUNTS, record);
  writeAuditLog(
    AUDIT_ACTIONS.POST,
    SHEET_NAMES.CASH_COUNTS,
    record.count_id,
    null,
    record,
    adjustmentEvent
      ? 'Cash count posted with automatic balance correction.'
      : 'Cash count posted without difference.'
  );

  if (adjustmentEvent) {
    appendRecord(SHEET_NAMES.CASH_EVENTS, adjustmentEvent);
    writeAuditLog(
      AUDIT_ACTIONS.POST,
      SHEET_NAMES.CASH_EVENTS,
      adjustmentEvent.event_id,
      null,
      adjustmentEvent,
      'Automatic correction created from cash count: ' + countId
    );
  }

  return record;
}

function buildCashCountAdjustmentEvent_(countId, cashboxId, currency, difference, userEmail, timestamp, note) {
  const numericDifference = Number(difference || 0);
  if (Math.abs(numericDifference) <= 0.000001) {
    return null;
  }
  const direction = numericDifference > 0 ? 'IN' : 'OUT';
  const amount = Math.abs(numericDifference);
  const differenceLabel = numericDifference > 0 ? 'VIŠAK' : 'MANJAK';
  const description = 'PRESEK SMENE - KOREKCIJA - ' + differenceLabel + ' ' + countId +
    '. Razlika: ' + numericDifference + ' ' + currency +
    (note ? '. Napomena: ' + String(note).trim() : '');

  return {
    event_id: generateId_('CEV'),
    created_at: timestamp,
    created_by: userEmail,
    event_date: timestamp,
    event_type: CASH_EVENT_TYPES.CORRECTION,
    cashbox_id: cashboxId,
    currency: currency,
    direction: direction,
    amount: amount,
    linked_request_id: '',
    linked_order_id: '',
    partner_name: 'Presek blagajne',
    description: description,
    document_status: DOCUMENT_STATUSES.NONE,
    status: CASH_EVENT_STATUSES.POSTED,
    posted_by: userEmail,
    posted_at: timestamp,
    locked_by: '',
    locked_at: '',
    reversal_of_event_id: '',
    updated_at: ''
  };
}

function getCashCountsReport(filters) {
  requireActiveUserWithRole_(CASH_COUNT_ROLES_);
  const scoped = filters || {};
  const range = getDateRangeFilter_(scoped);
  const shiftFilter = String(scoped.shift_id || '').trim();
  return listRecords(SHEET_NAMES.CASH_COUNTS)
    .map(normalizeCashCountForRead_)
    .filter(function(count) {
      return (!scoped.cashbox_id || count.cashbox_id === scoped.cashbox_id) &&
        (!scoped.currency || count.currency === scoped.currency) &&
        (!shiftFilter || count.shift_id === shiftFilter) &&
        isDateInRange_(count.posted_at || count.created_at, range.dateFrom, range.dateTo);
    })
    .map(function(count) {
      const denominations = parseJson_(count.denominations_json || '[]');
      return Object.assign({}, count, {
        counted_total: safeNumber_(count.counted_cash_total),
        denominations: Array.isArray(denominations) ? denominations : []
      });
    })
    .sort(function(left, right) {
      return toTime_(right.posted_at || right.created_at) - toTime_(left.posted_at || left.created_at);
    });
}

function normalizeCashCountForRead_(count) {
  const normalized = Object.assign({}, count || {});
  if (!normalized.count_id) {
    return normalized;
  }

  const audit = findCashCountAuditRecord_(normalized.count_id);
  const adjustment = normalized.adjustment_event_id
    ? findRecordById(SHEET_NAMES.CASH_EVENTS, 'event_id', normalized.adjustment_event_id)
    : null;
  const event = adjustment ? adjustment.record : null;
  const fallbackTime = audit && audit.timestamp || event && (event.posted_at || event.created_at || event.event_date) || '';
  const fallbackUser = audit && audit.user || event && (event.posted_by || event.created_by) || '';

  if (!isCashCountDateLike_(normalized.created_at)) {
    normalized.created_at = fallbackTime;
  }
  if (!isCashCountDateLike_(normalized.posted_at)) {
    normalized.posted_at = fallbackTime || normalized.created_at;
  }
  if (isInvalidCashCountActor_(normalized.created_by)) {
    normalized.created_by = fallbackUser;
  }
  if (isInvalidCashCountActor_(normalized.posted_by)) {
    normalized.posted_by = fallbackUser || normalized.created_by;
  }

  if (!isValidCashCountType_(normalized.count_type)) {
    normalized.count_type = [
      normalized.created_by,
      normalized.cashbox_id,
      normalized.shift_id,
      normalized.currency,
      normalized.status
    ].map(normalizeCashCountTypeValue_).filter(Boolean)[0] || CASH_COUNT_TYPES.CASHBOX_COUNT;
  }

  if (!isValidCashCountStatus_(normalized.status)) {
    if (!normalized.note && isBusinessCashCountText_(normalized.status)) {
      normalized.note = normalized.status;
    }
    normalized.status = CASH_COUNT_STATUSES.POSTED;
  }

  return normalized;
}

function findCashCountAuditRecord_(countId) {
  return listRecords(SHEET_NAMES.AUDIT_LOG)
    .filter(function(log) {
      return String(log.entity_type) === String(SHEET_NAMES.CASH_COUNTS) &&
        String(log.entity_id) === String(countId);
    })
    .sort(function(left, right) {
      return toTime_(left.timestamp) - toTime_(right.timestamp);
    })[0] || null;
}

function isCashCountDateLike_(value) {
  if (!value) {
    return false;
  }
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return !isNaN(value.getTime());
  }
  const text = String(value || '').trim();
  return /\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}/.test(text) && !isNaN(new Date(text).getTime());
}

function isInvalidCashCountActor_(value) {
  const text = String(value || '').trim();
  if (!text) {
    return true;
  }
  return isValidCashCountStatus_(text) ||
    isValidCashCountType_(text) ||
    normalizeCashCountCurrencyValue_(text) ||
    /^CB[_-]/i.test(text) ||
    safeNumber_(text) > 0;
}

function isValidCashCountStatus_(value) {
  return objectValues_(CASH_COUNT_STATUSES).indexOf(String(value || '').trim().toUpperCase()) !== -1;
}

function isValidCashCountType_(value) {
  return objectValues_(CASH_COUNT_TYPES).indexOf(String(value || '').trim().toUpperCase()) !== -1;
}

function normalizeCashCountTypeValue_(value) {
  const text = String(value || '').trim().toUpperCase();
  return isValidCashCountType_(text) ? text : '';
}

function normalizeCashCountCurrencyValue_(value) {
  const text = String(value || '').trim().toUpperCase();
  return SUPPORTED_CURRENCIES.indexOf(text) !== -1 ? text : '';
}

function isBusinessCashCountText_(value) {
  const text = String(value || '').trim();
  return Boolean(text) &&
    !isCashCountDateLike_(text) &&
    !isValidCashCountStatus_(text) &&
    !isValidCashCountType_(text) &&
    !normalizeCashCountCurrencyValue_(text) &&
    !/^CB[_-]/i.test(text) &&
    safeNumber_(text) <= 0 &&
    text.indexOf('@') === -1;
}

function normalizeDenominations_(currency, rows) {
  const allowed = getCashDenominations(currency).map(String);
  return (rows || []).map(function(row) {
    const denomination = Number(row.denomination);
    const quantity = toNonNegativeNumber_(row.quantity, 'quantity');
    if (allowed.indexOf(String(denomination)) === -1) {
      throw new Error('Unsupported denomination for currency ' + currency + ': ' + denomination);
    }
    return {
      denomination: denomination,
      quantity: quantity
    };
  }).filter(function(row) {
    return row.quantity > 0;
  });
}

function toNonNegativeNumber_(value, fieldName) {
  const numeric = Number(value || 0);
  if (!isFinite(numeric) || numeric < 0) {
    throw new Error(fieldName + ' must be non-negative number.');
  }
  return numeric;
}
