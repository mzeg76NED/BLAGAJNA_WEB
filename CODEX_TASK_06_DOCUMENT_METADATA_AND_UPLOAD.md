# CODEX_TASK_06_DOCUMENT_METADATA_AND_UPLOAD.md

## Task name

BLAGAJNA WEB — Task 06: Document metadata and upload workflow

## Purpose of this task

Implement document handling for BLAGAJNA WEB.

The system must allow attaching documents to:

1. Payment Request,
2. Payment Order,
3. Cash Event,
4. Shift,
5. Daily Closing.

Documents are business evidence.

Examples:

1. receipt,
2. invoice,
3. signed payment confirmation,
4. payment request attachment,
5. payment order attachment,
6. photo,
7. PDF,
8. internal note,
9. handover record,
10. daily closing proof.

## Business importance

A cash desk system without documents is not controlled.

Every significant cash desk event must be traceable to evidence.

Documents must be stored in Google Drive.

The `DOCUMENTS` sheet stores metadata and links.

The related business entity must have its `document_status` updated.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `CODEX_START_PROMPT.md`
4. `CODEX_TASK_02_DATA_MODEL_AND_DATABASE.md` if it exists
5. `CODEX_TASK_03_PAYMENT_REQUEST_WORKFLOW.md` if it exists
6. `CODEX_TASK_04_PAYMENT_ORDER_WORKFLOW.md` if it exists
7. `CODEX_TASK_05_CASH_PAYMENT_EXECUTION.md` if it exists
8. `docs/01_DATA_MODEL.md`
9. `docs/04_PAYMENT_REQUESTS.md`
10. `docs/05_PAYMENT_ORDERS.md`
11. `docs/06_CASH_EVENTS.md`
12. `docs/07_DOCUMENTS.md` if it exists
13. `src/Config.gs`
14. `src/Database.gs`
15. `src/AuditLog.gs`
16. `src/Documents.gs`
17. `src/PaymentRequests.gs`
18. `src/PaymentOrders.gs`
19. `src/CashEvents.gs`
20. `src/Users.gs`
21. `src/Validation.gs` if it exists

Do not overwrite useful existing work.

If functions already exist, improve them.

If the project structure differs, adapt carefully.

## Scope of this task

Implement:

1. `DOCUMENTS` metadata creation,
2. file upload to Google Drive,
3. document linking to business entities,
4. update of related entity `document_status`,
5. document listing by entity,
6. document cancellation/replacement as status change,
7. audit log for document actions,
8. documentation and manual tests.

Do not implement:

1. OCR,
2. document content reading,
3. accounting posting,
4. ERP integration,
5. digital signature,
6. advanced approval workflow.

## Storage rule

Files must be stored in Google Drive.

The database must store only:

1. document ID,
2. linked entity type,
3. linked entity ID,
4. file name,
5. Google Drive file ID,
6. Google Drive file URL,
7. MIME type,
8. upload user,
9. upload timestamp,
10. status,
11. note.

## Required Drive folder structure

Use a configurable root folder.

If no root folder ID is configured, create or use a folder named:

```text
BLAGAJNA_WEB_DOCUMENTS
```

Recommended folder structure:

```text
BLAGAJNA_WEB_DOCUMENTS/
  2026/
    2026-05/
      2026-05-28/
        PAYMENT_REQUEST/
        PAYMENT_ORDER/
        CASH_EVENT/
        SHIFT/
        DAILY_CLOSING/
```

If implementing full nested folder creation is too much for this task, implement at least:

```text
BLAGAJNA_WEB_DOCUMENTS/
  PAYMENT_REQUEST/
  PAYMENT_ORDER/
  CASH_EVENT/
  SHIFT/
  DAILY_CLOSING/
```

Document the limitation.

## Entity types

Use these exact values:

```text
PAYMENT_REQUEST
PAYMENT_ORDER
CASH_EVENT
SHIFT
DAILY_CLOSING
```

## Document statuses

Use these exact values:

```text
ACTIVE
REPLACED
CANCELLED
```

## Related entity document statuses

Use these exact values on related entities where `document_status` exists:

```text
NONE
MISSING
ATTACHED
```

Rules:

1. If at least one active document is linked to an entity, set entity `document_status = ATTACHED`.
2. If no active document exists and document is required, entity may remain or become `MISSING`.
3. If no active document exists and document is not required, entity may be `NONE`.
4. In this task, if a document is attached, always set related entity `document_status = ATTACHED`.
5. Do not over-engineer document-required rules yet.

## Required fields for DOCUMENTS

The `DOCUMENTS` sheet must support these fields:

| Field | Required | Notes |
|---|---:|---|
| document_id | yes | Generated ID |
| created_at | yes | Upload timestamp |
| uploaded_by | yes | Current user |
| entity_type | yes | PAYMENT_REQUEST, PAYMENT_ORDER, CASH_EVENT, SHIFT, DAILY_CLOSING |
| entity_id | yes | Linked entity ID |
| file_name | yes | Original or generated file name |
| file_id | yes | Google Drive file ID |
| file_url | yes | Google Drive file URL |
| mime_type | no | File MIME type |
| status | yes | ACTIVE, REPLACED, CANCELLED |
| note | no | Optional note |

## Required functions in `src/Documents.gs`

### 1. `attachDocumentToEntity(entityType, entityId, filePayload, note)`

Attaches a document to an entity.

Rules:

1. Current user must be active.
2. Current user must have permission to attach documents.
3. Validate `entityType`.
4. Validate `entityId`.
5. Validate that referenced entity exists.
6. Validate file payload.
7. Store file in Google Drive.
8. Append metadata row to `DOCUMENTS`.
9. Set related entity `document_status = ATTACHED` if that column exists.
10. Write audit log with action `CREATE`.
11. Return created document metadata.

Suggested `filePayload` shape:

```javascript
{
  fileName: 'racun.pdf',
  mimeType: 'application/pdf',
  base64Data: '...'
}
```

If the existing frontend uses another format, adapt carefully and document it.

### 2. `createDocumentMetadata(entityType, entityId, fileInfo, note)`

Creates a row in `DOCUMENTS`.

Rules:

1. Generate `document_id`.
2. Set `created_at`.
3. Set `uploaded_by`.
4. Set `status = ACTIVE`.
5. Store file metadata.
6. Append record.
7. Return created metadata.

This function should not upload file itself if `attachDocumentToEntity()` already handled upload.

### 3. `uploadFileToDrive_(entityType, filePayload)`

Private helper.

Rules:

1. Resolve or create target Drive folder.
2. Decode base64 payload.
3. Create Google Drive file.
4. Return:
   - file_id,
   - file_url,
   - file_name,
   - mime_type.

If base64 upload is not yet possible because UI is missing, implement the function in a way that is ready for Apps Script and document how it expects payload.

### 4. `listDocumentsForEntity(entityType, entityId)`

Lists documents linked to an entity.

Rules:

1. Current user must be active.
2. Validate entityType and entityId.
3. Return active and inactive documents.
4. Sort newest first if easy.

### 5. `listActiveDocumentsForEntity(entityType, entityId)`

Lists only active documents.

Rules:

1. Same as above.
2. Filter `status = ACTIVE`.

### 6. `cancelDocument(documentId, reason)`

Cancels a document.

Rules:

1. Document must exist.
2. Reason is mandatory.
3. Current user must have elevated role:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
4. Do not delete file from Drive in this task.
5. Set document status to `CANCELLED`.
6. Write audit log with action `CANCEL`.
7. Recalculate/update related entity `document_status`:
   - if no active documents remain, set to `MISSING` or `NONE`.
   - for this task use `MISSING` only for PAYMENT_ORDER and CASH_EVENT, otherwise `NONE`.
8. Return updated document.

### 7. `replaceDocument(documentId, filePayload, note)`

Optional if not too large.

Rules:

1. Existing document status becomes `REPLACED`.
2. New document row is created with `ACTIVE` status.
3. New document links to same entity.
4. Do not delete old Drive file.
5. Write audit log for both update and create.

If not implemented, create safe placeholder throwing:

```text
Document replacement is not implemented in Task 06.
```

### 8. `updateEntityDocumentStatus_(entityType, entityId, newStatus)`

Private helper.

Rules:

1. Resolve entity table:
   - PAYMENT_REQUEST → PAYMENT_REQUESTS
   - PAYMENT_ORDER → PAYMENT_ORDERS
   - CASH_EVENT → CASH_EVENTS
   - SHIFT → SHIFTS
   - DAILY_CLOSING → DAILY_CLOSING
2. Resolve ID field:
   - request_id,
   - order_id,
   - event_id,
   - shift_id,
   - closing_id.
3. If entity table has `document_status`, update it.
4. If entity table does not have `document_status`, do nothing and document it.

### 9. `assertEntityExists_(entityType, entityId)`

Private helper.

Rules:

1. Resolve entity table and ID field.
2. Check that entity exists.
3. Throw clear error if missing.
4. Return entity record if found.

## Required updates in `src/Config.gs`

If missing, add constants:

```javascript
ENTITY_TYPES
DOCUMENT_STATUSES
ENTITY_TABLE_MAP
DOCUMENT_ROOT_FOLDER_NAME
DOCUMENT_ROOT_FOLDER_ID
```

`DOCUMENT_ROOT_FOLDER_ID` can be empty string placeholder.

Example:

```javascript
const DOCUMENT_ROOT_FOLDER_ID = '';
const DOCUMENT_ROOT_FOLDER_NAME = 'BLAGAJNA_WEB_DOCUMENTS';
```

Do not hardcode user-specific Drive IDs unless explicitly configured.

## Required authorization rules

Allowed to attach documents:

1. ADMIN,
2. DIRECTOR,
3. FINANCE,
4. CASHIER_SUPERVISOR,
5. CASHIER,
6. APPROVER,
7. REQUESTER.

Allowed to cancel/replace documents:

1. ADMIN,
2. DIRECTOR,
3. FINANCE,
4. CASHIER_SUPERVISOR.

If role implementation is still placeholder, preserve existing approach and document limitation.

## Required validation helpers

If missing, implement or update:

1. `assertRequiredFields(data, requiredFields)`
2. `assertAllowedValue(value, allowedValues, fieldName)`
3. `assertNonEmptyString(value, fieldName)`
4. `assertEntityType(entityType)`
5. `assertValidFilePayload(filePayload)`

Basic file payload validation:

1. fileName exists,
2. base64Data exists,
3. mimeType exists or defaults to `application/octet-stream`.

## Required documentation: `docs/07_DOCUMENTS.md`

Create or update this document.

It must include:

1. purpose of document handling,
2. supported entity types,
3. storage rule,
4. Google Drive folder strategy,
5. DOCUMENTS table fields,
6. document statuses,
7. related entity document status,
8. upload workflow,
9. cancel workflow,
10. replacement workflow or limitation,
11. audit rules,
12. examples.

Include this exact statement:

```text
Dokument se ne čuva kao podatak u tabeli. Fajl se čuva u Google Drive-u, a u tabeli DOCUMENTS čuvaju se metapodaci i veza ka poslovnom događaju.
```

## Required tests: update `docs/10_TEST_CASES.md`

Add manual test cases for document workflow.

Minimum tests:

### Test 1: Attach document to Payment Request

Expected:

1. file is created in Google Drive,
2. row is created in `DOCUMENTS`,
3. entity_type is `PAYMENT_REQUEST`,
4. entity_id is request ID,
5. document status is `ACTIVE`,
6. payment request `document_status` becomes `ATTACHED`,
7. audit log contains `CREATE`.

### Test 2: Attach document to Payment Order

Expected:

1. document row is created,
2. payment order `document_status` becomes `ATTACHED`,
3. audit log contains `CREATE`.

### Test 3: Attach document to Cash Event

Expected:

1. document row is created,
2. cash event `document_status` becomes `ATTACHED`,
3. audit log contains `CREATE`.

### Test 4: List documents for entity

Expected:

1. all linked documents are returned,
2. active and inactive documents are visible.

### Test 5: List active documents only

Expected:

1. only documents with `status = ACTIVE` are returned.

### Test 6: Cancel document

Expected:

1. document status becomes `CANCELLED`,
2. document row remains in `DOCUMENTS`,
3. Drive file is not deleted,
4. audit log contains `CANCEL`.

### Test 7: Invalid entity type

Expected:

1. system rejects unsupported entity type,
2. no Drive file is created,
3. no document row is created.

### Test 8: Invalid file payload

Expected:

1. system rejects missing base64Data or fileName,
2. no Drive file is created,
3. no document row is created.

## Do not do these things in this task

1. Do not implement OCR.
2. Do not read document content.
3. Do not delete Drive files.
4. Do not implement digital signatures.
5. Do not implement advanced document approval.
6. Do not implement daily closing.
7. Do not implement shift handover.
8. Do not create external dependencies.
9. Do not use paid services.
10. Do not store file binary content in Google Sheets.

## Optional simple UI hook

If existing UI structure exists, add minimal placeholder controls:

1. file input,
2. entity type selector,
3. entity ID input,
4. upload button,
5. list documents button.

But backend and documentation are priority.

## Expected response after completion

After completing this task, report:

1. files updated,
2. functions implemented,
3. document workflow enforced,
4. Drive storage behavior,
5. manual test steps,
6. limitations,
7. next recommended task.

## Recommended next task after this

Next task should be:

```text
Task 07 — Shift opening and handover workflow
```

Task 07 should implement:

1. open cashier shift,
2. view shift balance,
3. hand over shift,
4. close shift,
5. prevent daily closing while shift is open,
6. audit log for shift actions.
