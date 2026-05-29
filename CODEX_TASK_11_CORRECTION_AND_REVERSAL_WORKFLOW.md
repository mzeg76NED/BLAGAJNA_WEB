# CODEX_TASK_11_CORRECTION_AND_REVERSAL_WORKFLOW.md

## Task name

BLAGAJNA WEB — Task 11: Correction and reversal workflow

## Purpose of this task

Implement controlled correction and reversal workflow for BLAGAJNA WEB.

The purpose is to prevent direct editing of posted, locked or closed business records.

If a mistake is discovered after a cash event is posted, the system must not silently edit the old record.

Instead, it must create a new corrective business event.

## Business principle

A cash desk system must preserve traceability.

Wrong posted cash events must not be overwritten.

Correction must be explicit, visible and auditable.

Core rule:

```text
Do not edit posted or locked cash events directly.
Correct them with reversal or correction events.
```

## Critical rules to preserve

These rules must remain true:

```text
Payment Request is not payment.
Payment Order is not payment.
Only posted or locked Cash Event changes cashbox balance.
```

Additional rules:

1. A posted `CASH_EVENT` cannot be physically deleted.
2. A locked `CASH_EVENT` cannot be edited.
3. A reversed event remains visible.
4. A reversal creates a new event with opposite direction.
5. A correction creates a new event that adjusts balance.
6. Every reversal and correction must have a mandatory reason.
7. Every reversal and correction must be written to `AUDIT_LOG`.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. all `CODEX_TASK_*.md` files
4. all files in `/docs`
5. all files in `/src`

Do not overwrite useful existing work.

If reversal/correction placeholders already exist, replace them with real controlled implementation.

If project structure differs, adapt carefully.

## Scope of this task

Implement:

1. reversal of posted cash events,
2. correction cash events,
3. prevention of direct edit for posted/locked/reversed events,
4. status update of original event to `REVERSED`,
5. link between original event and reversal event,
6. audit log for reversal/correction,
7. documentation,
8. manual tests.

Do not implement:

1. accounting posting,
2. ERP integration,
3. bank reconciliation,
4. legal PDF report generation,
5. advanced approval workflow for corrections unless already present,
6. automatic reversal of daily closing.

## Important limitation

Events already included in daily closing may be `LOCKED`.

Reversing locked events can be sensitive because the daily closing has already been performed.

For this task:

1. allow reversal of `POSTED` events,
2. allow reversal of `LOCKED` events only for elevated roles,
3. clearly mark correction after closing as `POST_CLOSING_CORRECTION` in description or correction type,
4. do not unlock previous daily closing automatically,
5. document that a later management report must show post-closing corrections.

## Required files to update or create

Update or create:

1. `src/CashEvents.gs`
2. `src/Validation.gs`
3. `src/AuditLog.gs` only if needed
4. `src/PaymentOrders.gs` only if reversal affects order status and existing logic supports it safely
5. `docs/15_CORRECTIONS_AND_REVERSALS.md`
6. `docs/10_TEST_CASES.md`
7. `README.md` if useful

## Event types

Ensure these event types exist:

```text
CASH_INFLOW
CASH_OUTFLOW
CASH_TRANSFER_IN
CASH_TRANSFER_OUT
CORRECTION
REVERSAL
```

Optional correction subtype values:

```text
AMOUNT_CORRECTION
WRONG_PERSON
WRONG_PURPOSE
WRONG_CASHBOX
WRONG_CURRENCY
POST_CLOSING_CORRECTION
OTHER
```

If adding correction subtype requires a new column, update data model carefully.

If not adding a new column, store subtype in description/note.

## Cash Event statuses

Ensure these statuses exist:

```text
DRAFT
SUBMITTED
POSTED
LOCKED
CANCELLED
REVERSED
```

Rules:

1. `POSTED` affects balance.
2. `LOCKED` affects balance.
3. `REVERSED` original event should no longer affect balance if a reversal event is created, OR it can remain included while reversal event offsets it.
4. Choose one strategy and document it clearly.

Recommended strategy:

```text
Original event status becomes REVERSED and no longer affects balance.
Reversal event is created as POSTED and affects balance in opposite direction.
```

