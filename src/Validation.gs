/**
 * Basic validation helpers shared by business modules.
 */
function assertRequiredFields(data, requiredFields) {
  const missingFields = requiredFields.filter(function(field) {
    return data[field] === undefined || data[field] === null || data[field] === '';
  });

  if (missingFields.length > 0) {
    throw new Error('Missing required fields: ' + missingFields.join(', '));
  }
}

function assertPositiveAmount(amount) {
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Amount must be a positive number.');
  }
}

function assertAllowedValue(value, allowedValues, fieldName) {
  if (allowedValues.indexOf(value) === -1) {
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
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(fieldName + ' must be a non-empty string.');
  }
}

function assertActiveCurrency(currency) {
  assertAllowedValue(currency, SUPPORTED_CURRENCIES, 'currency');

  const existing = findRecordById(SHEET_NAMES.CURRENCIES, 'currency_code', currency);
  if (!existing) {
    throw new Error('Currency not found: ' + currency);
  }
  if (existing && existing.record.active !== true && existing.record.active !== 'TRUE') {
    throw new Error('Currency is not active: ' + currency);
  }
}

function assertActiveCashbox(cashboxId) {
  if (!cashboxId) {
    throw new Error('Cashbox is required.');
  }

  const existing = findRecordById(SHEET_NAMES.CASHBOXES, 'cashbox_id', cashboxId);
  if (!existing) {
    throw new Error('Cashbox not found: ' + cashboxId);
  }
  if (existing.record.active !== true && existing.record.active !== 'TRUE') {
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

function getCurrentTimestamp_() {
  return new Date();
}
