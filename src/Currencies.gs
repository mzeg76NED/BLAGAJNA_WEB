/**
 * Currency helpers.
 */
function assertSupportedCurrency(currency) {
  const supported = listSupportedCurrencies();
  if (supported.indexOf(currency) === -1) {
    throw new Error('Unsupported currency: ' + currency);
  }
}

function listSupportedCurrencies() {
  const records = listRecords(SHEET_NAMES.CURRENCIES)
    .filter(function(currency) {
      return isTruthy_(currency.active);
    })
    .map(function(currency) {
      return String(currency.currency_code || '').trim();
    })
    .filter(function(currencyCode) {
      return currencyCode !== '';
    });

  return records.length ? records : SUPPORTED_CURRENCIES.slice();
}

function getDefaultCurrencyCode() {
  const records = listRecords(SHEET_NAMES.CURRENCIES)
    .filter(function(currency) {
      return isTruthy_(currency.active);
    });
  const defaultRecord = records.filter(function(currency) {
    return isTruthy_(currency.is_default);
  })[0] || records[0];

  return defaultRecord && defaultRecord.currency_code
    ? String(defaultRecord.currency_code).trim()
    : SUPPORTED_CURRENCIES[0];
}