Alternative strategy:

```text
Original event remains POSTED/LOCKED and reversal event offsets it.
```

If using alternative, document clearly.

Prefer recommended strategy unless existing code already assumes offset-only reversal.

## Required functions in `src/CashEvents.gs`

### 1. `reverseCashEvent(eventId, reason)`

Reverses a posted or locked cash event.

Rules:

1. Current user must be active.
2. Current user must have one of these roles:
   - ADMIN
   - FINANCE
   - CASHIER_SUPERVISOR
3. Event must exist.
4. Reason is mandatory.
5. Event status must be:
   - POSTED
   - LOCKED
6. Event must not already be:
   - REVERSED
   - CANCELLED
7. Create reversal event:
   - event_type = `REVERSAL`
   - direction = opposite direction of original:
     - IN becomes OUT,
     - OUT becomes IN,
     - NEUTRAL cannot be reversed in this function unless explicitly supported.
   - amount = original amount,
   - cashbox_id = original cashbox_id,
   - currency = original currency,
   - linked_request_id = original linked_request_id,
   - linked_order_id = original linked_order_id,
   - partner_name = original partner_name,
   - description = `Reversal of EVENT_ID. Reason: ...`
   - status = `POSTED`
   - reversal_of_event_id = original event ID,
   - posted_by = current user,
   - posted_at = current timestamp.
8. Update original event:
   - status = `REVERSED`,
   - updated_at = current timestamp.
9. Write audit log:
   - `REVERSE` for original event,
   - `POST` or `CREATE` for reversal event.
10. Return:
   - originalEvent,
   - reversalEvent,
   - previousBalance,
   - newBalance.

### 2. `createCorrectionEvent(data)`

Creates a correction event that adjusts cashbox balance.

Rules:

1. Current user must be active.
2. Current user must have one of these roles:
   - ADMIN
   - FINANCE
   - CASHIER_SUPERVISOR
3. Required fields:
   - cashbox_id,
   - currency,
   - direction,
   - amount,
   - description,
   - reason.
4. Direction must be:
   - IN,
   - OUT.
5. Amount must be positive.
6. Cashbox must be active.
7. Currency must be active.
8. Create `CASH_EVENTS` row:
   - event_type = `CORRECTION`,
   - direction,
   - amount,
   - status = `POSTED`,
   - description includes reason,
   - posted_by,
   - posted_at.
9. Write audit log with action `POST`.
10. Return created correction event.

Use this for cases where exact reversal is not enough.

### 3. `assertCashEventCanBeReversed_(event)`

Private helper.

Rules:

1. Throw if event missing.
2. Throw if status is not POSTED or LOCKED.
3. Throw if already REVERSED.
4. Throw if CANCELLED.
5. Throw if direction is NEUTRAL.
6. For LOCKED event, require elevated role:
   - ADMIN,
   - FINANCE.

### 4. `getOppositeDirection_(direction)`

Rules:

1. IN → OUT.
2. OUT → IN.
3. NEUTRAL → throw.

### 5. `isCashEventBalanceAffecting(event)`

If not already implemented, create or update this helper.

Rules:

1. Return true only for statuses that should affect balance.
2. If using recommended reversal strategy, `REVERSED` must not affect balance.
3. `POSTED` and `LOCKED` affect balance.
4. `CANCELLED`, `DRAFT`, `SUBMITTED`, `REVERSED` do not affect balance.

### 6. Update `calculateCashboxBalance(cashboxId, currency)`

Ensure it uses `isCashEventBalanceAffecting(event)`.

Rules:

1. Include POSTED and LOCKED.
2. Exclude REVERSED and CANCELLED.
3. IN adds.
4. OUT subtracts.
5. NEUTRAL ignored.

### 7. `preventDirectEditOfLockedCashEvent(eventId, updates)`

Optional helper.

If existing generic update functions allow editing cash events, add a guard in relevant update function.

Rules:

1. If event status is POSTED, LOCKED or REVERSED, do not allow direct editing of business fields:
   - amount,
   - currency,
   - cashbox_id,
   - direction,
   - event_type,
   - linked_order_id.
