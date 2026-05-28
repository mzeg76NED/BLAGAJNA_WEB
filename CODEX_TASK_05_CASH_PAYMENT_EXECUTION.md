# CODEX_TASK_05_CASH_PAYMENT_EXECUTION.md

## Task name

BLAGAJNA WEB — Task 05: Cash payment execution from Payment Order

## Purpose of this task

Implement the first balance-affecting workflow in BLAGAJNA WEB:

```text
PAYMENT_ORDER
→ CASH_PAYMENT_EVENT / CASH_OUTFLOW
```

This task allows the cashier to execute an already issued Payment Order.

When payment is executed, the system must create a posted `CASH_OUTFLOW` event.

This is the first moment when cashbox balance changes.

## Critical business distinction

The system must strictly preserve this rule:

```text
Payment Request is not payment.
Payment Order is not payment.
Only posted Cash Event changes cashbox balance.
```

In this task:

1. `PAYMENT_REQUEST` remains only a request.
2. `PAYMENT_ORDER` remains only an authorized instruction.
3. `CASH_OUTFLOW` is the actual cash payment event.
4. Only `CASH_OUTFLOW` with status `POSTED` or `LOCKED` affects balance.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `CODEX_START_PROMPT.md`
4. `CODEX_TASK_02_DATA_MODEL_AND_DATABASE.md` if it exists
5. `CODEX_TASK_03_PAYMENT_REQUEST_WORKFLOW.md` if it exists
6. `CODEX_TASK_04_PAYMENT_ORDER_WORKFLOW.md` if it exists
7. `docs/01_DATA_MODEL.md`
8. `docs/04_PAYMENT_REQUESTS.md`
9. `docs/05_PAYMENT_ORDERS.md`
10. `docs/06_CASH_EVENTS.md` if it exists
11. `src/Config.gs`
12. `src/Database.gs`
13. `src/AuditLog.gs`
14. `src/PaymentOrders.gs`
15. `src/CashEvents.gs`
16. `src/Users.gs`
17. `src/Validation.gs` if it exists

Do not overwrite useful existing work.

If functions already exist, improve them.

If the project structure differs, adapt carefully.

## Required files to update

Update or create:

1. `src/CashEvents.gs`
2. `src/PaymentOrders.gs`
3. `src/Validation.gs` if needed
4. `src/Config.gs` only if missing constants
5. `src/AuditLog.gs` only if audit helper needs adjustment
6. `docs/06_CASH_EVENTS.md`
7. `docs/10_TEST_CASES.md`
8. `README.md` if useful

## Scope of this task

Implement:

1. payment order execution,
2. `CASH_OUTFLOW` event creation,
3. cashbox balance calculation,
4. prevention of negative balance,
5. update of paid amount on Payment Order,
6. status transition to `PAID` or `PARTIALLY_PAID`,
7. audit logging.

Do not implement:

1. document upload,
2. daily closing,
3. shift handover,
4. correction/reversal workflow beyond safe placeholder,
5. ERP/accounting integration,
6. advanced UI.

## Cash Event types

Use these event types:

```text
CASH_INFLOW
CASH_OUTFLOW
CASH_TRANSFER_IN
CASH_TRANSFER_OUT
CORRECTION
REVERSAL
```

## Cash Event statuses

Use these statuses:

```text
DRAFT
SUBMITTED
POSTED
LOCKED
CANCELLED
REVERSED
```

Only these statuses affect balance:

```text
POSTED
LOCKED
```

## Required functions in `src/CashEvents.gs`

### 1. `executePaymentOrder(orderId, paymentData)`

Executes a Payment Order and creates a posted `CASH_OUTFLOW`.

Rules:

1. Current user must be active.
2. Current user must have one of these roles:
   - CASHIER
   - CASHIER_SUPERVISOR
   - ADMIN
3. Payment Order must exist.
4. Payment Order status must be:
   - WAITING_PAYMENT
   - PARTIALLY_PAID
