/**
 * Basic validation helpers shared by business modules.
 */
function assertRequiredFields(data, requiredFields) {
  if (!data) {
    throw new Error('Data object is required.');
  }
  const missingFields = requiredFields.filter(function(field) {
    return data[field] === undefined || data[field] === null || data[field] === '';
  });

  if (missingFields.length > 0) {
    throw new Error('Missing required fields: ' + missingFields.join(', '));
  }
}

function assertPositiveAmount(amount, fieldName) {
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error((fieldName || 'amount') + ' must be a positive number.');
  }
}

function assertNonNegativeAmount(amount, fieldName) {
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || numericAmount < 0) {
    throw new Error((fieldName || 'amount') + ' must be a non-negative number.');
  }
}

function assertAllowedValue(value, allowedValues, fieldName) {
  if (!allowedValues || allowedValues.indexOf(value) === -1) {
    throw new Error('Invalid value for ' + fieldName + ': ' + value);
  }
}

function assertEntityType(entityType) {
  assertAllowedValue(entityType, objectValues_(ENTITY_TYPES), 'entityType');
}

function assertValidFilePayload(filePayload) {
  if (!filePayload) {
    throw new Error('File payload is required.');
  }
  assertNonEmptyString(filePayload.fileName, 'fileName');
  assertNonEmptyString(filePayload.base64Data, 'base64Data');
  if (filePayload.mimeType !== undefined && filePayload.mimeType !== null && filePayload.mimeType !== '') {
    assertNonEmptyString(filePayload.mimeType, 'mimeType');
  }
  try {
    Utilities.base64Decode(String(filePayload.base64Data));
  } catch (error) {
    throw new Error('base64Data must be valid base64 content.');
  }
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(fieldName + ' must be a non-empty string.');
  }
}

function assertMandatoryReason(reason) {
  assertNonEmptyString(reason, 'reason');
}

function assertActiveCurrency(currency) {
  assertNonEmptyString(currency, 'currency');

  const existing = findRecordById(SHEET_NAMES.CURRENCIES, 'currency_code', currency);
  if (!existing) {
    throw new Error('Currency not found: ' + currency);
  }
  if (!isTruthy_(existing.record.active)) {
    throw new Error('Currency is not active: ' + currency);
  }
}

function assertActiveCashbox(cashboxId) {
  assertNonEmptyString(cashboxId, 'cashboxId');

  const existing = findRecordById(SHEET_NAMES.CASHBOXES, 'cashbox_id', cashboxId);
  if (!existing) {
    throw new Error('Cashbox not found: ' + cashboxId);
  }
  if (!isTruthy_(existing.record.active)) {
    throw new Error('Cashbox is not active: ' + cashboxId);
  }
}

function assertEntityStatus(record, allowedStatuses, entityName) {
  if (!record) {
    throw new Error(entityName + ' record is required.');
  }
  assertAllowedValue(record.status, allowedStatuses, entityName + ' status');
}

function assertSufficientBalance(balance, amount, cashboxId, currency) {
  if (Number(balance) < Number(amount)) {
    throw new Error(
      'Insufficient balance for cashbox ' + cashboxId + ' and currency ' + currency +
      '. Available: ' + balance + ', required: ' + amount + '.'
    );
  }
}

function assertValidDate(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error((fieldName || 'date') + ' is required.');
  }
  const dateValue = value instanceof Date ? value : new Date(value);
  if (isNaN(dateValue.getTime())) {
    throw new Error((fieldName || 'date') + ' must be a valid date.');
  }
  return dateValue;
}

function assertNoOpenShiftForCashbox(cashboxId) {
  const openShift = getActiveShiftForCashbox(cashboxId);
  if (openShift) {
    throw new Error('Cannot perform this action while cashbox has an open shift: ' + openShift.shift_id);
  }
}

function getCurrentTimestamp_() {
  return new Date();
}
