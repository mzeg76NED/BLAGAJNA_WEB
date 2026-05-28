# CODEX_TASK_08_DAILY_CLOSING_WORKFLOW.md

## Task name

BLAGAJNA WEB — Task 08: Daily closing workflow

## Purpose of this task

Implement daily cash desk closing for BLAGAJNA WEB.

Daily closing is the formal end-of-day control for one cashbox and one currency.

It compares:

```text
calculated balance
vs
physically counted balance
```

and records whether the day is closed without difference or with difference.

## Business meaning

The system must always answer:

1. which cashbox was closed,
2. for which date,
3. for which currency,
4. what was the calculated balance,
5. what was the physically counted balance,
6. whether there was a difference,
7. who closed the day,
8. when the closing was done,
9. which cash events are included,
10. whether included cash events are locked.

## Critical principle

Daily closing does not create cash movement by itself.

It does not invent balance.

It records and locks the result of already posted cash events.

Balance is calculated from cash events.

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
9. `CODEX_TASK_07_SHIFT_OPENING_AND_HANDOVER.md` if it exists
10. `docs/01_DATA_MODEL.md`
11. `docs/06_CASH_EVENTS.md`
12. `docs/08_SHIFTS.md`
13. `docs/10_TEST_CASES.md`
14. `src/Config.gs`
15. `src/Database.gs`
16. `src/AuditLog.gs`
17. `src/CashEvents.gs`
18. `src/Shifts.gs`
19. `src/DailyClosing.gs`
20. `src/Users.gs`
21. `src/Validation.gs` if it exists

Do not overwrite useful existing work.

If functions already exist, improve them.

If the project structure differs, adapt carefully.

## Scope of this task

Implement:

1. calculate daily totals,
2. prepare daily closing preview,
3. close day for cashbox and currency,
4. record physical balance,
5. calculate difference,
6. prevent duplicate daily closing,
7. prevent closing when open shift exists, unless explicitly overridden,
8. lock included cash events,
9. list daily closings,
10. audit log for closing actions,
11. documentation and manual tests.

Do not implement:

1. PDF generation,
2. denomination-level counting,
3. accounting posting,
4. ERP integration,
5. bank reconciliation,
6. advanced BI dashboard.

## Daily closing statuses

Use these exact statuses:

```text
DRAFT
CLOSED
CLOSED_WITH_DIFFERENCE
LOCKED
CANCELLED
```

Meaning:

1. `DRAFT` — prepared but not formally closed.
2. `CLOSED` — closed without difference.
3. `CLOSED_WITH_DIFFERENCE` — closed with difference.
4. `LOCKED` — administratively locked and immutable.
5. `CANCELLED` — cancelled administratively.

## Required DAILY_CLOSING fields

The `DAILY_CLOSING` sheet must support these fields.

If current data model does not have all fields, update `TABLE_HEADERS` and `docs/01_DATA_MODEL.md` carefully.

| Field | Required | Notes |
|---|---:|---|
| closing_id | yes | Generated ID |
| closing_date | yes | Business date |
| cashbox_id | yes | Cashbox |
| currency | yes | Currency |
| opening_balance | yes | Opening balance for the day |
| total_in | yes | Total posted inflow for the day |
| total_out | yes | Total posted outflow for the day |
| calculated_balance | yes | System calculated balance |
| physical_balance | yes | Counted physical cash |
| difference | yes | Physical minus calculated |
| status | yes | DRAFT, CLOSED, CLOSED_WITH_DIFFERENCE, LOCKED, CANCELLED |
| closed_by | no | User who closed day |
| closed_at | no | Timestamp |
| locked_by | no | User who locked closing |
| locked_at | no | Timestamp |
| note | no | Note |
| updated_at | no | Last update timestamp |

## Required functions in `src/DailyClosing.gs`

### 1. `prepareDailyClosing(cashboxId, currency, closingDate)`

Prepares closing preview without writing final closing row.

Rules:

1. Current user must be active.
2. Current user must have one of these roles:
   - CASHIER_SUPERVISOR
   - FINANCE
   - DIRECTOR
   - ADMIN
   - CASHIER if allowed by current project rules
3. Cashbox must be active.
4. Currency must be active.
5. Validate closingDate.
6. Check if closing already exists for same:
   - cashbox_id,
   - currency,
   - closing_date
7. If closed record already exists, throw clear error.
8. Calculate:
   - opening_balance,
   - total_in,
   - total_out,
   - calculated_balance.
9. Return preview object:
   - cashbox_id,
   - currency,
   - closing_date,
   - opening_balance,
   - total_in,
   - total_out,
   - calculated_balance,
   - included_event_count.