5. Cancelled, rejected, draft, paid or closed orders cannot be executed.
6. Payment amount must be provided or default to remaining order amount.
7. Payment amount must be greater than zero.
8. Payment amount must not exceed remaining ordered amount.
9. Payment currency must match order currency.
10. Payment cashbox must match order cashbox.
11. Cashbox must be active.
12. Currency must be active.
13. System must calculate current balance before payment.
14. If current balance is lower than payment amount, throw clear error and do not create event.
15. Create `CASH_EVENTS` row:
    - event_type = `CASH_OUTFLOW`
    - direction = `OUT`
    - status = `POSTED`
    - linked_order_id = order ID
    - linked_request_id = source request ID if available
    - cashbox_id = order cashbox
    - currency = order currency
    - amount = payment amount
    - partner_name = order pay_to_name
    - description = order purpose plus optional paymentData note
    - document_status = `MISSING` unless paymentData says `ATTACHED`
    - posted_by = current user
    - posted_at = current timestamp
16. Update Payment Order:
    - amount_paid = previous amount_paid + payment amount
    - executed_by = current user if fully paid
    - executed_at = timestamp if fully paid
    - linked_cash_event_id = event ID if fully paid and there is only one event; if partial payments exist, document limitation or store latest event ID
    - status = `PAID` if fully paid
    - status = `PARTIALLY_PAID` if not fully paid
    - updated_at = current timestamp
17. Write audit log:
    - `POST` for created Cash Event
    - `UPDATE` for Payment Order update
18. Return object:
    - `cashEvent`
    - `paymentOrder`
    - `previousBalance`
    - `newBalance`

Important:

This function is the first function that changes cashbox balance, but it does so only by creating a posted cash event.

### 2. `calculateCashboxBalance(cashboxId, currency)`

Calculates current cashbox balance.

Rules:

1. Read all `CASH_EVENTS`.
2. Include only events where:
   - cashbox_id matches,
   - currency matches,
   - status is `POSTED` or `LOCKED`.
3. Add amounts for direction `IN`.
4. Subtract amounts for direction `OUT`.
5. `NEUTRAL` does not affect balance.
6. Return number.
7. Do not use manually entered balance.

If opening balances are not implemented yet, document that current balance starts from zero until opening balance or initial cash event is entered.

### 3. `createCashInflow(data)`

Creates a posted cash inflow.

This is needed so test balance can be created before testing payment execution.

Rules:

1. Current user must have one of these roles:
   - CASHIER
   - CASHIER_SUPERVISOR
   - FINANCE
   - ADMIN
2. Validate:
   - cashbox_id
   - currency
   - amount
   - description
3. Amount must be greater than zero.
4. Cashbox must be active.
5. Currency must be active.
6. Create `CASH_EVENTS` row:
   - event_type = `CASH_INFLOW`
   - direction = `IN`
   - status = `POSTED`
   - amount
   - cashbox_id
   - currency
   - description
   - posted_by
   - posted_at
7. Write audit log with action `POST`.
8. Return created event.

### 4. `getCashEventsForCashbox(cashboxId, currency)`

Lists cash events for cashbox and currency.

Rules:

1. Current user must have one of these roles:
   - CASHIER
   - CASHIER_SUPERVISOR
   - FINANCE
   - DIRECTOR
   - ADMIN
2. Return array of events.
3. Sort newest first if easy.

### 5. `reverseCashEvent(eventId, reason)`

Safe placeholder only in this task.

Do not implement full reversal workflow yet.

Rules:

1. Function may exist.
2. It must throw clear error:

```text
Cash event reversal is not implemented in Task 05. Use later correction/reversal workflow.
```

## Required updates in `src/PaymentOrders.gs`

If not already present, implement or adjust helpers used by `executePaymentOrder()`:

1. `getPaymentOrderById(orderId)`
2. `updatePaymentOrderAfterExecution(orderId, executionData)`

Do not duplicate logic unnecessarily.

Do not let `PaymentOrders.gs` create cash events directly if `CashEvents.gs` is responsible for cash movements.

Recommended design:

1. `CashEvents.executePaymentOrder()` orchestrates payment execution.
2. `PaymentOrders` module provides read/update helpers.
3. `CashEvents` module creates the actual balance-affecting event.

## Required validation helpers

If missing, implement or update:

