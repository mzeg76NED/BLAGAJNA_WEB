/**
 * Every future business action must write to AUDIT_LOG.
 * Audit rows are append-only.
 */
function writeAuditLog(action, entityType, entityId, oldValue, newValue, comment) {
  if (typeof ensureAuditAppContextColumns === 'function') {
    ensureAuditAppContextColumns();
  }
  assertAllowedValue(action, objectValues_(AUDIT_ACTIONS), 'action');
  const auditContext = typeof buildAuditContextFromSession === 'function'
    ? buildAuditContextFromSession(null, extractAuditContextFromValues_(oldValue, newValue))
    : {};

  const record = {
    log_id: generateId_('LOG'),
    timestamp: new Date(),
    user: getActiveUserEmail_(),
    app_user_id: auditContext.app_user_id || '',
    app_user_name: auditContext.app_user_name || '',
    user_code: auditContext.user_code || '',
    role: auditContext.role || '',
    google_session_email: auditContext.google_session_email || '',
    cashbox_id: auditContext.cashbox_id || '',
    shift_id: auditContext.shift_id || '',
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

function extractAuditContextFromValues_(oldValue, newValue) {
  const source = newValue && typeof newValue === 'object' ? newValue : oldValue && typeof oldValue === 'object' ? oldValue : {};
  return {
    cashbox_id: source.cashbox_id || source.preferred_cashbox_id || '',
    shift_id: source.shift_id || ''
  };
}

function getActiveUserEmail_() {
  return getCurrentUserEmail();
}

function objectValues_(source) {
  return Object.keys(source).map(function(key) {
    return source[key];
  });
}
