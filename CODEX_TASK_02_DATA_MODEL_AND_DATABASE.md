# CODEX_TASK_02_DATA_MODEL_AND_DATABASE.md

## Task name

BLAGAJNA WEB — Task 02: Data model and database initialization

## Purpose of this task

Continue the BLAGAJNA WEB project after the initial project skeleton.

Your task is to create a precise data model and implement the first usable Google Sheets database initialization layer.

Do not build the full application yet.

Do not implement UI screens beyond what is necessary to keep the project consistent.

Focus only on:

1. data model documentation,
2. Google Sheets structure,
3. database initialization,
4. basic database helper functions,
5. initial validation helpers,
6. audit log foundation.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `CODEX_START_PROMPT.md`
4. `README.md` if it exists
5. all files in `/docs` if they exist
6. all files in `/src` if they exist

Do not overwrite useful existing work.

If a file already exists, update it carefully.

If a function already exists, improve it instead of duplicating it.

If the current code structure differs from the expected structure, preserve the existing structure and adapt this task to it.

## Critical business rule reminder

The system must strictly distinguish between:

```text
PAYMENT_REQUEST
PAYMENT_ORDER
CASH_PAYMENT_EVENT
```

Definitions:

1. `PAYMENT_REQUEST` is only a request. It does not authorize payment. It does not affect cashbox balance.
2. `PAYMENT_ORDER` is an authorized instruction to pay. It does not affect cashbox balance until executed.
3. `CASH_PAYMENT_EVENT` is the actual executed payment. Only this affects cashbox balance.

Absolute rule:

```text
Payment Request is not payment.
Payment Order is not payment.
Only posted Cash Event changes cashbox balance.
```

## Required deliverables

After this task, the project must contain:

1. updated `docs/01_DATA_MODEL.md`,
2. updated `src/Config.gs`,
3. updated `src/Database.gs`,
4. updated `src/AuditLog.gs`,
5. optional updated `README.md`,
6. manual test instructions.

## Part 1 — Update `docs/01_DATA_MODEL.md`

Create or update this document as the authoritative data model.

The document must define every table/sheet, every column, business meaning, required status values and relationships.

Use these exact sheet names:

```text
USERS
CASHBOXES
CURRENCIES
PAYMENT_REQUESTS
PAYMENT_ORDERS
CASH_EVENTS
DOCUMENTS
SHIFTS
DAILY_CLOSING
AUDIT_LOG
```

### 1. USERS

Purpose: system users and their roles.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| user_id | string | yes | Internal user ID |
| email | string | yes | Google account email |
| full_name | string | yes | User full name |
| role | string | yes | ADMIN, DIRECTOR, FINANCE, CASHIER_SUPERVISOR, CASHIER, APPROVER, REQUESTER, VIEWER |
| active | boolean | yes | TRUE/FALSE |
| default_cashbox_id | string | no | Default cashbox |
| created_at | datetime | yes | Creation time |
| updated_at | datetime | no | Last update time |

### 2. CASHBOXES

Purpose: cashboxes where money is held.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| cashbox_id | string | yes | Internal cashbox ID |
| name | string | yes | Cashbox name |
| location | string | no | Location |
| responsible_user_id | string | no | Responsible user |
| active | boolean | yes | TRUE/FALSE |
| created_at | datetime | yes | Creation time |
| updated_at | datetime | no | Last update time |

### 3. CURRENCIES

Purpose: supported currencies.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| currency_code | string | yes | RSD, EUR |
| name | string | yes | Currency name |
| active | boolean | yes | TRUE/FALSE |
| is_default | boolean | yes | TRUE/FALSE |

### 4. PAYMENT_REQUESTS

Purpose: request submitted by a user asking for payment.

Important: this table never affects cashbox balance.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| request_id | string | yes | Unique request ID |
| created_at | datetime | yes | Creation time |
| created_by | string | yes | User email or ID |
| requester_user_id | string | no | User who requests payment |
| requested_for_name | string | yes | Person who should receive money |
| amount | number | yes | Requested amount |
| currency | string | yes | Currency |
| purpose | string | yes | Business purpose |
| description | text | no | Additional explanation |
| preferred_cashbox_id | string | no | Suggested cashbox |
| needed_by_date | date | no | Requested payment date |
| priority | string | yes | NORMAL, URGENT |
| status | string | yes | DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, CONVERTED_TO_ORDER, CANCELLED |
| reviewed_by | string | no | Reviewer user |
| reviewed_at | datetime | no | Review time |
| rejection_reason | text | no | Required if rejected |
| linked_order_id | string | no | Created payment order |
| document_status | string | yes | NONE, MISSING, ATTACHED |
| updated_at | datetime | no | Last update time |

### 5. PAYMENT_ORDERS

Purpose: authorized instruction to cashier to pay.

