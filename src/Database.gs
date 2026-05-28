/**
 * Database helpers for Google Sheets.
 */
function initializeDatabase() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEET_NAMES).forEach(function(key) {
    const sheetName = SHEET_NAMES[key];
    if (!spreadsheet.getSheetByName(sheetName)) {
      spreadsheet.insertSheet(sheetName);
    }
  });

  // TODO: Add headers, validation rules, protected ranges, and initial seed data.
}

function getSheetByNameOrThrow(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  return sheet;
}

function appendRecord(sheetName, record) {
  const sheet = getSheetByNameOrThrow(sheetName);
  // TODO: Map object fields to configured sheet headers before appending.
  sheet.appendRow(Object.keys(record).map(function(key) {
    return record[key];
  }));
}

function findRecordById(sheetName, idField, idValue) {
  // TODO: Read sheet data, map rows to objects, and return the matching record.
  throw new Error('TODO: findRecordById is not implemented yet.');
}

function updateRecordById(sheetName, idField, idValue, updates) {
  // TODO: Locate record by id and update only allowed fields.
  throw new Error('TODO: updateRecordById is not implemented yet.');
}