2. Throw clear error:
   - use reversal/correction workflow.
3. Non-business metadata updates may be allowed only if safe and documented.

## Payment Order relation rule

If a `CASH_OUTFLOW` linked to a Payment Order is reversed:

1. Do not automatically set order back to WAITING_PAYMENT unless business logic is clear.
2. For this task, document limitation.
3. Optionally add note/audit entry.
4. A later task may implement payment order reopening after reversal.

Do not invent risky order status transitions.

## Required validation helpers

If missing, implement or update:

1. `assertPositiveAmount(amount, fieldName)`
2. `assertNonEmptyString(value, fieldName)`
3. `assertAllowedValue(value, allowedValues, fieldName)`
4. `assertActiveCurrency(currency)`
5. `assertActiveCashbox(cashboxId)`
6. `assertEntityStatus(record, allowedStatuses, entityName)`
7. `assertMandatoryReason(reason)`

## Required documentation: create `docs/15_CORRECTIONS_AND_REVERSALS.md`

Document must include:

1. why direct editing is forbidden,
2. difference between reversal and correction,
3. reversal workflow,
4. correction workflow,
5. event statuses,
6. balance calculation after reversal,
7. locked/post-closing correction limitation,
8. relation to Payment Orders,
9. audit rules,
10. examples.

Include this exact statement:

```text
Knjižen blagajnički događaj se ne ispravlja direktnom izmenom iznosa. Greška se ispravlja storno događajem ili korektivnim događajem, tako da ostaje jasan trag šta je prvobitno urađeno i kako je ispravljeno.
```

## Required tests: update `docs/10_TEST_CASES.md`

Add manual tests for corrections and reversals.

### Test 1: Reverse posted CASH_INFLOW

Expected:

1. original CASH_INFLOW exists with status POSTED,
2. reverseCashEvent creates REVERSAL event,
3. reversal direction is OUT,
4. original status becomes REVERSED,
5. balance returns to previous value,
6. audit log contains REVERSE and POST/CREATE.

### Test 2: Reverse posted CASH_OUTFLOW

Expected:

1. original CASH_OUTFLOW exists with status POSTED,
2. reverseCashEvent creates REVERSAL event,
3. reversal direction is IN,
4. original status becomes REVERSED,
5. balance increases by reversed amount,
6. audit log records reversal.

### Test 3: Prevent duplicate reversal

Expected:

1. event status is already REVERSED,
2. second reversal attempt is rejected,
3. no new reversal event is created.

### Test 4: Prevent reversal without reason

Expected:

1. reason is empty,
2. system rejects reversal,
3. no data changes.

### Test 5: Create correction IN

Expected:

1. correction event direction IN is created,
2. status is POSTED,
3. balance increases,
4. audit log contains POST.

### Test 6: Create correction OUT

Expected:

1. correction event direction OUT is created,
2. status is POSTED,
3. balance decreases,
4. audit log contains POST.

### Test 7: Locked event reversal requires elevated role

Expected:

1. event is LOCKED,
2. non-elevated user cannot reverse,
3. ADMIN or FINANCE can reverse if implemented,
4. audit log records action.

### Test 8: Balance excludes REVERSED original event

Expected:

1. original event is REVERSED,
2. balance calculation excludes it,
3. reversal event affects balance according to direction.

## Do not do these things in this task

1. Do not physically delete cash events.
2. Do not directly edit posted event amount.
3. Do not automatically reopen payment orders unless explicitly implemented and documented.
4. Do not unlock daily closing automatically.
5. Do not integrate with accounting.
6. Do not generate legal PDF reports.
7. Do not use external libraries.
8. Do not use paid services.

## Expected response after completion

After completing this task, report:

1. files updated,
2. reversal functions implemented,
3. correction functions implemented,
4. balance calculation behavior,
5. audit log behavior,
6. manual test steps,
7. limitations,
8. next recommended task.

## Recommended next task after this

Next task should be:

```text
Task 12 — Operational reports and management dashboard
```

Task 12 should implement:

1. open requests report,
2. orders waiting payment report,
3. current cashbox balance report,
4. daily closing report,
5. missing documents report,
6. differences report,
7. simple management dashboard.
