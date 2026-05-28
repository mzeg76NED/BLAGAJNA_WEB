# CODEX_TASK_07_SHIFT_OPENING_AND_HANDOVER.md

## Task name

BLAGAJNA WEB — Task 07: Shift opening and handover workflow

## Purpose of this task

Implement cashier shift workflow for BLAGAJNA WEB.

A shift represents a controlled period of cashier responsibility for a specific cashbox.

This task must implement:

1. open cashier shift,
2. view current shift,
3. view shift balance,
4. hand over shift to another cashier,
5. close shift,
6. prevent unsafe operations when shift rules are violated,
7. audit log for every shift action.

## Business meaning

The cash desk must always answer:

1. who is currently responsible for a cashbox,
2. when responsibility started,
3. what calculated balance existed at shift opening,
4. what happened during the shift,
5. who received the cashbox in handover,
6. whether there was any difference,
7. whether the shift is still open or closed.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `CODEX_START_PROMPT.md`
4. `CODEX_TASK_02_DATA_MODEL_AND_DATABASE.md` if it exists
5. `CODEX_TASK_03_PAYMENT_REQUEST_WORKFLOW.md` if it exists
6. `CODEX_TASK_04_PAYMENT_ORDER_WORKFLOW.md` if it exists
7. `CODEX_TASK_05_CASH_PAYMENT_EXECUTION.md` if it exists
8. `CODEX_TASK_06_DOCUMENT_METADATA_AND_UPLOAD.md` if it exists
9. `docs/01_DATA_MODEL.md`
10. `docs/06_CASH_EVENTS.md`
11. `docs/07_DOCUMENTS.md`
12. `docs/10_TEST_CASES.md`
13. `src/Config.gs`
14. `src/Database.gs`
15. `src/AuditLog.gs`
16. `src/CashEvents.gs`
17. `src/Shifts.gs`
18. `src/Users.gs`
19. `src/Validation.gs` if it exists

Do not overwrite useful existing work.

If functions already exist, improve them.

If the project structure differs, adapt carefully.

## Scope of this task

Implement:

1. shift opening,
2. active shift lookup,
3. shift balance calculation,
4. shift handover,
5. shift closing,
6. shift status transitions,
7. basic difference handling,
8. audit logging,
9. documentation and manual tests.

Do not implement:

1. daily closing,
2. advanced denomination counting,
3. document generation/PDF,
4. digital signatures,
5. ERP integration,
6. complex multi-location approval.

## Shift statuses

Use these exact statuses:

```text
OPEN
HANDED_OVER
CLOSED
CLOSED_WITH_DIFFERENCE
CANCELLED
```

Meaning:

1. `OPEN` — shift is active.
2. `HANDED_OVER` — shift responsibility was transferred to another user.
3. `CLOSED` — shift closed without difference.
4. `CLOSED_WITH_DIFFERENCE` — shift closed with difference.
5. `CANCELLED` — shift was cancelled administratively.

## Required SHIFTS fields

The `SHIFTS` sheet must support these fields.

If current data model does not have all fields, update `TABLE_HEADERS` and `docs/01_DATA_MODEL.md` carefully.

| Field | Required | Notes |
|---|---:|---|
| shift_id | yes | Generated ID |
| cashbox_id | yes | Cashbox |
| opened_by | yes | User who opened shift |
| opened_at | yes | Timestamp |
| opening_note | no | Note |
| opening_balance_json | no | Balance by currency at opening |
| closed_by | no | User who closed shift |
| closed_at | no | Timestamp |
| handover_to | no | Receiving user |
| handover_at | no | Handover timestamp |
| closing_balance_json | no | Calculated balance by currency at close/handover |
| physical_balance_json | no | Physically counted balance by currency |
| difference_json | no | Difference by currency |
| status | yes | OPEN, HANDED_OVER, CLOSED, CLOSED_WITH_DIFFERENCE, CANCELLED |
| note | no | Note |
| updated_at | no | Last update timestamp |

## Balance JSON convention

Use JSON string for multi-currency balance fields.

Example:

```json
{
  "RSD": 125000.50,
  "EUR": 320.00
}
```

If helper functions already exist for JSON serialization, use them.

## Required functions in `src/Shifts.gs`

### 1. `openShift(cashboxId, openingNote)`

Opens a shift for a cashbox.

Rules:

1. Current user must be active.
2. Current user must have one of these roles:
   - CASHIER
   - CASHIER_SUPERVISOR
   - ADMIN
