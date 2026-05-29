/**
 * Administrator readiness checks for pilot rollout.
 *
 * These helpers are read-only and must not change business records.
 */
function getSystemStatus() {
  const warnings = [];
  let activeUserEmail = '';
  let databaseStatus = { ok: false, message: '' };
  let sheetStatus = [];
  let documentRootStatus = { ok: false, message: '' };
  let users = [];
  let cashboxes = [];
  let currencies = [];

  try {
    activeUserEmail = getCurrentUserEmail();
  } catch (error) {
    warnings.push(error.message);
  }

  try {
    const spreadsheet = getDatabaseSpreadsheet_();
    databaseStatus = {
      ok: true,
      id: spreadsheet.getId(),
      name: spreadsheet.getName(),
      url: spreadsheet.getUrl()
    };
    sheetStatus = getRequiredSheetsStatus_();
    users = listRecords(SHEET_NAMES.USERS);
    cashboxes = listRecords(SHEET_NAMES.CASHBOXES);
    currencies = listRecords(SHEET_NAMES.CURRENCIES);
  } catch (error) {
    databaseStatus = { ok: false, message: error.message };
    warnings.push('Database check failed: ' + error.message);
  }

  try {
    const folder = getDocumentRootFolder_();
    documentRootStatus = {
      ok: true,
      id: folder.getId(),
      name: folder.getName(),
      url: folder.getUrl()
    };
  } catch (error) {
    documentRootStatus = { ok: false, message: error.message };
    warnings.push('Document folder check failed: ' + error.message);
  }

  const dangerousDefaults = validateNoDangerousDefaults();
  return {
    appName: APP_CONFIG.APP_NAME,
    version: APP_CONFIG.VERSION,
    environment: APP_CONFIG.ENVIRONMENT,
    activeUserEmail: activeUserEmail,
    database: databaseStatus,
    requiredSheets: sheetStatus,
    documentRootFolder: documentRootStatus,
    usersCount: users.length,
    activeUsersCount: users.filter(function(user) { return isTruthy_(user.active); }).length,
    cashboxesCount: cashboxes.length,
    activeCashboxesCount: cashboxes.filter(function(cashbox) { return isTruthy_(cashbox.active); }).length,
    currencies: currencies.map(function(currency) {
      return {
        currency_code: currency.currency_code,
        active: isTruthy_(currency.active),
        is_default: isTruthy_(currency.is_default)
      };
    }),
    warnings: warnings.concat(dangerousDefaults.errors).concat(dangerousDefaults.warnings)
  };
}

function validateSystemSetup() {
  const errors = [];
  const warnings = [];

  try {
    getDatabaseSpreadsheet_();
  } catch (error) {
    errors.push('Database connection failed: ' + error.message);
  }

  try {
    getRequiredSheetsStatus_().forEach(function(item) {
      if (!item.exists) {
        errors.push('Missing sheet: ' + item.sheetName);
      }
      if (item.missingHeaders.length > 0) {
        errors.push('Missing headers in ' + item.sheetName + ': ' + item.missingHeaders.join(', '));
      }
    });
  } catch (error) {
    errors.push('Required sheet validation failed: ' + error.message);
  }

  try {
    const users = listRecords(SHEET_NAMES.USERS);
    if (!users.some(function(user) { return user.role === USER_ROLES.ADMIN && isTruthy_(user.active); })) {
      errors.push('At least one active ADMIN user is required.');
    }
    if (!users.some(function(user) { return user.role === USER_ROLES.CASHIER && isTruthy_(user.active); })) {
      errors.push('At least one active CASHIER user is required.');
    }
  } catch (error) {
    errors.push('User validation failed: ' + error.message);
  }

  try {
    const cashboxes = listRecords(SHEET_NAMES.CASHBOXES);
    if (!cashboxes.some(function(cashbox) { return isTruthy_(cashbox.active); })) {
      errors.push('At least one active cashbox is required.');
    }
  } catch (error) {
    errors.push('Cashbox validation failed: ' + error.message);
  }

  try {
    const rsd = findRecordById(SHEET_NAMES.CURRENCIES, 'currency_code', 'RSD');
    if (!rsd || !isTruthy_(rsd.record.active)) {
      errors.push('RSD currency must exist and be active.');
    }
  } catch (error) {
    errors.push('Currency validation failed: ' + error.message);
  }

  try {
    getDocumentRootFolder_();
  } catch (error) {
    errors.push('Document root folder is not available: ' + error.message);
  }

  ['doGet', 'apiCreatePaymentRequest', 'apiExecutePaymentOrder', 'getManagementDashboardSummary'].forEach(function(name) {
    if (typeof globalThis[name] !== 'function') {
      warnings.push('WebApp function not found in global scope: ' + name);
    }
  });

  try {
    getSheetByNameOrThrow(SHEET_NAMES.AUDIT_LOG);
  } catch (error) {
    errors.push('Audit log sheet is not available: ' + error.message);
  }

  const dangerousDefaults = validateNoDangerousDefaults();
  return {
    ok: errors.length === 0 && dangerousDefaults.errors.length === 0,
    errors: errors.concat(dangerousDefaults.errors),
    warnings: warnings.concat(dangerousDefaults.warnings)
  };
}

