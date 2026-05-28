# CODEX_TASK_03_PAYMENT_REQUEST_WORKFLOW.md

## Task name

BLAGAJNA WEB — Task 03: Payment Request workflow

## Purpose of this task

Implement the first real business workflow in BLAGAJNA WEB:

```text
PAYMENT_REQUEST
```

A Payment Request is a request submitted by a user asking that money be paid.

It is only a request.

It does not authorize the cashier to pay.

It does not affect cashbox balance.

This task must implement creation, submission, approval, rejection, cancellation and listing of payment requests.

Do not implement actual payment yet.

Do not implement Payment Order execution yet.

Do not implement Cash Event posting yet.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `CODEX_START_PROMPT.md`
4. `CODEX_TASK_02_DATA_MODEL_AND_DATABASE.md` if it exists
5. `docs/01_DATA_MODEL.md`
6. `src/Config.gs`
7. `src/Database.gs`
8. `src/AuditLog.gs`
9. `src/PaymentRequests.gs`
10. `src/Users.gs`
11. `src/Validation.gs` if it exists

Do not overwrite useful existing work.

If functions already exist, improve them.

If the project structure differs, adapt carefully.

## Critical business rules

1. Payment Request is not payment.
2. Payment Request does not affect cashbox balance.
3. Payment Request does not authorize cashier to pay.
4. Cashier must not pay based only on Payment Request.
5. Approved Payment Request may later be converted into Payment Order.
6. Only Payment Order may authorize payment.
7. Only Cash Payment Event changes cashbox balance.
8. Every status change must be written to `AUDIT_LOG`.
9. No Payment Request should be physically deleted.
10. Use statuses instead of deletion.

## Required files to update

Update or create:

1. `src/PaymentRequests.gs`
2. `src/Validation.gs` if needed
3. `src/Config.gs` only if missing constants
4. `src/AuditLog.gs` only if audit helper needs adjustment
5. `docs/04_PAYMENT_REQUESTS.md`
6. `docs/10_TEST_CASES.md`
7. `README.md` if useful

## Payment Request statuses

Use these exact statuses:

```text
DRAFT
SUBMITTED
IN_REVIEW
APPROVED
REJECTED
CONVERTED_TO_ORDER
CANCELLED
```

## Required fields for PAYMENT_REQUESTS

The `PAYMENT_REQUESTS` sheet must support these fields:

| Field | Required | Notes |
|---|---:|---|
| request_id | yes | Generated ID |
| created_at | yes | Timestamp |
| created_by | yes | Current user email or ID |
| requester_user_id | no | If available |
| requested_for_name | yes | Recipient |
| amount | yes | Must be positive |
| currency | yes | Must be active |
| purpose | yes | Required business purpose |
| description | no | Additional explanation |
| preferred_cashbox_id | no | Suggested cashbox |
| needed_by_date | no | Requested payment date |
| priority | yes | NORMAL or URGENT |
| status | yes | Current status |
| reviewed_by | no | Reviewer |
| reviewed_at | no | Review timestamp |
| rejection_reason | no | Required if rejected |
| linked_order_id | no | Filled later when converted to order |
| document_status | yes | NONE, MISSING, ATTACHED |
| updated_at | no | Last update timestamp |

## Required functions

Implement or update the following functions in `src/PaymentRequests.gs`.

### 1. `createPaymentRequest(data)`

Creates a new Payment Request.

Rules:

1. Current user must be active.
2. User role must be one of:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
   - CASHIER
   - APPROVER
   - REQUESTER
3. Validate required fields:
   - requested_for_name
   - amount
   - currency
   - purpose
4. Amount must be greater than zero.
5. Currency must be active.
6. Priority defaults to `NORMAL` if missing.
7. Status must be `DRAFT` by default, unless caller explicitly requests immediate submit and that is implemented safely.
8. `document_status` defaults to `NONE`.
9. Generate `request_id`.
10. Append record to `PAYMENT_REQUESTS`.
11. Write audit log with action `CREATE`.
12. Return created record.

