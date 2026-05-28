/**
 * Currency helpers.
 */
function assertSupportedCurrency(currency) {
  if (SUPPORTED_CURRENCIES.indexOf(currency) === -1) {
    throw new Error('Unsupported currency: ' + currency);
  }
}

function listSupportedCurrencies() {
  return SUPPORTED_CURRENCIES.slice();
}