Recommended simple implementation:

If opening balance history is not implemented yet:

```text
opening_balance = balance before start of closingDate
total_in = posted IN events on closingDate
total_out = posted OUT events on closingDate
calculated_balance = opening_balance + total_in - total_out
```

### 2. `closeDailyCashbox(cashboxId, currency, closingDate, physicalBalance, note)`

Performs daily closing.

Rules:

1. Current user must be active.
2. Current user must have one of these roles:
   - CASHIER_SUPERVISOR
   - FINANCE
   - DIRECTOR
   - ADMIN
3. Cashbox must be active.
4. Currency must be active.
5. Physical balance is required.
6. Physical balance must be number and cannot be negative.
7. There must be no `OPEN` shift for that cashbox unless override is explicitly implemented.
8. There must not already be a non-cancelled closing for same cashbox/currency/date.
9. Use `prepareDailyClosing()` logic.
10. Calculate:
    - difference = physical_balance - calculated_balance.
11. Create row in `DAILY_CLOSING`:
    - generated closing_id,
    - closing_date,
    - cashbox_id,
    - currency,
    - opening_balance,
    - total_in,
    - total_out,
    - calculated_balance,
    - physical_balance,
    - difference,
    - status = `CLOSED` if difference is 0,
    - status = `CLOSED_WITH_DIFFERENCE` if difference is not 0,
    - closed_by,
    - closed_at,
    - note.
12. Lock included cash events by changing their status from `POSTED` to `LOCKED`.
13. Set locked_by and locked_at on cash events if those columns exist.
14. Write audit log:
    - `CREATE` for daily closing,
    - `LOCK` for locked cash events or summary audit entry.
15. Return created closing and summary.

Important:

Do not delete or modify cash event amounts.

Only lock eligible posted events.

### 3. `getDailyClosingById(closingId)`

Returns one closing record.

Rules:

1. Return null if not found.
2. Do not throw unless database failure happens.

### 4. `findDailyClosing(cashboxId, currency, closingDate)`

Returns existing non-cancelled closing for same cashbox/currency/date.

Rules:

1. Return null if not found.
2. Used to prevent duplicate closing.

### 5. `listDailyClosings(filters)`

Lists daily closings.

Rules:

1. Current user must have one of these roles:
   - CASHIER_SUPERVISOR
   - FINANCE
   - DIRECTOR
   - ADMIN
   - CASHIER if allowed by current project rules
2. Support simple filters:
   - cashbox_id,
   - currency,
   - status,
   - closing_date.
3. Return array.
4. Sort newest first if easy.

### 6. `lockDailyClosing(closingId)`

Optional administrative lock.

Rules:

1. Closing must exist.
2. Current user must have one of these roles:
   - FINANCE
   - DIRECTOR
   - ADMIN
3. Closing status must be:
   - CLOSED
   - CLOSED_WITH_DIFFERENCE
4. Set status to `LOCKED`.
5. Set locked_by and locked_at.
6. Write audit log with action `LOCK`.
7. Return updated closing.

If `LOCKED` is treated as unnecessary because closing already locks events, document the limitation.

### 7. `cancelDailyClosing(closingId, reason)`

Safe administrative placeholder.

Full cancellation of closing can be dangerous because cash events may already be locked.

For this task:

1. Implement only if safe.
2. Current user must have role:
   - ADMIN
   - FINANCE
3. Reason is mandatory.
4. If implemented, do not unlock cash events automatically unless clearly documented.
5. If not implemented, function must throw:

```text
Daily closing cancellation is not implemented in Task 08. Use later correction workflow.
```

## Required helper functions

Implement or update:

### `getCashEventsForDate_(cashboxId, currency, closingDate)`

Private helper.

Rules:

1. Return cash events for exact business date.
2. Include only:
   - `POSTED` events for closing,
   - optionally `LOCKED` events only for preview/history if documented.
3. Must match cashbox and currency.

### `calculateOpeningBalanceBeforeDate_(cashboxId, currency, closingDate)`

Private helper.

Rules:

1. Calculate balance from all `POSTED` or `LOCKED` events before closingDate.
2. IN adds.
3. OUT subtracts.
4. Return number.

### `calculateDailyTotals_(events)`

Private helper.

Rules:

1. Sum IN events into total_in.
2. Sum OUT events into total_out.
3. Ignore NEUTRAL.
4. Return object.

### `lockCashEventsForClosing_(events, closingId)`

Private helper.

Rules:

1. Update each included cash event from `POSTED` to `LOCKED`.
2. Do not change amount.
3. Do not change event_type.
4. Do not lock already locked or cancelled events.
5. Write audit summary or individual audit entries.

### `normalizeDateKey_(dateValue)`

Private helper.

Rules:

1. Normalize date for comparison.
2. Use consistent format `YYYY-MM-DD`.
3. Avoid timezone ambiguity where possible.

## Required validation helpers

If missing, implement or update:

1. `assertRequiredFields(data, requiredFields)`
2. `assertNonEmptyString(value, fieldName)`
3. `assertAllowedValue(value, allowedValues, fieldName)`
4. `assertActiveCashbox(cashboxId)`
5. `assertActiveCurrency(currency)`
6. `assertNonNegativeAmount(amount, fieldName)`
7. `assertNoOpenShiftForCashbox(cashboxId)`

`assertNoOpenShiftForCashbox(cashboxId)` may use `getActiveShiftForCashbox(cashboxId)` if available.

## Required documentation: create or update `docs/09_DAILY_CLOSING.md`

Create this document.

It must include:

1. purpose of daily closing,
2. difference between shift closing and daily closing,
3. DAILY_CLOSING fields,
4. status definitions,
5. calculation rule,
6. opening balance rule,
7. total_in and total_out rule,
8. physical balance rule,
9. difference rule,
10. event locking rule,
11. duplicate closing prevention,
12. open shift prevention,
13. audit rules,
14. limitations.

Include this exact statement:

```text
Dnevni zaključak ne pravi promet i ne menja iznose na blagajničkim događajima. Dnevni zaključak samo evidentira obračunsko stanje, fizičko stanje, razliku i zaključava događaje koji su ušli u zaključak.
```

## Required tests: update `docs/10_TEST_CASES.md`

Add manual tests for daily closing workflow.

### Test 1: Prepare daily closing

Expected:

1. preview is returned,
2. opening_balance is calculated,
3. total_in is calculated,
4. total_out is calculated,
5. calculated_balance is correct,
6. no `DAILY_CLOSING` row is created.

### Test 2: Close day without difference

Expected:

1. physical balance equals calculated balance,
2. row is created in `DAILY_CLOSING`,
3. status is `CLOSED`,
4. difference is 0,
5. included cash events become `LOCKED`,
6. audit log contains `CREATE` and `LOCK`.

### Test 3: Close day with difference

Expected:

1. physical balance differs from calculated balance,
2. status is `CLOSED_WITH_DIFFERENCE`,
3. difference is recorded,
4. included cash events become `LOCKED`,
5. audit log records closing.

### Test 4: Prevent duplicate closing

Expected:

1. closing already exists for same cashbox/currency/date,
2. second closing attempt is rejected.

### Test 5: Prevent closing with open shift

Expected:

1. open shift exists for cashbox,
2. daily closing attempt is rejected,
3. no closing row is created.

### Test 6: Locked events remain unchanged in amount

Expected:

1. cash event amount before closing is recorded,
2. close daily cashbox,
3. event status becomes `LOCKED`,
4. amount remains unchanged.

### Test 7: Payment Request and Payment Order do not appear in daily totals

Expected:

1. create request and order but do not execute payment,
2. prepare daily closing,
3. totals do not include request/order,
4. balance unchanged.

### Test 8: Executed payment appears in daily totals

Expected:

1. execute payment order,
2. `CASH_OUTFLOW` is posted,
3. prepare daily closing,
4. total_out includes payment amount.

## Do not do these things in this task

1. Do not generate PDF closing report.
2. Do not implement denomination-level cash count.
3. Do not implement accounting posting.
4. Do not integrate with ERP.
5. Do not unlock events automatically.
6. Do not delete cash events.
7. Do not change cash event amounts.
8. Do not use manual balance as source of truth.
9. Do not use external libraries.
10. Do not use paid services.

## Optional simple UI hook

If existing UI structure exists, add placeholder buttons or forms:

1. Pripremi dnevni zaključak,
2. Zaključi dan,
3. Pregled dnevnih zaključaka.

Backend and documentation remain priority.

## Expected response after completion

After completing this task, report:

1. files updated,
2. functions implemented,
3. daily closing rules enforced,
4. how event locking works,
5. manual test steps,
6. limitations,
7. next recommended task.

## Recommended next task after this

Next task should be:

```text
Task 09 — Basic mobile and desktop UI wiring
```

Task 09 should implement:

1. mobile home screen,
2. request creation form,
3. request approval list,
4. payment order list,
5. execute payment screen,
6. attach document screen,
7. shift screen,
8. daily closing screen,
9. basic server calls from HTML to Apps Script.