Expected function behavior:

```javascript
const request = createPaymentRequest({
  requested_for_name: 'Petar Petrović',
  amount: 15000,
  currency: 'RSD',
  purpose: 'Trošak puta Novi Sad',
  description: 'Gorivo i putarina',
  priority: 'NORMAL'
});
```

### 2. `submitPaymentRequest(requestId)`

Submits a draft request for review.

Rules:

1. Request must exist.
2. Request status must be `DRAFT`.
3. Current user must be creator or have elevated role.
4. Change status to `SUBMITTED`.
5. Update `updated_at`.
6. Write audit log with action `SUBMIT`.
7. Return updated record.

### 3. `markPaymentRequestInReview(requestId)`

Marks submitted request as being reviewed.

Rules:

1. Request must exist.
2. Request status must be `SUBMITTED`.
3. Current user must have role:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
   - APPROVER
4. Change status to `IN_REVIEW`.
5. Write audit log with action `UPDATE`.
6. Return updated record.

### 4. `approvePaymentRequest(requestId, approvalData)`

Approves request.

Rules:

1. Request must exist.
2. Request status must be either:
   - SUBMITTED
   - IN_REVIEW
3. Current user must have role:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
   - APPROVER
4. Change status to `APPROVED`.
5. Set `reviewed_by`.
6. Set `reviewed_at`.
7. Clear `rejection_reason`.
8. Do not create Payment Order in this function.
9. Write audit log with action `APPROVE`.
10. Return updated record.

Important:

Approval does not create payment and does not affect balance.

### 5. `rejectPaymentRequest(requestId, reason)`

Rejects request.

Rules:

1. Request must exist.
2. Request status must be:
   - SUBMITTED
   - IN_REVIEW
3. Current user must have role:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
   - APPROVER
4. Rejection reason is mandatory.
5. Change status to `REJECTED`.
6. Set `reviewed_by`.
7. Set `reviewed_at`.
8. Set `rejection_reason`.
9. Write audit log with action `REJECT`.
10. Return updated record.

### 6. `cancelPaymentRequest(requestId, reason)`

Cancels request.

Rules:

1. Request must exist.
2. Request must not be:
   - CONVERTED_TO_ORDER
3. Request must not be physically deleted.
4. Current user must be creator or have elevated role.
5. Reason is recommended. If status is already approved, reason is mandatory.
6. Change status to `CANCELLED`.
7. Write audit log with action `CANCEL`.
8. Return updated record.

### 7. `getPaymentRequestById(requestId)`

Returns one request by ID.

Rules:

1. Return null if not found.
2. Do not throw unless database failure happens.

### 8. `listMyPaymentRequests()`

Lists requests created by current user.

Rules:

1. Use current user email or ID.
2. Return array.
3. Sort newest first if easy to implement.

### 9. `listRequestsForApproval()`

Lists requests with statuses:

```text
SUBMITTED
IN_REVIEW
```

Rules:

1. Current user must have role:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
   - APPROVER
2. Return array.
3. Sort urgent first if easy.
4. Sort newest first if easy.

### 10. `convertApprovedRequestToOrderPlaceholder(requestId)`

Do not implement full Payment Order business logic here.

But create a safe placeholder only if useful.

Rules:

1. Request must exist.
2. Request must be `APPROVED`.
3. Function should throw clear error saying full Payment Order creation belongs to Task 04 unless PaymentOrders module already supports it.
4. Do not modify data unless Task 04 is implemented.

This prevents Codex from inventing half-baked Payment Order logic.

## Required validation helpers

If missing, implement or update:

### `assertRequiredFields(data, requiredFields)`

Throws error if any required field is missing or empty.

### `assertPositiveAmount(amount)`

Throws error if amount is not a positive number.

### `assertAllowedValue(value, allowedValues, fieldName)`

