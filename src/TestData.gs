/**
 * Development test data helpers.
 *
 * Placeholder emails must be replaced with real Google Workspace emails before
 * multi-user testing. These helpers are not a production data reset tool.
 */
const TEST_DATA_USERS_ = Object.freeze([
  { user_id: 'TEST_USR_ADMIN', email: 'admin@example.com', full_name: 'TEST - Admin', role: USER_ROLES.ADMIN, active: false, default_cashbox_id: 'TEST_CB_MAIN' },
  { user_id: 'TEST_USR_DIRECTOR', email: 'director@example.com', full_name: 'TEST - Director', role: USER_ROLES.DIRECTOR, active: false, default_cashbox_id: 'TEST_CB_MAIN' },
  { user_id: 'TEST_USR_FINANCE', email: 'finance@example.com', full_name: 'TEST - Finance', role: USER_ROLES.FINANCE, active: false, default_cashbox_id: 'TEST_CB_MAIN' },
  { user_id: 'TEST_USR_SUPERVISOR', email: 'supervisor@example.com', full_name: 'TEST - Supervisor', role: USER_ROLES.CASHIER_SUPERVISOR, active: false, default_cashbox_id: 'TEST_CB_MAIN' },
  { user_id: 'TEST_USR_CASHIER', email: 'cashier@example.com', full_name: 'TEST - Cashier', role: USER_ROLES.CASHIER, active: false, default_cashbox_id: 'TEST_CB_MAIN' },
  { user_id: 'TEST_USR_APPROVER', email: 'approver@example.com', full_name: 'TEST - Approver', role: USER_ROLES.APPROVER, active: false, default_cashbox_id: 'TEST_CB_MAIN' },
  { user_id: 'TEST_USR_REQUESTER', email: 'requester@example.com', full_name: 'TEST - Requester', role: USER_ROLES.REQUESTER, active: false, default_cashbox_id: 'TEST_CB_MAIN' },
  { user_id: 'TEST_USR_VIEWER', email: 'viewer@example.com', full_name: 'TEST - Viewer', role: USER_ROLES.VIEWER, active: false, default_cashbox_id: '' }
]);

const TEST_DATA_CASHBOXES_ = Object.freeze([
  { cashbox_id: 'TEST_CB_MAIN', name: 'TEST - Glavna blagajna', location: 'Test lokacija', responsible_user_id: 'TEST_USR_CASHIER', active: true },
  { cashbox_id: 'TEST_CB_EUR', name: 'TEST - Devizna blagajna', location: 'Test lokacija', responsible_user_id: 'TEST_USR_CASHIER', active: true }
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
  if (APP_CONFIG.ENVIRONMENT === 'PROD') {
    throw new Error('Test data helpers are blocked in PROD.');
  }
  initializeDatabase();
  return {
    currencies: createTestCurrencies(),
    cashboxes: createTestCashboxes(),
    users: createTestUsers(),
    warning: 'Test users are created as inactive placeholders. Add real Google Workspace users for pilot testing.'
  };
}

function clearTestData() {
  throw new Error('clearTestData is not implemented for safety. Use a separate test spreadsheet or call a future test-only cleanup with CONFIRM_DELETE_TEST_DATA.');
}

function upsertTestRecord_(sheetName, idField, idValue, record) {
  const existing = findRecordById(sheetName, idField, idValue);
  if (existing) {
    return updateRecordById(sheetName, idField, idValue, record);
  }
  appendRecord(sheetName, record);
  return record;
}