Important: this table does not affect cashbox balance until executed as cash event.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| order_id | string | yes | Unique order ID |
| created_at | datetime | yes | Creation time |
| created_by | string | yes | User who created order |
| source_request_id | string | no | Linked payment request |
| order_type | string | yes | FROM_REQUEST, DIRECT_ORDER |
| cashbox_id | string | yes | Cashbox that should pay |
| pay_to_name | string | yes | Recipient |
| amount_ordered | number | yes | Ordered amount |
| amount_paid | number | yes | Paid amount, default 0 |
| currency | string | yes | Currency |
| purpose | string | yes | Payment purpose |
| description | text | no | Additional explanation |
| due_date | date | no | Due date |
| priority | string | yes | NORMAL, URGENT |
| status | string | yes | DRAFT, ISSUED, WAITING_PAYMENT, PARTIALLY_PAID, PAID, REJECTED_BY_CASHIER, CANCELLED, CLOSED |
| issued_by | string | no | User issuing order |
| issued_at | datetime | no | Issue time |
| executed_by | string | no | Cashier who executed |
| executed_at | datetime | no | Execution time |
| linked_cash_event_id | string | no | Actual cash event |
| document_status | string | yes | NONE, MISSING, ATTACHED |
| cancellation_reason | text | no | Required if cancelled |
| cashier_rejection_reason | text | no | Required if rejected by cashier |
| updated_at | datetime | no | Last update time |

### 6. CASH_EVENTS

Purpose: actual cash movement.

Only posted or locked cash events affect cashbox balance.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| event_id | string | yes | Unique event ID |
| created_at | datetime | yes | Creation time |
| created_by | string | yes | User who created event |
| event_date | date | yes | Business date |
| event_type | string | yes | CASH_INFLOW, CASH_OUTFLOW, CASH_TRANSFER_IN, CASH_TRANSFER_OUT, CORRECTION, REVERSAL |
| cashbox_id | string | yes | Cashbox |
| currency | string | yes | Currency |
| direction | string | yes | IN, OUT, NEUTRAL |
| amount | number | yes | Amount |
| linked_request_id | string | no | Linked payment request |
| linked_order_id | string | no | Linked payment order |
| partner_name | string | no | Partner or person |
| description | text | yes | Business explanation |
| document_status | string | yes | NONE, MISSING, ATTACHED |
| status | string | yes | DRAFT, SUBMITTED, POSTED, LOCKED, CANCELLED, REVERSED |
| posted_by | string | no | User who posted event |
| posted_at | datetime | no | Posting time |
| locked_by | string | no | User who locked event |
| locked_at | datetime | no | Lock time |
| reversal_of_event_id | string | no | Original event if this is reversal |
| updated_at | datetime | no | Last update time |

### 7. DOCUMENTS

Purpose: metadata for files stored in Google Drive.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| document_id | string | yes | Unique document ID |
| created_at | datetime | yes | Upload time |
| uploaded_by | string | yes | User |
| entity_type | string | yes | PAYMENT_REQUEST, PAYMENT_ORDER, CASH_EVENT, SHIFT, DAILY_CLOSING |
| entity_id | string | yes | Linked entity ID |
| file_name | string | yes | Original file name |
| file_id | string | yes | Google Drive file ID |
| file_url | string | yes | Google Drive file URL |
| mime_type | string | no | File MIME type |
| status | string | yes | ACTIVE, REPLACED, CANCELLED |
| note | text | no | Note |

### 8. SHIFTS

Purpose: cashier shift tracking and handover.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| shift_id | string | yes | Unique shift ID |
| cashbox_id | string | yes | Cashbox |
| opened_by | string | yes | User |
| opened_at | datetime | yes | Opening time |
| opening_note | text | no | Opening note |
| closed_by | string | no | User |
| closed_at | datetime | no | Closing time |
| handover_to | string | no | Receiving user |
| status | string | yes | OPEN, HANDED_OVER, CLOSED, CLOSED_WITH_DIFFERENCE |
| note | text | no | Note |

### 9. DAILY_CLOSING

Purpose: daily closing by cashbox and currency.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| closing_id | string | yes | Unique closing ID |
| closing_date | date | yes | Business date |
| cashbox_id | string | yes | Cashbox |
| currency | string | yes | Currency |
| opening_balance | number | yes | Opening calculated balance |
| total_in | number | yes | Total inflow |
| total_out | number | yes | Total outflow |
| calculated_balance | number | yes | System calculated balance |
| physical_balance | number | yes | Counted cash |
| difference | number | yes | Physical minus calculated |
| status | string | yes | DRAFT, CLOSED, CLOSED_WITH_DIFFERENCE, LOCKED |
| closed_by | string | no | User |
| closed_at | datetime | no | Closing time |
| note | text | no | Note |

### 10. AUDIT_LOG

Purpose: immutable log of important actions.

Columns:

| Column | Type | Required | Description |
|---|---|---:|---|
| log_id | string | yes | Unique log ID |
| timestamp | datetime | yes | Action time |
| user | string | yes | User email or ID |
| action | string | yes | CREATE, UPDATE, SUBMIT, APPROVE, REJECT, CANCEL, POST, LOCK, REVERSE |
| entity_type | string | yes | Table/entity name |
| entity_id | string | yes | Entity ID |
| old_value | text | no | Previous value as JSON string |
| new_value | text | no | New value as JSON string |
| comment | text | no | Explanation |

## Part 2 — Update `src/Config.gs`

Implement or update constants.

Required constants:

1. `APP_NAME`
2. `SHEET_NAMES`
3. `USER_ROLES`
4. `REQUEST_STATUSES`
5. `ORDER_STATUSES`
6. `CASH_EVENT_STATUSES`
7. `CASH_EVENT_TYPES`
8. `DOCUMENT_STATUSES`
9. `SHIFT_STATUSES`
10. `DAILY_CLOSING_STATUSES`
11. `AUDIT_ACTIONS`
12. `SUPPORTED_CURRENCIES`
13. `TABLE_HEADERS`

`TABLE_HEADERS` must contain the exact headers for all sheets listed above.

Do not use TypeScript.

Use Google Apps Script compatible JavaScript.

## Part 3 — Update `src/Database.gs`

Implement these functions in a basic but usable way:

### `getDatabaseSpreadsheet_()`

Returns active spreadsheet if container-bound, or opens by ID if spreadsheet ID is configured.

Use a config placeholder for spreadsheet ID.

### `initializeDatabase()`

Creates all required sheets if missing.

For each sheet:

1. create sheet if missing,
2. add header row if sheet is empty,
3. freeze first row,
4. optionally apply basic bold formatting to header row,
5. do not delete existing data.

### `getSheetByNameOrThrow(sheetName)`

Returns sheet by name.

Throws clear error if missing.

### `getHeaders_(sheet)`

Returns first row headers.

### `appendRecord(sheetName, record)`

Appends object as row based on `TABLE_HEADERS`.

Missing fields should become empty string.

Should add timestamp if appropriate only if caller provides it or if helper is explicitly designed to do so.

### `findRecordById(sheetName, idField, idValue)`

Finds one record by ID.

Returns object with:

1. `rowNumber`,
2. `record`.

If not found, return `null`.

### `updateRecordById(sheetName, idField, idValue, updates)`

Updates existing row by ID.

Must not remove existing values unless provided in updates.

Returns updated record.

### `listRecords(sheetName, filters)`

Optional but recommended.

Returns records as array of objects.

Filters can be simple exact-match object.

## Part 4 — Update `src/AuditLog.gs`

Implement:

```javascript
function writeAuditLog(action, entityType, entityId, oldValue, newValue, comment) {
  // implementation
}
```

Rules:

1. Create a unique `log_id`.
2. Use current timestamp.
3. Use active user email where possible.
4. Convert old and new values to JSON strings.
5. Append row to `AUDIT_LOG`.
6. Never edit old audit log rows.

Add helper:

```javascript
function generateId_(prefix) {
  // example: REQ-2026-000001 or LOG-20260528-123456
}
```

If a better ID strategy is needed, document it clearly.

## Part 5 — Add basic validation helpers

Create or update suitable file, for example `Validation.gs` if needed.

Helpers:

1. `assertRequiredFields(data, requiredFields)`
2. `assertPositiveAmount(amount)`
3. `assertAllowedValue(value, allowedValues, fieldName)`
4. `assertActiveCurrency(currency)`
5. `assertActiveCashbox(cashboxId)`

If you create `Validation.gs`, update project structure documentation or README.

## Part 6 — Manual test instructions

Add manual test section to `README.md` or create `docs/10_TEST_CASES.md`.

Minimum manual test steps:

1. Open Apps Script project.
2. Run `initializeDatabase()`.
3. Confirm all sheets are created.
4. Confirm all sheets have header rows.
5. Confirm first row is frozen.
6. Run a small test function or manual call that appends sample user.
7. Confirm `appendRecord()` works.
8. Confirm `findRecordById()` works.
9. Confirm `updateRecordById()` works.
10. Confirm `writeAuditLog()` appends one row to `AUDIT_LOG`.

## Part 7 — Do not do these things yet

Do not implement full UI.

Do not implement payment request approval workflow yet.

Do not implement payment order execution yet.

Do not implement document upload yet.

Do not implement daily closing yet.

Do not integrate with ERP.

Do not use external libraries.

Do not introduce frameworks.

Do not create paid dependencies.

## Expected response after completion

When you finish, report:

1. files created,
2. files updated,
3. functions implemented,
4. data model summary,
5. manual test steps,
6. limitations,
7. recommended next task.

## Recommended next task after this

After this task is complete, the next task should be:

```text
Task 03 — Implement Payment Request workflow
```

That next task should implement:

1. create request,
2. submit request,
3. approve request,
4. reject request,
5. cancel request,
6. convert approved request into payment order placeholder.
```