Throws error if value is not in allowed list.

### `assertNonEmptyString(value, fieldName)`

Throws error if value is empty.

### `getCurrentTimestamp_()`

Returns ISO timestamp or Date object consistently with the rest of the project.

## Required authorization helpers

Use existing `Users.gs` functions if available.

If not available, implement simple placeholders that can work in Apps Script:

1. `getCurrentUser()`
2. `getCurrentUserEmail()`
3. `getCurrentUserRole()`
4. `assertUserHasRole(allowedRoles)`
5. `assertCurrentUserActive()`

Do not over-engineer authentication.

Use `Session.getActiveUser().getEmail()` where appropriate.

If email is unavailable because of deployment mode, document the limitation.

## Required documentation: `docs/04_PAYMENT_REQUESTS.md`

Create or update this document.

It must include:

1. definition of Payment Request,
2. difference between request, order and payment,
3. allowed users,
4. statuses,
5. fields,
6. business rules,
7. lifecycle,
8. validation rules,
9. audit rules,
10. examples.

Include this exact statement:

```text
Zahtev za isplatu nije nalog za isplatu i nije isplata. Zahtev ne menja stanje blagajne.
```

## Required tests: `docs/10_TEST_CASES.md`

Add manual test cases for Payment Request workflow.

Minimum tests:

### Test 1: Create draft request

Expected:

1. row created in `PAYMENT_REQUESTS`,
2. status is `DRAFT`,
3. audit log contains `CREATE`,
4. cashbox balance is unchanged.

### Test 2: Submit request

Expected:

1. status changes from `DRAFT` to `SUBMITTED`,
2. audit log contains `SUBMIT`.

### Test 3: Approve request

Expected:

1. status changes to `APPROVED`,
2. reviewed_by is filled,
3. reviewed_at is filled,
4. audit log contains `APPROVE`,
5. no payment order is created in this task,
6. no cash event is created,
7. balance is unchanged.

### Test 4: Reject request

Expected:

1. rejection reason is mandatory,
2. status changes to `REJECTED`,
3. reviewed_by is filled,
4. audit log contains `REJECT`,
5. balance is unchanged.

### Test 5: Cancel request

Expected:

1. status changes to `CANCELLED`,
2. record remains in sheet,
3. audit log contains `CANCEL`.

### Test 6: Invalid amount

Expected:

1. system rejects amount <= 0,
2. no row is created.

### Test 7: Missing purpose

Expected:

1. system rejects request,
2. no row is created.

### Test 8: Request does not affect balance

Expected:

1. create request,
2. submit request,
3. approve request,
4. no `CASH_EVENTS` row is created,
5. calculated balance is unchanged.

## Do not do these things in this task

1. Do not implement actual cash payment.
2. Do not implement Payment Order workflow except safe placeholder.
3. Do not implement document upload.
4. Do not implement daily closing.
5. Do not implement UI beyond minimal optional hooks.
6. Do not create external dependencies.
7. Do not use paid services.
8. Do not physically delete rejected or cancelled requests.
9. Do not make Payment Request affect balance.

## Optional simple UI hook

If the existing project already has a simple HTML structure, you may add placeholder buttons or forms for:

1. Novi zahtev za isplatu,
2. Moji zahtevi,
3. Zahtevi za odobrenje.

But UI is not the main task.

Backend functions and documentation are the priority.

## Expected response after completion

After completing this task, report:

1. files updated,
2. functions implemented,
3. business rules enforced,
4. manual test steps,
5. limitations,
6. next recommended task.

## Recommended next task after this

Next task should be:

```text
Task 04 — Payment Order workflow
```

Task 04 should implement:

1. create payment order from approved request,
2. create direct payment order,
3. issue payment order,
4. cancel payment order,
5. list orders waiting for payment,
6. prevent payment order from affecting balance,
7. prepare for cashier execution in Task 05.
```