1. `assertRequiredFields(data, requiredFields)`
2. `assertPositiveAmount(amount)`
3. `assertAllowedValue(value, allowedValues, fieldName)`
4. `assertNonEmptyString(value, fieldName)`
5. `assertActiveCurrency(currency)`
6. `assertActiveCashbox(cashboxId)`
7. `assertSufficientBalance(balance, amount, cashboxId, currency)`
8. `assertEntityStatus(record, allowedStatuses, entityName)`

## ID rules

Use existing ID generation helper if present.

If missing, implement a simple safe helper.

Recommended prefixes:

```text
CEV
```

for cash events.

Example:

```text
CEV-2026-000001
```

Do not break existing ID strategy if one already exists.

## Required documentation: `docs/06_CASH_EVENTS.md`

Create or update this document.

It must include:

1. definition of Cash Event,
2. definition of Cash Payment Event / Cash Outflow,
3. difference between request, order and cash event,
4. event types,
5. event statuses,
6. which statuses affect balance,
7. balance calculation rule,
8. payment execution from order,
9. insufficient balance rule,
10. audit rule,
11. examples.

Include this exact statement:

```text
Stanje blagajne ne menja zahtev za isplatu i ne menja nalog za isplatu. Stanje blagajne menja samo knjižen blagajnički događaj, kao što je CASH_OUTFLOW sa statusom POSTED ili LOCKED.
```

## Required tests: update `docs/10_TEST_CASES.md`

Add manual test cases for cash payment execution.

Minimum tests:

### Test 1: Create cash inflow for test balance

Expected:

1. `createCashInflow()` creates `CASH_INFLOW`,
2. status is `POSTED`,
3. direction is `IN`,
4. audit log contains `POST`,
5. calculated balance increases.

### Test 2: Execute payment order fully

Preparation:

1. create approved request,
2. create order from request,
3. issue order,
4. create enough cash inflow.

Expected:

1. `executePaymentOrder()` creates `CASH_OUTFLOW`,
2. cash event status is `POSTED`,
3. cash event direction is `OUT`,
4. payment order status becomes `PAID`,
5. amount_paid equals amount_ordered,
6. audit log contains cash event `POST`,
7. audit log contains order `UPDATE`,
8. calculated balance decreases by payment amount.

### Test 3: Prevent payment if balance is insufficient

Expected:

1. order exists and is waiting payment,
2. cashbox balance is lower than order amount,
3. system throws clear error,
4. no `CASH_OUTFLOW` row is created,
5. order amount_paid remains unchanged,
6. order status remains unchanged.

### Test 4: Prevent payment from cancelled order

Expected:

1. cancelled order exists,
2. execution is rejected,
3. no cash event is created.

### Test 5: Prevent payment from draft order

Expected:

1. draft order exists,
2. execution is rejected,
3. no cash event is created.

### Test 6: Partial payment

Expected:

1. payment amount is smaller than remaining ordered amount,
2. `CASH_OUTFLOW` is created,
3. order status becomes `PARTIALLY_PAID`,
4. amount_paid is updated,
5. balance decreases only by paid amount.

### Test 7: Prevent overpayment

Expected:

1. payment amount is higher than remaining order amount,
2. system rejects execution,
3. no cash event is created.

### Test 8: Payment Request and Payment Order do not affect balance

Expected:

1. create payment request,
2. approve request,
3. create payment order,
4. issue payment order,
5. balance remains unchanged until `executePaymentOrder()` is called.

## Do not do these things in this task

1. Do not implement document upload.
2. Do not implement daily closing.
3. Do not implement shift handover.
4. Do not implement full reversal/correction process.
5. Do not physically delete cash events.
6. Do not store manual balance as source of truth.
7. Do not make Payment Order directly reduce balance.
8. Do not make Payment Request directly reduce balance.
9. Do not use external libraries.
10. Do not use paid services.

## Optional simple UI hook

If the existing project has a simple UI, you may add placeholder buttons or forms for:

1. Izvrši nalog za isplatu
2. Nova uplata u blagajnu
3. Presek blagajne

But backend and documentation are the priority.

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
Task 06 — Document metadata and upload workflow
```

Task 06 should implement:

1. attach document to Payment Request,
2. attach document to Payment Order,
3. attach document to Cash Event,
4. store files in Google Drive,
5. store metadata in DOCUMENTS,
6. update document_status on related entity,
7. audit log for document upload.
