/**
 * Document metadata and Google Drive storage helpers.
 */
const DOCUMENT_ATTACH_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR,
  USER_ROLES.CASHIER,
  USER_ROLES.APPROVER,
  USER_ROLES.REQUESTER
]);

const DOCUMENT_MANAGE_ROLES_ = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.DIRECTOR,
  USER_ROLES.FINANCE,
  USER_ROLES.CASHIER_SUPERVISOR
]);

function attachDocumentToEntity(entityType, entityId, filePayload, note) {
  requireActiveUserWithRole_(DOCUMENT_ATTACH_ROLES_);
  assertEntityType(entityType);
  assertNonEmptyString(entityId, 'entityId');
  assertValidFilePayload(filePayload);
  assertEntityExists_(entityType, entityId);

  const fileInfo = uploadFileToDrive_(entityType, filePayload);
  const document = createDocumentMetadata(entityType, entityId, fileInfo, note);
  updateEntityDocumentStatus_(entityType, entityId, DOCUMENT_STATUSES.ATTACHED);

  writeAuditLog(
    AUDIT_ACTIONS.CREATE,
    SHEET_NAMES.DOCUMENTS,
    document.document_id,
    null,
    document,
    'Document attached to ' + entityType + '.'
  );

  return document;
}

function linkDocumentToEntity(documentData) {
  const data = documentData || {};
  return attachDocumentToEntity(data.entity_type, data.entity_id, data.filePayload, data.note);
}

function createDocumentMetadata(entityType, entityId, fileInfo, note) {
  const currentUser = getCurrentUser();
  assertEntityType(entityType);
  assertNonEmptyString(entityId, 'entityId');
  assertRequiredFields(fileInfo || {}, ['file_id', 'file_url', 'file_name']);

  const document = {
    document_id: generateId_('DOC'),
    created_at: getCurrentTimestamp_(),
    uploaded_by: currentUser.email,
    entity_type: entityType,
    entity_id: entityId,
    file_name: fileInfo.file_name,
    file_id: fileInfo.file_id,
    file_url: fileInfo.file_url,
    mime_type: fileInfo.mime_type || '',
    status: DOCUMENT_STATUSES.ACTIVE,
    note: note || ''
  };

  appendRecord(SHEET_NAMES.DOCUMENTS, document);
  return document;
}

function uploadFileToDrive_(entityType, filePayload) {
  assertEntityType(entityType);
  assertValidFilePayload(filePayload);

  const folder = getDocumentTargetFolder_(entityType);
  const mimeType = filePayload.mimeType || 'application/octet-stream';
  const base64Data = String(filePayload.base64Data).indexOf(',') === -1
    ? filePayload.base64Data
    : String(filePayload.base64Data).split(',').pop();
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, mimeType, filePayload.fileName);
  const file = folder.createFile(blob);

  return {
    file_id: file.getId(),
    file_url: file.getUrl(),
    file_name: file.getName(),
    mime_type: mimeType
  };
}

function listDocumentsForEntity(entityType, entityId) {
  requireActiveUserWithRole_(DOCUMENT_ATTACH_ROLES_);
  assertEntityType(entityType);
  assertNonEmptyString(entityId, 'entityId');

  return listRecords(SHEET_NAMES.DOCUMENTS, {
    entity_type: entityType,
    entity_id: entityId
  }).sort(function(left, right) {
    return toTime_(right.created_at) - toTime_(left.created_at);
  });
}

function listActiveDocumentsForEntity(entityType, entityId) {
  return listDocumentsForEntity(entityType, entityId).filter(function(document) {
    return document.status === DOCUMENT_STATUSES.ACTIVE;
  });
}

function cancelDocument(documentId, reason) {
  requireActiveUserWithRole_(DOCUMENT_MANAGE_ROLES_);
  assertNonEmptyString(documentId, 'documentId');
  assertNonEmptyString(reason, 'reason');

  const match = getDocumentMatchOrThrow_(documentId);
  const before = match.record;
  const updated = updateRecordById(
    SHEET_NAMES.DOCUMENTS,
    'document_id',
    documentId,
    {
      status: DOCUMENT_STATUSES.CANCELLED,
      note: appendNote_(before.note, 'Cancelled: ' + reason)
    }
  );

  updateEntityDocumentStatusAfterDocumentChange_(updated.entity_type, updated.entity_id);
  writeAuditLog(
    AUDIT_ACTIONS.CANCEL,
    SHEET_NAMES.DOCUMENTS,
    documentId,
    before,
    updated,
    reason
  );

  return updated;
}

