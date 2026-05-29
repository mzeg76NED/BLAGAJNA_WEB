/**
 * Backup and CSV export helpers for pilot operations.
 */
const BACKUP_EXPORT_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.FINANCE
]);

function createDatabaseBackupCopy() {
  const currentUser = assertUserHasRole(BACKUP_EXPORT_ROLES_);
  const spreadsheet = getDatabaseSpreadsheet_();
  const timezone = Session.getScriptTimeZone() || 'Europe/Belgrade';
  const timestamp = Utilities.formatDate(new Date(), timezone, 'yyyyMMdd-HHmmss');
  const backupName = APP_CONFIG.APP_NAME + ' backup ' + APP_CONFIG.ENVIRONMENT + ' ' + timestamp;
  const backupFolder = createBackupFolderIfMissing_();
  const sourceFile = DriveApp.getFileById(spreadsheet.getId());
  const backupFile = sourceFile.makeCopy(backupName, backupFolder);
  const result = {
    backup_file_id: backupFile.getId(),
    backup_file_url: backupFile.getUrl(),
    backup_file_name: backupFile.getName(),
    created_by: currentUser.email,
    created_at: new Date()
  };

  writeAuditLog(
    AUDIT_ACTIONS.BACKUP,
    'DATABASE',
    spreadsheet.getId(),
    null,
    result,
    'Database spreadsheet backup copy created.'
  );

  return result;
}

function exportSheetAsCsv(sheetName) {
  assertUserHasRole(BACKUP_EXPORT_ROLES_);
  assertAllowedValue(sheetName, objectValues_(SHEET_NAMES), 'sheetName');
  const sheet = getSheetByNameOrThrow(sheetName);
  const values = sheet.getDataRange().getValues();
  return values.map(function(row) {
    return row.map(csvEscape_).join(',');
  }).join('\r\n');
}

function exportAllCoreSheetsAsCsv() {
  assertUserHasRole(BACKUP_EXPORT_ROLES_);
  return Object.keys(SHEET_NAMES).reduce(function(result, key) {
    const sheetName = SHEET_NAMES[key];
    result[sheetName] = exportSheetAsCsv(sheetName);
    return result;
  }, {});
}

function createBackupFolderIfMissing_() {
  if (APP_CONFIG.BACKUP_ROOT_FOLDER_ID) {
    return DriveApp.getFolderById(APP_CONFIG.BACKUP_ROOT_FOLDER_ID);
  }

  const spreadsheetFile = DriveApp.getFileById(getDatabaseSpreadsheet_().getId());
  const parents = spreadsheetFile.getParents();
  const parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const folders = parentFolder.getFoldersByName(APP_CONFIG.BACKUP_ROOT_FOLDER_NAME || 'BLAGAJNA_WEB_BACKUPS');
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(APP_CONFIG.BACKUP_ROOT_FOLDER_NAME || 'BLAGAJNA_WEB_BACKUPS');
}

function csvEscape_(value) {
  if (value === undefined || value === null) {
    return '';
  }
  const text = value instanceof Date
    ? Utilities.formatDate(value, Session.getScriptTimeZone() || 'Europe/Belgrade', 'yyyy-MM-dd HH:mm:ss')
    : String(value);
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}