function validateNoDangerousDefaults() {
  const errors = [];
  const warnings = [];
  const environment = APP_CONFIG.ENVIRONMENT || 'DEV';
  const isPilotOrProd = environment === 'PILOT' || environment === 'PROD';
  const placeholderEmails = [
    'admin@example.com',
    'director@example.com',
    'finance@example.com',
    'supervisor@example.com',
    'cashier@example.com',
    'approver@example.com',
    'requester@example.com',
    'viewer@example.com',
    'smoke.test@example.com'
  ];

  if (environment === 'PROD' && APP_CONFIG.DEBUG_MODE === true) {
    errors.push('DEBUG_MODE must be false in PROD.');
  }
  if (environment === 'PROD' && !APP_CONFIG.DATABASE_SPREADSHEET_ID) {
    warnings.push('PROD should use explicit DATABASE_SPREADSHEET_ID, not only active spreadsheet fallback.');
  }
  if (environment === 'PROD' && !APP_CONFIG.DOCUMENT_ROOT_FOLDER_ID) {
    warnings.push('PROD should use explicit DOCUMENT_ROOT_FOLDER_ID after the folder is created and verified.');
  }
  if (environment !== 'DEV' && APP_CONFIG.DEVELOPMENT_MODE === true) {
    errors.push('Development fallback must not be enabled outside DEV.');
  }

  try {
    const activePlaceholders = listRecords(SHEET_NAMES.USERS)
      .filter(function(user) {
        return isTruthy_(user.active) && placeholderEmails.indexOf(String(user.email || '').toLowerCase()) !== -1;
      })
      .map(function(user) { return user.email; });
    if (isPilotOrProd && activePlaceholders.length > 0) {
      errors.push('Active placeholder users are not allowed in ' + environment + ': ' + activePlaceholders.join(', '));
    }
  } catch (error) {
    warnings.push('Could not validate placeholder users: ' + error.message);
  }

  return {
    ok: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

function listTodoMarkers() {
  return {
    supported: false,
    message: 'Apps Script cannot reliably scan project source files at runtime. Review TODO markers manually in the repository before pilot.'
  };
}

function getRequiredSheetsStatus_() {
  const spreadsheet = getDatabaseSpreadsheet_();
  return Object.keys(SHEET_NAMES).map(function(key) {
    const sheetName = SHEET_NAMES[key];
    const sheet = spreadsheet.getSheetByName(sheetName);
    const expectedHeaders = TABLE_HEADERS[sheetName] || [];
    const headers = sheet ? getHeaders_(sheet) : [];
    const missingHeaders = expectedHeaders.filter(function(header) {
      return headers.indexOf(header) === -1;
    });
    return {
      sheetName: sheetName,
      exists: Boolean(sheet),
      headerCount: headers.length,
      expectedHeaderCount: expectedHeaders.length,
      missingHeaders: missingHeaders
    };
  });
}