function replaceDocument(documentId, filePayload, note) {
  requireActiveUserWithRole_(DOCUMENT_MANAGE_ROLES_);
  assertNonEmptyString(documentId, 'documentId');
  assertValidFilePayload(filePayload);

  const match = getDocumentMatchOrThrow_(documentId);
  const before = match.record;
  const replaced = updateRecordById(
    SHEET_NAMES.DOCUMENTS,
    'document_id',
    documentId,
    {
      status: DOCUMENT_STATUSES.REPLACED,
      note: appendNote_(before.note, 'Replaced by new document.')
    }
  );
  const fileInfo = uploadFileToDrive_(before.entity_type, filePayload);
  const created = createDocumentMetadata(before.entity_type, before.entity_id, fileInfo, note);
  updateEntityDocumentStatus_(before.entity_type, before.entity_id, DOCUMENT_STATUSES.ATTACHED);

  writeAuditLog(
    AUDIT_ACTIONS.UPDATE,
    SHEET_NAMES.DOCUMENTS,
    documentId,
    before,
    replaced,
    'Document replaced.'
  );
  writeAuditLog(
    AUDIT_ACTIONS.CREATE,
    SHEET_NAMES.DOCUMENTS,
    created.document_id,
    null,
    created,
    'Replacement document created.'
  );

  return created;
}

function updateEntityDocumentStatus_(entityType, entityId, newStatus) {
  assertEntityType(entityType);
  const entityConfig = ENTITY_TABLE_MAP[entityType];
  const sheet = getSheetByNameOrThrow(entityConfig.sheetName);
  const headers = getHeaders_(sheet);

  if (headers.indexOf('document_status') === -1) {
    return null;
  }

  return updateRecordById(
    entityConfig.sheetName,
    entityConfig.idField,
    entityId,
    { document_status: newStatus }
  );
}

function assertEntityExists_(entityType, entityId) {
  assertEntityType(entityType);
  const entityConfig = ENTITY_TABLE_MAP[entityType];
  const match = findRecordById(entityConfig.sheetName, entityConfig.idField, entityId);

  if (!match) {
    throw new Error(entityType + ' not found: ' + entityId);
  }

  return match.record;
}

function getDocumentRootFolder_() {
  if (DOCUMENT_ROOT_FOLDER_ID) {
    return DriveApp.getFolderById(DOCUMENT_ROOT_FOLDER_ID);
  }

  const folders = DriveApp.getFoldersByName(DOCUMENT_ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(DOCUMENT_ROOT_FOLDER_NAME);
}

function getDocumentTargetFolder_(entityType) {
  const rootFolder = getDocumentRootFolder_();
  const folders = rootFolder.getFoldersByName(entityType);
  if (folders.hasNext()) {
    return folders.next();
  }
  return rootFolder.createFolder(entityType);
}

function getDocumentMatchOrThrow_(documentId) {
  const match = findRecordById(SHEET_NAMES.DOCUMENTS, 'document_id', documentId);
  if (!match) {
    throw new Error('Document not found: ' + documentId);
  }
  return match;
}

function updateEntityDocumentStatusAfterDocumentChange_(entityType, entityId) {
  const activeDocuments = listRecords(SHEET_NAMES.DOCUMENTS, {
    entity_type: entityType,
    entity_id: entityId,
    status: DOCUMENT_STATUSES.ACTIVE
  });
  const fallbackStatus = entityType === ENTITY_TYPES.PAYMENT_ORDER || entityType === ENTITY_TYPES.CASH_EVENT
    ? DOCUMENT_STATUSES.MISSING
    : DOCUMENT_STATUSES.NONE;

  updateEntityDocumentStatus_(
    entityType,
    entityId,
    activeDocuments.length > 0 ? DOCUMENT_STATUSES.ATTACHED : fallbackStatus
  );
}

function appendNote_(existingNote, noteToAppend) {
  if (existingNote && noteToAppend) {
    return existingNote + '\n' + noteToAppend;
  }
  return noteToAppend || existingNote || '';
}
