# CODEX_START_PROMPT.md

## Task

You are starting a new project called **BLAGAJNA WEB**.

Your first task is NOT to build the full application.

Your first task is to create a clean initial project skeleton, documentation structure, and placeholder code structure for a Google Apps Script Web App.

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`

Then create the initial repository structure.

## Project context

BLAGAJNA WEB is an internal company cash desk application.

It must work as:

1. web application on desktop,
2. mobile-friendly browser application on phone.

The system will be built in the Google ecosystem:

1. Google Apps Script,
2. Google Sheets,
3. Google Drive,
4. HTML,
5. CSS,
6. JavaScript.

The application must support:

1. multiple users,
2. multiple cashboxes,
3. multiple currencies,
4. payment requests,
5. payment orders,
6. actual cash payments,
7. cash inflows,
8. cash transfers,
9. document upload,
10. shift handover,
11. daily cash closing,
12. audit log.

## Critical business distinction

The system must strictly distinguish:

1. **Payment Request**
2. **Payment Order**
3. **Cash Payment Event**

Definitions:

### Payment Request

A Payment Request is a request submitted by a user asking that cash be paid.

It is only a request.

It does not authorize the cashier to pay.

It does not affect cashbox balance.

### Payment Order

A Payment Order is an authorized instruction to the cashier to pay a defined amount to a defined person for a defined purpose.

It authorizes the cashier to pay.

It does not affect cashbox balance until executed.

### Cash Payment Event

A Cash Payment Event is the real execution of payment by the cashier.

Only this event affects cashbox balance.

Normal flow:

```text
PAYMENT_REQUEST
→ PAYMENT_ORDER
→ CASH_PAYMENT_EVENT
```

Important rule:

```text
Payment Request is not payment.
Payment Order is not payment.
Only executed Cash Payment Event changes cashbox balance.
```

## Initial task scope

Create only the project skeleton.

Do not implement complete business logic yet.

Do not invent advanced features.

Do not create external dependencies.

Do not use paid services.

## Required folder structure

Create this structure:

```text
blagajna-web/
  AGENTS.md
  PROJECT_BRIEF.md
  CODEX_START_PROMPT.md
  README.md
  docs/
    01_DATA_MODEL.md
    02_BUSINESS_PROCESS.md
    03_USER_ROLES.md
    04_PAYMENT_REQUESTS.md
    05_PAYMENT_ORDERS.md
    06_CASH_EVENTS.md
    07_DOCUMENTS.md
    08_UI_REQUIREMENTS.md
    09_SECURITY_AND_AUDIT.md
    10_TEST_CASES.md
  src/
    appsscript.json
    Code.gs
    Config.gs
    Database.gs
    Users.gs
    Cashboxes.gs
    Currencies.gs
    PaymentRequests.gs
    PaymentOrders.gs
    CashEvents.gs
    Documents.gs
    Shifts.gs
    DailyClosing.gs
    AuditLog.gs
    WebApp.gs
    html/
      index.html
      mobile.html
      desktop.html
      styles.html
      scripts.html
```

## Required implementation in this first task

Create placeholder code only.

### `Config.gs`

Create constants for:

1. application name,
2. sheet names,
3. status values,
4. user roles,
5. event types,
6. supported currencies.

### `Database.gs`

Create placeholder functions:

1. `initializeDatabase()`
2. `getSheetByNameOrThrow(sheetName)`
3. `appendRecord(sheetName, record)`
4. `findRecordById(sheetName, idField, idValue)`
5. `updateRecordById(sheetName, idField, idValue, updates)`

The functions may be minimal, but must have clear TODO comments.

### `Users.gs`

Create placeholder functions:

1. `getCurrentUser()`
2. `getCurrentUserRole()`
3. `assertUserHasRole(allowedRoles)`
4. `isUserActive(email)`

### `PaymentRequests.gs`

Create placeholder functions:

1. `createPaymentRequest(data)`
2. `submitPaymentRequest(requestId)`
3. `approvePaymentRequest(requestId, approvalData)`
4. `rejectPaymentRequest(requestId, reason)`
5. `cancelPaymentRequest(requestId, reason)`
6. `listMyPaymentRequests()`
7. `listRequestsForApproval()`

Add comments explaining that Payment Request never affects cashbox balance.

### `PaymentOrders.gs`

Create placeholder functions:

1. `createPaymentOrderFromRequest(requestId, orderData)`
2. `createDirectPaymentOrder(orderData)`
3. `issuePaymentOrder(orderId)`
4. `cancelPaymentOrder(orderId, reason)`
5. `listOrdersWaitingForPayment()`

Add comments explaining that Payment Order authorizes payment but does not affect cashbox balance.

### `CashEvents.gs`

Create placeholder functions:

1. `executePaymentOrder(orderId, paymentData)`
2. `createCashInflow(data)`
3. `createCashTransfer(data)`
4. `calculateCashboxBalance(cashboxId, currency)`
5. `reverseCashEvent(eventId, reason)`

Add comments explaining that only posted cash events affect cashbox balance.

### `AuditLog.gs`

Create placeholder function:

1. `writeAuditLog(action, entityType, entityId, oldValue, newValue, comment)`

Every future business action must write to audit log.

### HTML files

Create simple placeholder pages:

1. `index.html`
2. `mobile.html`
3. `desktop.html`

The UI must be in Serbian Latin script.

Initial buttons on mobile page:

1. Novi zahtev za isplatu
2. Nalozi za isplatu
3. Nova uplata
4. Presek blagajne
5. Primopredaja smene
6. Dnevni zaključak

## Required documentation stubs

Each file in `/docs` must be created with a title and short placeholder section.

Do not leave empty files.

## Quality requirements

1. Keep code modular.
2. Use clear names.
3. Do not implement business logic before documentation is complete.
4. Do not delete or overwrite existing documentation.
5. Do not use external packages.
6. Do not introduce frameworks.
7. Keep Google Apps Script compatibility.
8. Add TODO comments where implementation is intentionally left for the next step.

## Output required from Codex

After completing this task, provide:

1. list of created files,
2. short explanation of project structure,
3. what is implemented,
4. what is intentionally not implemented,
5. next recommended task.
