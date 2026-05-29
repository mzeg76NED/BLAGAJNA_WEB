/**
 * Development test data helpers.
 *
 * Placeholder emails must be replaced with real Google Workspace emails before
 * multi-user testing. These helpers are not a production data reset tool.
 */
const TEST_DATA_USERS_ = Object.freeze([
  { user_id: 'USR_TEST_ADMIN', email: 'admin@example.com', full_name: 'Test Admin', role: USER_ROLES.ADMIN, active: true, default_cashbox_id: 'CB_MAIN' },
  { user_id: 'USR_TEST_DIRECTOR', email: 'director@example.com', full_name: 'Test Director', role: USER_ROLES.DIRECTOR, active: true, default_cashbox_id: 'CB_MAIN' },
  { user_id: 'USR_TEST_FINANCE', email: 'finance@example.com', full_name: 'Test Finance', role: USER_ROLES.FINANCE, active: true, default_cashbox_id: 'CB_MAIN' },
  { user_id: 'USR_TEST_SUPERVISOR', email: 'supervisor@example.com', full_name: 'Test Supervisor', role: USER_ROLES.CASHIER_SUPERVISOR, active: true, default_cashbox_id: 'CB_MAIN' },
  { user_id: 'USR_TEST_CASHIER', email: 'cashier@example.com', full_name: 'Test Cashier', role: USER_ROLES.CASHIER, active: true, default_cashbox_id: 'CB_MAIN' },
  { user_id: 'USR_TEST_APPROVER', email: 'approver@example.com', full_name: 'Test Approver', role: USER_ROLES.APPROVER, active: true, default_cashbox_id: 'CB_MAIN' },
  { user_id: 'USR_TEST_REQUESTER', email: 'requester@example.com', full_name: 'Test Requester', role: USER_ROLES.REQUESTER, active: true, default_cashbox_id: 'CB_MAIN' },
  { user_id: 'USR_TEST_VIEWER', email: 'viewer@example.com', full_name: 'Test Viewer', role: USER_ROLES.VIEWER, active: true, default_cashbox_id: '' }
]);

const TEST_DATA_CASHBOXES_ = Object.freeze([
  { cashbox_id: 'CB_MAIN', name: 'Glavna blagajna', location: 'Test lokacija', responsible_user_id: 'USR_TEST_CASHIER', active: true },
  { cashbox_id: 'CB_EUR', name: 'Devizna blagajna', location: 'Test lokacija', responsible_user_id: 'USR_TEST_CASHIER', active: true }
]);

const TEST_DATA_CURRENCIES_ = Object.freeze([
  { currency_code: 'RSD', name: 'Srpski dinar', active: true, is_default: true },
  { currency_code: 'EUR', name: 'Evro', active: true, is_default: false }
]);

function createTestUsers() {
  const now = getCurrentTimestamp_();
  return TEST_DATA_USERS_.map(function(user) {
    return upsertTestRecord_(SHEET_NAMES.USERS, 'user_id', user.user_id, Object.assign({}, user, {
      created_at: now,
      updated_at: now
    }));
  });
}

function createTestCashboxes() {
  const now = getCurrentTimestamp_();
  return TEST_DATA_CASHBOXES_.map(function(cashbox) {
    return upsertTestRecord_(SHEET_NAMES.CASHBOXES, 'cashbox_id', cashbox.cashbox_id, Object.assign({}, cashbox, {
      created_at: now,
      updated_at: now
    }));
  });
}

function createTestCurrencies() {
  return TEST_DATA_CURRENCIES_.map(function(currency) {
    return upsertTestRecord_(SHEET_NAMES.CURRENCIES, 'currency_code', currency.currency_code, currency);
  });
}

function createMinimalTestSetup() {
  initializeDatabase();
  return {
    currencies: createTestCurrencies(),
    cashboxes: createTestCashboxes(),
    users: createTestUsers(),
    warning: 'Placeholder emails must be replaced with real Google Workspace emails before real user testing.'
  };
}

function clearTestData() {
  throw new Error('clearTestData is not implemented for safety. Use a separate test spreadsheet.');
}

function upsertTestRecord_(sheetName, idField, idValue, record) {
  const existing = findRecordById(sheetName, idField, idValue);
  if (existing) {
    return updateRecordById(sheetName, idField, idValue, record);
  }
  appendRecord(sheetName, record);
  return record;
}