3. Cashbox must be active.
4. There must not already be an `OPEN` shift for the same cashbox.
5. Calculate opening balance by supported currencies using `calculateCashboxBalance(cashboxId, currency)`.
6. Create row in `SHIFTS`:
   - generated `shift_id`,
   - cashbox_id,
   - opened_by,
   - opened_at,
   - opening_note,
   - opening_balance_json,
   - status = `OPEN`.
7. Write audit log with action `CREATE`.
8. Return created shift.

### 2. `getActiveShiftForCashbox(cashboxId)`

Returns current open shift for a cashbox.

Rules:

1. Cashbox must be active.
2. Return shift with:
   - cashbox_id matches,
   - status = `OPEN`.
3. If none exists, return `null`.
4. If more than one exists, throw clear data integrity error.

### 3. `getMyActiveShifts()`

Lists active shifts opened by current user.

Rules:

1. Current user must be active.
2. Return shifts with:
   - opened_by equals current user,
   - status = `OPEN`.
3. Return array.

### 4. `getShiftBalance(shiftId)`

Returns current calculated balance for the shift cashbox.

Rules:

1. Shift must exist.
2. Current user must have permission to view shift.
3. Calculate balance by supported currencies.
4. Return object:
   - shift,
   - balanceByCurrency.

Important:

Balance is calculated from posted/locked cash events, not from manually typed balance.

### 5. `handoverShift(shiftId, handoverToUserEmail, physicalBalanceByCurrency, note)`

Hands over an open shift to another cashier.

Rules:

1. Shift must exist.
2. Shift status must be `OPEN`.
3. Current user must be the opener or have elevated role:
   - CASHIER_SUPERVISOR
   - ADMIN
   - FINANCE
4. Receiving user must exist and be active if USERS table supports it.
5. Receiving user should have role:
   - CASHIER
   - CASHIER_SUPERVISOR
   - ADMIN
6. Calculate current balance by currency.
7. Compare calculated balance with physicalBalanceByCurrency if provided.
8. Store:
   - handover_to,
   - handover_at,
   - closing_balance_json,
   - physical_balance_json,
   - difference_json,
   - status = `HANDED_OVER` if no difference,
   - status = `CLOSED_WITH_DIFFERENCE` if difference exists and business logic chooses to close instead of creating new shift.
9. Recommended implementation:
   - Close old shift as `HANDED_OVER`.
   - Automatically open a new shift for receiving user only if impersonation/user assignment is safely implemented.
   - If user assignment cannot be safely implemented, do not auto-open receiving shift. Document limitation.
10. Write audit log with action `UPDATE`.
11. Return updated shift.

Important:

Do not silently ignore differences.

### 6. `closeShift(shiftId, physicalBalanceByCurrency, note)`

Closes an open shift.

Rules:

1. Shift must exist.
2. Shift status must be `OPEN`.
3. Current user must be opener or have elevated role:
   - CASHIER_SUPERVISOR
   - ADMIN
   - FINANCE
4. Calculate current balance by supported currencies.
5. Compare calculated balance with physicalBalanceByCurrency if provided.
6. If physical balance is missing, allow close only if business rule permits. For this task, require physicalBalanceByCurrency.
7. Set:
   - closed_by,
   - closed_at,
   - closing_balance_json,
   - physical_balance_json,
   - difference_json,
   - status = `CLOSED` if no difference,
   - status = `CLOSED_WITH_DIFFERENCE` if any difference exists.
8. Write audit log with action `LOCK` or `UPDATE`.
9. Return updated shift.

### 7. `cancelShift(shiftId, reason)`

Administrative cancellation.

Rules:

1. Shift must exist.
2. Current user must have role:
   - ADMIN
   - FINANCE
   - CASHIER_SUPERVISOR
3. Reason is mandatory.
4. Shift must not already be CLOSED.
5. Set status = `CANCELLED`.
6. Set note with cancellation reason.
7. Write audit log with action `CANCEL`.
8. Return updated shift.

### 8. `assertCashboxHasOpenShift(cashboxId)`

Validation helper.

Rules:

1. If business rule requires active shift before cash operation, this function must throw if no open shift exists.
2. For this task, implement function but do not force it globally unless existing workflows are ready.
3. Document where it should be used later:
   - cash inflow,
   - cash outflow,
   - transfer,
   - handover,
   - daily closing.

## Required helper functions

Implement or update:

### `calculateBalanceBySupportedCurrencies_(cashboxId)`

Private helper.

Rules:

1. Read supported currencies from config.
2. For each active currency, call `calculateCashboxBalance(cashboxId, currency)`.
3. Return object.

### `calculateDifferenceByCurrency_(calculatedBalance, physicalBalance)`

Private helper.

Rules:

1. Compare each currency.
2. Difference = physical balance minus calculated balance.
3. Return object.
4. Treat missing physical currency as zero only if documented. Prefer throwing if missing expected currency.

### `hasAnyDifference_(differenceByCurrency)`

Returns true if any currency difference is not zero.

### `serializeJson_(obj)` and `parseJson_(text)`

Only if existing helpers do not exist.

## Required validation helpers

If missing, implement or update:

1. `assertRequiredFields(data, requiredFields)`
2. `assertNonEmptyString(value, fieldName)`
3. `assertAllowedValue(value, allowedValues, fieldName)`
4. `assertActiveCashbox(cashboxId)`
5. `assertEntityStatus(record, allowedStatuses, entityName)`

## Required authorization helpers

Use existing `Users.gs`.

If user lookup by email is not implemented, create safe helper:

1. `getUserByEmail(email)`
2. `assertUserExistsAndActive(email)`
3. `assertUserCanReceiveShift(email)`

If role lookup is still a placeholder, document limitation.

## Required documentation: create or update `docs/08_SHIFTS.md`

Create this document.

It must include:

1. purpose of shifts,
2. business meaning of cashier responsibility,
3. shift statuses,
4. SHIFTS table fields,
5. opening shift workflow,
6. handover workflow,
7. closing workflow,
8. difference calculation,
9. audit rules,
10. limitations.

Include this exact statement:

```text
Smena ne menja stanje blagajne. Smena određuje odgovornost nad blagajnom, dok se stanje blagajne računa iz knjiženih blagajničkih događaja.
```

## Required tests: update `docs/10_TEST_CASES.md`

Add manual tests for shift workflow.

### Test 1: Open shift

Expected:

1. open shift is created,
2. status is `OPEN`,
3. opening balance JSON is filled,
4. audit log contains `CREATE`.

### Test 2: Prevent two open shifts for same cashbox

Expected:

1. first shift is open,
2. second attempt for same cashbox fails,
3. no duplicate open shift is created.

### Test 3: Get active shift

Expected:

1. active shift for cashbox is returned,
2. null is returned when no open shift exists.

### Test 4: Shift balance

Expected:

1. cash inflow/outflow exists,
2. shift balance reflects calculated cashbox balance,
3. balance is not manually typed.

### Test 5: Close shift without difference

Expected:

1. physical balance equals calculated balance,
2. status becomes `CLOSED`,
3. closing balance JSON is filled,
4. physical balance JSON is filled,
5. difference JSON is zero,
6. audit log contains `UPDATE` or `LOCK`.

### Test 6: Close shift with difference

Expected:

1. physical balance differs from calculated balance,
2. status becomes `CLOSED_WITH_DIFFERENCE`,
3. difference JSON shows difference,
4. audit log records action.

### Test 7: Handover shift

Expected:

1. open shift is handed over,
2. handover_to is filled,
3. handover_at is filled,
4. status becomes `HANDED_OVER` or documented behavior occurs,
5. audit log records handover.

### Test 8: Cancel shift

Expected:

1. authorized user cancels non-closed shift,
2. reason is mandatory,
3. status becomes `CANCELLED`,
4. audit log contains `CANCEL`.

## Do not do these things in this task

1. Do not implement daily closing.
2. Do not generate PDF handover record yet.
3. Do not implement digital signatures.
4. Do not implement denomination-level cash counting.
5. Do not change cashbox balance directly from shift.
6. Do not let shift itself create cash inflow/outflow.
7. Do not integrate with ERP.
8. Do not use external libraries.
9. Do not use paid services.

## Optional simple UI hook

If the existing project has simple UI, add placeholder buttons or forms for:

1. Otvori smenu,
2. Moja aktivna smena,
3. Presek smene,
4. Primopredaja smene,
5. Zatvori smenu.

Backend and documentation remain the priority.

## Expected response after completion

After completing this task, report:

1. files updated,
2. functions implemented,
3. shift business rules enforced,
4. manual test steps,
5. limitations,
6. next recommended task.

## Recommended next task after this

Next task should be:

```text
Task 08 — Daily closing workflow
```

Task 08 should implement:

1. daily closing by cashbox and currency,
2. physical versus calculated balance,
3. closing with or without difference,
4. prevention of closing while shift is open,
5. locking daily cash events,
6. audit log for daily closing.
