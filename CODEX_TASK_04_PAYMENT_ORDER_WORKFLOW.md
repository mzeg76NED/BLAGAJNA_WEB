# CODEX_TASK_04_PAYMENT_ORDER_WORKFLOW.md

## Task name

BLAGAJNA WEB — Task 04: Payment Order workflow

## Purpose of this task

Implement the second business workflow in BLAGAJNA WEB:

```text
PAYMENT_ORDER
```

A Payment Order is an authorized instruction to the cashier to pay a defined amount to a defined person for a defined purpose.

Payment Order authorizes payment, but it still does not affect cashbox balance.

Cashbox balance changes only later, when the cashier executes the order and the system creates a posted Cash Event.

This task must implement:

1. create payment order from approved payment request,
2. create direct payment order,
3. issue payment order,
4. cancel payment order,
5. reject payment order by cashier,
6. list orders waiting for payment,
7. update linked request status when order is created from request,
8. write audit log for every important action.

Do not implement actual cash payment execution in this task.

That belongs to Task 05.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `CODEX_START_PROMPT.md`
4. `CODEX_TASK_02_DATA_MODEL_AND_DATABASE.md` if it exists
5. `CODEX_TASK_03_PAYMENT_REQUEST_WORKFLOW.md` if it exists
6. `docs/01_DATA_MODEL.md`
7. `docs/04_PAYMENT_REQUESTS.md`
8. `docs/05_PAYMENT_ORDERS.md` if it exists
9. `src/Config.gs`
10. `src/Database.gs`
11. `src/AuditLog.gs`
12. `src/PaymentRequests.gs`
13. `src/PaymentOrders.gs`
14. `src/Users.gs`
15. `src/Validation.gs` if it exists

Do not overwrite useful existing work.

If functions already exist, improve them.

If the project structure differs, adapt carefully.

## Critical business rules

1. Payment Request is not payment.
2. Payment Order is not payment.
3. Payment Order is an authorized instruction to pay.
4. Payment Order does not affect cashbox balance.
5. Only executed and posted Cash Event affects cashbox balance.
6. A cashier can pay only based on a valid Payment Order.
7. A Payment Order created from request must reference the source request.
8. One approved request should not create multiple active payment orders.
9. Paid order cannot be cancelled directly.
10. Every important status change must be written to `AUDIT_LOG`.

## Required files to update

Update or create:

1. `src/PaymentOrders.gs`
2. `src/PaymentRequests.gs` only if needed for linking request to order
3. `src/Validation.gs` if needed
4. `src/Config.gs` only if missing constants
5. `src/AuditLog.gs` only if audit helper needs adjustment
6. `docs/05_PAYMENT_ORDERS.md`
7. `docs/10_TEST_CASES.md`
8. `README.md` if useful

## Payment Order statuses

Use these exact statuses:

```text
DRAFT
ISSUED
WAITING_PAYMENT
PARTIALLY_PAID
PAID
REJECTED_BY_CASHIER
CANCELLED
CLOSED
```

## Payment Order types

Use these exact values:

```text
FROM_REQUEST
DIRECT_ORDER
```

Meaning:

1. `FROM_REQUEST` means the order was created from an approved Payment Request.
2. `DIRECT_ORDER` means an authorized user created the order directly without a previous request.

Direct orders are allowed only for elevated roles.

## Required fields for PAYMENT_ORDERS

The `PAYMENT_ORDERS` sheet must support these fields:

| Field | Required | Notes |
|---|---:|---|
| order_id | yes | Generated ID |
| created_at | yes | Timestamp |
| created_by | yes | Current user email or ID |
| source_request_id | no | Required for FROM_REQUEST |
| order_type | yes | FROM_REQUEST or DIRECT_ORDER |
| cashbox_id | yes | Paying cashbox |
| pay_to_name | yes | Recipient |
| amount_ordered | yes | Must be positive |
| amount_paid | yes | Default 0 |
| currency | yes | Must be active |
| purpose | yes | Business purpose |
| description | no | Additional explanation |
| due_date | no | Due date |
| priority | yes | NORMAL or URGENT |
| status | yes | Current status |
| issued_by | no | User who issued order |
| issued_at | no | Issue timestamp |
| executed_by | no | Filled later in Task 05 |
| executed_at | no | Filled later in Task 05 |
| linked_cash_event_id | no | Filled later in Task 05 |
| document_status | yes | NONE, MISSING, ATTACHED |
| cancellation_reason | no | Required if cancelled |
| cashier_rejection_reason | no | Required if rejected by cashier |
| updated_at | no | Last update timestamp |

## Required functions

Implement or update the following functions in `src/PaymentOrders.gs`.

### 1. `createPaymentOrderFromRequest(requestId, orderData)`

Creates a Payment Order from an approved Payment Request.

Rules:

