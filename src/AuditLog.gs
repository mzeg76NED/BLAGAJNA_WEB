/**
 * Every future business action must write to AUDIT_LOG.
 */
function writeAuditLog(action, entityType, entityId, oldValue, newValue, comment) {
  const record = {
    timestamp: new Date(),
    userEmail: getCurrentUser().email,
    action: action,
    entityType: entityType,
    entityId: entityId,
    oldValue: JSON.stringify(oldValue || null),
    newValue: JSON.stringify(newValue || null),
    comment: comment || ''
  };

  // TODO: Align record fields with AUDIT_LOG headers before appending.
  appendRecord(SHEET_NAMES.AUDIT_LOG, record);
}
