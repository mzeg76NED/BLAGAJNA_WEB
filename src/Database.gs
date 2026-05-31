/**
 * Database helpers for Google Sheets.
 */
function getDatabaseSpreadsheet_() {
  const spreadsheetId = APP_CONFIG.DATABASE_SPREADSHEET_ID || APP_CONFIG.SPREADSHEET_ID;
  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('No active spreadsheet. Set DATABASE_SPREADSHEET_ID in Config.gs.');
  }
  return spreadsheet;
}

function initializeDatabase() {
  const spreadsheet = getDatabaseSpreadsheet_();
  Object.keys(SHEET_NAMES).forEach(function(key) {
    const sheetName = SHEET_NAMES[key];
    const headers = TABLE_HEADERS[sheetName];
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      syncConfiguredHeaders_(sheet, headers);
    }

    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  });

  seedInitialCurrencies_();
}

function getSheetByNameOrThrow(sheetName) {
  const sheet = getDatabaseSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  return sheet;
}

function getHeaders_(sheet) {
  const configured = TABLE_HEADERS[sheet.getName()];
  if (configured && configured.length) {
    return configured.slice();
  }
  return getActualHeaders_(sheet);
}

function getActualHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    return [];
  }
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function appendRecord(sheetName, record) {
  const sheet = getSheetByNameOrThrow(sheetName);
  const headers = getConfiguredHeaders_(sheetName);
  const row = headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '';
  });

  sheet.appendRow(row);
  return record;
}

function findRecordById(sheetName, idField, idValue) {
  const sheet = getSheetByNameOrThrow(sheetName);
  const headers = getHeaders_(sheet);
  const idIndex = headers.indexOf(idField);

  if (idIndex === -1) {
    throw new Error('ID field not found in ' + sheetName + ': ' + idField);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(idValue)) {
      return {
        rowNumber: i + 2,
        record: rowToRecord_(headers, values[i])
      };
    }
  }

  return null;
}

function updateRecordById(sheetName, idField, idValue, updates) {
  const match = findRecordById(sheetName, idField, idValue);
  if (!match) {
    throw new Error('Record not found in ' + sheetName + ': ' + idField + '=' + idValue);
  }

  if (sheetName === SHEET_NAMES.CASH_EVENTS && idField === 'event_id') {
    preventDirectEditOfLockedCashEvent(idValue, updates || {});
  }

  const sheet = getSheetByNameOrThrow(sheetName);
  const headers = getHeaders_(sheet);
  const updatedRecord = {};

  headers.forEach(function(header) {
    updatedRecord[header] = Object.prototype.hasOwnProperty.call(updates, header)
      ? updates[header]
      : match.record[header];
  });

  const row = headers.map(function(header) {
    return updatedRecord[header];
  });

  sheet.getRange(match.rowNumber, 1, 1, headers.length).setValues([row]);
  return updatedRecord;
}

function listRecords(sheetName, filters) {
  const sheet = getSheetByNameOrThrow(sheetName);
  const headers = getConfiguredHeaders_(sheetName);
  const lastRow = sheet.getLastRow();
  const activeFilters = filters || {};

  if (lastRow < 2) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .map(function(row) {
      return rowToRecord_(headers, row);
    })
    .filter(function(record) {
      return Object.keys(activeFilters).every(function(field) {
        return String(record[field]) === String(activeFilters[field]);
      });
    });
}

function listLatestRecords(sheetName, limit, filters) {
  const sheet = getSheetByNameOrThrow(sheetName);
  const headers = getConfiguredHeaders_(sheetName);
  const lastRow = sheet.getLastRow();
  const maxRows = Number(limit || 100);
  const rowCount = isFinite(maxRows) && maxRows > 0 ? Math.min(maxRows, Math.max(lastRow - 1, 0)) : Math.max(lastRow - 1, 0);
  const activeFilters = filters || {};

  if (rowCount < 1) {
    return [];
  }

  const startRow = lastRow - rowCount + 1;
  return sheet.getRange(startRow, 1, rowCount, headers.length)
    .getValues()
    .reverse()
    .map(function(row) {
      return rowToRecord_(headers, row);
    })
    .filter(function(record) {
      return Object.keys(activeFilters).every(function(field) {
        return String(record[field]) === String(activeFilters[field]);
      });
    });
}

function runDatabaseSmokeTest() {
  initializeDatabase();

  const now = new Date();
  const sampleUserId = 'USR-SMOKE-TEST';
  const sampleUser = {
    user_id: sampleUserId,
    email: 'smoke.test@example.com',
    full_name: 'Smoke Test User',
    role: USER_ROLES.VIEWER,
    active: true,
    default_cashbox_id: '',
    created_at: now,
    updated_at: ''
  };

  const existing = findRecordById(SHEET_NAMES.USERS, 'user_id', sampleUserId);
  if (!existing) {
    appendRecord(SHEET_NAMES.USERS, sampleUser);
  }

  const found = findRecordById(SHEET_NAMES.USERS, 'user_id', sampleUserId);
  const updated = updateRecordById(SHEET_NAMES.USERS, 'user_id', sampleUserId, {
    full_name: 'Smoke Test User Updated',
    updated_at: new Date()
  });

  writeAuditLog(
    AUDIT_ACTIONS.UPDATE,
    SHEET_NAMES.USERS,
    sampleUserId,
    found ? found.record : null,
    updated,
    'Database smoke test'
  );

  return {
    userFound: Boolean(found),
    updatedName: updated.full_name
  };
}

function getConfiguredHeaders_(sheetName) {
  const headers = TABLE_HEADERS[sheetName];
  if (!headers) {
    throw new Error('Headers are not configured for sheet: ' + sheetName);
  }
  return headers;
}

function syncConfiguredHeaders_(sheet, configuredHeaders) {
  const existingHeaders = getActualHeaders_(sheet);
  const headersToAdd = configuredHeaders.filter(function(header) {
    return existingHeaders.indexOf(header) === -1;
  });

  if (headersToAdd.length === 0) {
    return;
  }

  const startColumn = existingHeaders.length + 1;
  sheet.getRange(1, startColumn, 1, headersToAdd.length).setValues([headersToAdd]);
}

function rowToRecord_(headers, row) {
  const record = {};
  headers.forEach(function(header, index) {
    record[header] = row[index];
  });
  return record;
}

function seedInitialCurrencies_() {
  const initialCurrencies = [
    { currency_code: 'RSD', name: 'Srpski dinar', active: true, is_default: true, denominations: '5000,2000,1000,500,200,100,50,20,10,5,2,1' },
    { currency_code: 'EUR', name: 'Evro', active: true, is_default: false, denominations: '500,200,100,50,20,10,5,2,1' }
  ];

  initialCurrencies.forEach(function(currency) {
    const existing = findRecordById(
      SHEET_NAMES.CURRENCIES,
      'currency_code',
      currency.currency_code
    );
    if (!existing) {
      appendRecord(SHEET_NAMES.CURRENCIES, currency);
    }
  });
}