1. Request must exist.
2. Request status must be `APPROVED`.
3. Request must not already have `linked_order_id`.
4. Current user must have one of these roles:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
   - APPROVER
5. Validate required order fields:
   - cashbox_id
6. Use values from request unless explicitly overridden by allowed fields:
   - pay_to_name from `requested_for_name`
   - amount_ordered from `amount`
   - currency from `currency`
   - purpose from `purpose`
   - description from request description plus orderData description if provided
   - priority from request priority unless overridden
7. Validate amount is positive.
8. Validate currency is active.
9. Validate cashbox is active.
10. Set `order_type` to `FROM_REQUEST`.
11. Set `amount_paid` to `0`.
12. Set status to `DRAFT` by default.
13. Generate `order_id`.
14. Append record to `PAYMENT_ORDERS`.
15. Update source request:
   - status = `CONVERTED_TO_ORDER`
   - linked_order_id = created order ID
   - updated_at = current timestamp
16. Write audit log:
   - `CREATE` for payment order,
   - `UPDATE` for payment request status/link change.
17. Return created order.

Important:

Creating order does not affect cashbox balance.

### 2. `createDirectPaymentOrder(orderData)`

Creates direct Payment Order without Payment Request.

Rules:

1. Current user must have one of these roles:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
2. Validate required fields:
   - cashbox_id
   - pay_to_name
   - amount_ordered
   - currency
   - purpose
3. Amount must be greater than zero.
4. Currency must be active.
5. Cashbox must be active.
6. Set `order_type` to `DIRECT_ORDER`.
7. Set `source_request_id` empty.
8. Set `amount_paid` to `0`.
9. Set status to `DRAFT` by default.
10. Set `document_status` to `NONE` unless provided.
11. Generate `order_id`.
12. Append record to `PAYMENT_ORDERS`.
13. Write audit log with action `CREATE`.
14. Return created order.

Important:

Direct order is allowed, but it must be visible as direct order in the data.

### 3. `issuePaymentOrder(orderId)`

Issues an order to the cash desk.

Rules:

1. Order must exist.
2. Order status must be `DRAFT`.
3. Current user must have one of these roles:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
   - APPROVER
4. Set status to `WAITING_PAYMENT`.
5. Set `issued_by` to current user.
6. Set `issued_at` to current timestamp.
7. Set `updated_at`.
8. Write audit log with action `SUBMIT` or `ISSUE`.
9. Return updated order.

Important:

Issued Payment Order still does not affect balance.

### 4. `cancelPaymentOrder(orderId, reason)`

Cancels a Payment Order.

Rules:

1. Order must exist.
2. Current user must have one of these roles:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
3. Reason is mandatory.
4. Order must not be:
   - PAID
   - CLOSED
5. If order status is `PARTIALLY_PAID`, do not cancel in this task. Throw clear error saying partial payment cancellation/reversal belongs to a later correction workflow.
6. Set status to `CANCELLED`.
7. Set `cancellation_reason`.
8. Set `updated_at`.
9. Write audit log with action `CANCEL`.
10. Return updated order.

Important:

Cancelled order remains in the table. Do not delete.

### 5. `rejectPaymentOrderByCashier(orderId, reason)`

Allows cashier to reject or return order because it cannot be executed.

Examples:

1. insufficient cash in cashbox,
2. recipient not present,
3. missing documentation,
4. unclear instruction,
5. wrong cashbox,
6. suspected error.

Rules:

1. Order must exist.
2. Order status must be `WAITING_PAYMENT`.
3. Current user must have role:
   - CASHIER
   - CASHIER_SUPERVISOR
   - ADMIN
4. Reason is mandatory.
5. Set status to `REJECTED_BY_CASHIER`.
6. Set `cashier_rejection_reason`.
7. Set `updated_at`.
8. Write audit log with action `REJECT`.
9. Return updated order.

Important:

Cashier rejection does not cancel the business obligation. It only means cashier cannot execute this order as given.

### 6. `getPaymentOrderById(orderId)`

Returns one order by ID.

Rules:

1. Return null if not found.
2. Do not throw unless database failure happens.

### 7. `listOrdersWaitingForPayment()`

Lists orders that cashier can see for payment.

Rules:

1. Current user must have one of these roles:
   - CASHIER
   - CASHIER_SUPERVISOR
   - ADMIN
   - FINANCE
   - DIRECTOR
2. Return orders with status:
   - WAITING_PAYMENT
   - PARTIALLY_PAID
3. Sort urgent first if easy.
4. Sort oldest or due date first if easy.

### 8. `listPaymentOrders(filters)`

General listing function.

Rules:

1. Current user must have one of these roles:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
   - CASHIER
   - APPROVER
2. Support simple filters:
   - status
   - cashbox_id
   - currency
   - order_type
   - source_request_id
3. Return array.

### 9. `markPaymentOrderClosed(orderId, reason)`

