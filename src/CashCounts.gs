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
  initializeDatabase();
  const currentUser = requireActiveUserWithRole_(CASH_COUNT_ROLES_);
  data = data || {};
  const cashboxId = data.cashbox_id;
  const currency = data.currency;
  const countType = data.count_type || CASH_COUNT_TYPES.CASHBOX_COUNT;

  assertNonEmptyString(cashboxId, 'cashbox_id');
  assertActiveCashbox(cashboxId);
  assertActiveCurrency(currency);
  assertAllowedValue(countType, objectValues_(CASH_COUNT_TYPES), 'count_type');

  const activeShift = getActiveShiftForCashbox(cashboxId);
  const denominations = normalizeDenominations_(currency, data.denominations || []);
  const countedCashTotal = denominations.reduce(function(total, item) {
    return total + item.denomination * item.quantity;
  }, 0);
  const checkCount = toNonNegativeNumber_(data.check_count, 'check_count');
  const checkTotal = toNonNegativeNumber_(data.check_total, 'check_total');
  const calculatedBalance = calculateCashboxBalance(cashboxId, currency);
  const difference = countedCashTotal + checkTotal - calculatedBalance;
  const now = getCurrentTimestamp_();
  const record = {
    count_id: generateId_('CNT'),
    created_at: now,
    created_by: currentUser.email,
    count_type: countType,
    cashbox_id: cashboxId,
    shift_id: activeShift ? activeShift.shift_id : '',
    currency: currency,
    counted_cash_total: countedCashTotal,
    check_count: checkCount,
    check_total: checkTotal,
    calculated_balance_before: calculatedBalance,
    difference: difference,
    denominations_json: serializeJson_(denominations),
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
    'Cash count posted. Count does not alter cash events or balance.'
  );
  return record;
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
