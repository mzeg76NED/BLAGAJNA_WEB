/**
 * Every future business action must write to AUDIT_LOG.
 * Audit rows are append-only.
 */
function writeAuditLog(action, entityType, entityId, oldValue, newValue, comment) {
  assertAllowedValue(action, objectValues_(AUDIT_ACTIONS), 'action');

  const record = {
    log_id: generateId_('LOG'),
    timestamp: new Date(),
    user: getActiveUserEmail_(),
    action: action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: stringifyAuditValue_(oldValue),
    new_value: stringifyAuditValue_(newValue),
    comment: comment || ''
  };

  appendRecord(SHEET_NAMES.AUDIT_LOG, record);
  return record;
}

function generateId_(prefix) {
  const timezone = Session.getScriptTimeZone() || 'Europe/Belgrade';
  const timestamp = Utilities.formatDate(new Date(), timezone, 'yyyyMMdd-HHmmss');
  const randomPart = Utilities.getUuid().split('-')[0].toUpperCase();
  return prefix + '-' + timestamp + '-' + randomPart;
}

function stringifyAuditValue_(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return JSON.stringify(value);
}

function getActiveUserEmail_() {
  const activeUser = Session.getActiveUser();
  return activeUser && activeUser.getEmail() ? activeUser.getEmail() : 'UNKNOWN_USER';
}

function objectValues_(source) {
  return Object.keys(source).map(function(key) {
    return source[key];
  });
}