Optional placeholder only.

Do not close paid orders in this task unless business logic already supports payment execution.

If implemented, it should throw clear error:

```text
Payment Order closing is handled after payment execution in Task 05 or later.
```

## Required validation helpers

If missing, implement or update:

1. `assertRequiredFields(data, requiredFields)`
2. `assertPositiveAmount(amount)`
3. `assertAllowedValue(value, allowedValues, fieldName)`
4. `assertNonEmptyString(value, fieldName)`
5. `assertActiveCurrency(currency)`
6. `assertActiveCashbox(cashboxId)`
7. `assertEntityStatus(record, allowedStatuses, entityName)`

## Required authorization helpers

Use existing `Users.gs` functions if available.

If not available, implement simple placeholders:

1. `getCurrentUser()`
2. `getCurrentUserEmail()`
3. `getCurrentUserRole()`
4. `assertUserHasRole(allowedRoles)`
5. `assertCurrentUserActive()`

Do not over-engineer authentication.

Use `Session.getActiveUser().getEmail()` where appropriate.

If email is unavailable because of deployment mode, document the limitation.

## Required documentation: `docs/05_PAYMENT_ORDERS.md`

Create or update this document.

It must include:

1. definition of Payment Order,
2. difference between request, order and payment,
3. order types,
4. allowed users,
5. statuses,
6. fields,
7. lifecycle,
8. business rules,
9. validation rules,
10. audit rules,
11. examples.

Include this exact statement:

```text
Nalog za isplatu je ovlašćena instrukcija blagajni da izvrši isplatu, ali sam nalog ne menja stanje blagajne. Stanje blagajne menja se tek kada blagajnik izvrši nalog i nastane knjižen/blagajnički događaj isplate.
```

## Required tests: update `docs/10_TEST_CASES.md`

Add manual test cases for Payment Order workflow.

Minimum tests:

### Test 1: Create order from approved request

Expected:

1. approved request exists,
2. order is created,
3. order has `order_type = FROM_REQUEST`,
4. order source_request_id points to request,
5. request status becomes `CONVERTED_TO_ORDER`,
6. request linked_order_id is filled,
7. audit log contains order CREATE,
8. audit log contains request UPDATE,
9. no cash event is created,
10. balance is unchanged.

### Test 2: Prevent order from unapproved request

Expected:

1. request status is DRAFT or SUBMITTED,
2. system rejects order creation,
3. no order row is created.

### Test 3: Prevent duplicate order from same request

Expected:

1. request already has linked_order_id,
2. system rejects second order creation.

### Test 4: Create direct order

Expected:

1. authorized user creates direct order,
2. order has `order_type = DIRECT_ORDER`,
3. source_request_id is empty,
4. status is DRAFT,
5. audit log contains CREATE,
6. balance is unchanged.

### Test 5: Issue payment order

Expected:

1. order status changes from DRAFT to WAITING_PAYMENT,
2. issued_by is filled,
3. issued_at is filled,
4. audit log contains ISSUE or SUBMIT,
5. balance is unchanged.

### Test 6: Cancel payment order

Expected:

1. DRAFT or WAITING_PAYMENT order can be cancelled by authorized user,
2. cancellation reason is mandatory,
3. status changes to CANCELLED,
4. audit log contains CANCEL,
5. order remains in table.

### Test 7: Cashier rejects order

Expected:

1. WAITING_PAYMENT order can be rejected by cashier with mandatory reason,
2. status changes to REJECTED_BY_CASHIER,
3. cashier_rejection_reason is filled,
4. audit log contains REJECT,
5. balance is unchanged.

### Test 8: Payment Order does not affect balance

Expected:

1. create direct order,
2. issue order,
3. no CASH_EVENTS row is created,
4. calculated balance is unchanged.

## Do not do these things in this task

1. Do not execute payment.
2. Do not create CASH_OUTFLOW.
3. Do not update cashbox balance.
4. Do not implement partial payment logic beyond status validation.
5. Do not implement document upload.
6. Do not implement daily closing.
7. Do not build complex UI.
8. Do not use external libraries.
9. Do not physically delete cancelled orders.
10. Do not make Payment Order affect balance.

## Optional simple UI hook

If the existing project already has simple HTML structure, you may add placeholder buttons or forms for:

1. Kreiraj nalog iz zahteva,
2. Direktan nalog za isplatu,
3. Nalozi koji čekaju isplatu,
4. Odbij nalog kao blagajnik.

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
Task 05 — Cash payment execution from Payment Order
```

Task 05 should implement:

1. cashier executes payment order,
2. system creates CASH_OUTFLOW event,
3. system validates balance,
4. order amount_paid is updated,
5. order status becomes PAID or PARTIALLY_PAID,
6. cashbox balance changes only through posted CASH_EVENT,
7. audit log records execution.
