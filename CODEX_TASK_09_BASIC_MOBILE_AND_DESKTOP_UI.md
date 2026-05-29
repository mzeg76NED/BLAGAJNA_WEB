# CODEX_TASK_09_BASIC_MOBILE_AND_DESKTOP_UI.md

## Task name

BLAGAJNA WEB — Task 09: Basic mobile and desktop UI wiring

## Purpose of this task

Create the first usable user interface for BLAGAJNA WEB.

The backend business workflows should already exist or be partially implemented:

1. database initialization,
2. payment requests,
3. payment orders,
4. cash payment execution,
5. document metadata/upload,
6. shifts,
7. daily closing.

This task must connect a simple mobile-friendly and desktop-friendly UI to existing Google Apps Script server functions.

Do not redesign the backend business logic.

Do not invent new business rules.

Do not introduce frameworks or external dependencies.

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
10. `CODEX_TASK_08_DAILY_CLOSING_WORKFLOW.md` if it exists
11. all docs in `/docs`
12. all files in `/src`
13. existing HTML files in `/src/html`

Do not overwrite useful existing work.

If UI files already exist, improve them.

If server functions have different names than expected, either adapt the UI to existing names or create small wrapper functions in `WebApp.gs`.

## Main goal

Create a simple UI that allows users to operate the system through browser.

The UI must be in Serbian Latin script.

The interface must be simple, practical and suitable for phone use.

## Required files to update

Update or create:

1. `src/WebApp.gs`
2. `src/html/index.html`
3. `src/html/mobile.html`
4. `src/html/desktop.html`
5. `src/html/styles.html`
6. `src/html/scripts.html`
7. `docs/08_UI_REQUIREMENTS.md`
8. `docs/10_TEST_CASES.md`
9. `README.md` if useful

If project structure is different, adapt carefully.

## Required WebApp behavior

### `doGet(e)`

Implement or update `doGet(e)` in `WebApp.gs`.

Rules:

1. Default route should show mobile page or index page.
2. Query parameter `view=mobile` should show mobile UI.
3. Query parameter `view=desktop` should show desktop UI.
4. Query parameter `view=index` should show index page.
5. HTML output must use:
   - `HtmlService.createTemplateFromFile()`
   - or existing project approach.
6. Set title to:
   - `BLAGAJNA WEB`
7. Use responsive layout.
8. Do not expose sheet IDs or sensitive configuration in frontend.

Expected routes:

```text
/webapp-url
/webapp-url?view=mobile
/webapp-url?view=desktop
```

### `include(filename)`

Create helper if not present:

```javascript
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

Use it for shared styles/scripts if existing structure supports it.

## Required server wrappers in `WebApp.gs`

Create safe wrapper functions for frontend calls.

These wrappers should call existing backend modules.

Do not duplicate business logic in wrappers.

Required wrappers:

### Payment Requests

1. `apiCreatePaymentRequest(data)`
2. `apiSubmitPaymentRequest(requestId)`
3. `apiListMyPaymentRequests()`
4. `apiListRequestsForApproval()`
5. `apiApprovePaymentRequest(requestId)`
6. `apiRejectPaymentRequest(requestId, reason)`

### Payment Orders

1. `apiCreatePaymentOrderFromRequest(requestId, orderData)`
2. `apiCreateDirectPaymentOrder(orderData)`
3. `apiIssuePaymentOrder(orderId)`
4. `apiListOrdersWaitingForPayment()`
5. `apiRejectPaymentOrderByCashier(orderId, reason)`

### Cash Events

1. `apiExecutePaymentOrder(orderId, paymentData)`
2. `apiCreateCashInflow(data)`
3. `apiCalculateCashboxBalance(cashboxId, currency)`

### Documents

1. `apiAttachDocumentToEntity(entityType, entityId, filePayload, note)`
2. `apiListDocumentsForEntity(entityType, entityId)`

### Shifts

1. `apiOpenShift(cashboxId, openingNote)`
2. `apiGetMyActiveShifts()`
3. `apiGetShiftBalance(shiftId)`
4. `apiHandoverShift(shiftId, handoverToUserEmail, physicalBalanceByCurrency, note)`
5. `apiCloseShift(shiftId, physicalBalanceByCurrency, note)`

### Daily Closing

1. `apiPrepareDailyClosing(cashboxId, currency, closingDate)`
2. `apiCloseDailyCashbox(cashboxId, currency, closingDate, physicalBalance, note)`
3. `apiListDailyClosings(filters)`

### System

1. `apiGetCurrentUserContext()`
2. `apiGetAppConfigForUi()`

## Wrapper response format

All API wrapper functions should return a consistent response object.

Success:

```javascript
{
  ok: true,
  data: result
}
```

Error:

```javascript
{
  ok: false,
  error: {
    message: error.message
  }
}
```

Do not expose full stack traces to frontend unless debug mode is enabled.

Create helper:

```javascript
function apiSuccess_(data) {}
function apiError_(error) {}
```

## Mobile UI requirements

`mobile.html` must be optimized for phone.

Use:

1. large buttons,
2. simple cards,
3. no dense tables,
4. minimal typing,
5. clear error messages,
6. clear success messages.

### Mobile home screen

Buttons:

```text
NOVI ZAHTEV ZA ISPLATU
MOJI ZAHTEVI
ZAHTEVI ZA ODOBRENJE
NALOZI ZA ISPLATU
IZVRŠI NALOG
NOVA UPLATA
DODAJ DOKUMENT
PRESEK BLAGAJNE
OTVORI SMENU
MOJE SMENE
PRIMOPREDAJA SMENE
ZATVORI SMENU
DNEVNI ZAKLJUČAK
```

If this is too many buttons, group them into sections:

1. Zahtevi,
2. Nalozi,
3. Blagajna,
4. Smena,
5. Zaključak.

### Required mobile sections

Implement simple sections that show/hide without page reload:

1. Home
2. New Payment Request
3. My Payment Requests
4. Requests for Approval
5. Orders Waiting for Payment
6. Execute Payment Order
7. New Cash Inflow
8. Attach Document
9. Cashbox Balance
10. Shift
11. Daily Closing

### New Payment Request form

Fields:

1. Primalac novca
2. Iznos
3. Valuta
4. Svrha
5. Opis
6. Prioritet

Buttons:

1. Sačuvaj zahtev
2. Pošalji zahtev na odobrenje

If backend create function creates DRAFT only, UI should create then submit.

### Requests for Approval

Show list of submitted/in review requests.

For each request show:

1. ID,
2. primalac,
3. iznos,
4. valuta,
5. svrha,
6. status.

Actions:

1. Odobri
2. Odbij

Reject action must ask for reason.

### Orders Waiting for Payment

Show list of orders with status:

1. WAITING_PAYMENT,
2. PARTIALLY_PAID.

For each order show:

1. ID,
2. primalac,
3. iznos,
4. plaćeno,
5. valuta,
6. svrha,
7. blagajna.

Actions:

1. Izvrši isplatu
2. Odbij izvršenje

### Execute Payment Order

Fields:

1. order_id,
2. amount,
3. note.

If amount is empty, backend should pay remaining amount if implemented.

### New Cash Inflow

Fields:

1. cashbox_id,
2. amount,
3. currency,
4. description.

### Attach Document

Fields:

1. entity_type,
2. entity_id,
3. file input,
4. note.

Frontend must convert file to base64 payload for Apps Script if backend expects base64.

Payload shape:

```javascript
{
  fileName: file.name,
  mimeType: file.type,
  base64Data: base64WithoutPrefix
}
```

### Cashbox Balance

Fields:

1. cashbox_id,
2. currency.

Show calculated balance.

### Shift section

Actions:

1. open shift,
2. show my active shifts,
3. show shift balance,
4. close shift.

Physical balance input may be JSON text for now.

Example:

```json
{"RSD": 100000, "EUR": 500}
```

Document this temporary limitation.

### Daily Closing section

Actions:

1. prepare daily closing,
2. close daily cashbox.

Fields:

1. cashbox_id,
2. currency,
3. closing_date,
4. physical_balance,
5. note.

## Desktop UI requirements

`desktop.html` should be a simple dashboard.

It does not need to be beautiful.

It must support operational visibility.

### Desktop sections

1. Dashboard
2. Payment Requests
3. Payment Orders
4. Cashbox Balance
5. Documents
6. Shifts
7. Daily Closings
8. Audit note/placeholder

### Dashboard

Show simple cards:

1. current user,
2. selected cashbox balance,
3. requests waiting approval,
4. orders waiting payment,
5. active shifts,
6. latest daily closings.

If some backend list functions are missing, show placeholder and document limitation.

### Tables

Use simple HTML tables.

Do not introduce DataTables or external JS libraries.

## CSS requirements

In `styles.html`:

1. responsive layout,
2. clean business style,
3. large buttons on mobile,
4. readable fonts,
5. clear status badges,
6. success/error message boxes,
7. cards and sections.

Do not use external CSS frameworks.

## JavaScript requirements

In `scripts.html`:

Use plain JavaScript.

Use `google.script.run` for Apps Script calls.

Create helper:

1. `callApi(functionName, args, onSuccess)`
2. `showSection(sectionId)`
3. `showMessage(message, type)`
4. `setLoading(isLoading)`
5. `serializeForm(formId)`
6. `fileToBase64Payload(fileInput)`

All frontend calls must handle:

1. success,
2. backend error response,
3. technical failure handler.

## Error handling

Frontend must show user-friendly Serbian messages.

Examples:

```text
Greška: zahtev nije sačuvan.
Greška: nalog nije moguće izvršiti.
Uspešno sačuvano.
Uspešno izvršeno.
```

Do not show raw JSON unless debug mode is enabled.

## Security and limitations

1. UI must not expose raw Sheet IDs.
2. UI must not allow direct editing of audit log.
3. UI must not bypass server validation.
4. Frontend validation is optional convenience only.
5. Server-side validation remains authoritative.

## Required documentation: update `docs/08_UI_REQUIREMENTS.md`

Create or update this document.

It must include:

1. UI purpose,
2. mobile UI principles,
3. desktop UI principles,
4. route structure,
5. mobile sections,
6. desktop sections,
7. API wrapper list,
8. file upload behavior,
9. known limitations.

Include this exact statement:

```text
Interfejs ne sme da sadrži poslovnu logiku koja zaobilazi server. Frontend samo prikuplja podatke i poziva server funkcije, dok se validacija i pravila izvršavaju na server strani.
```

## Required tests: update `docs/10_TEST_CASES.md`

Add manual UI test cases.

### Test 1: Open mobile UI

Expected:

1. Web App opens,
2. mobile layout is readable,
3. main buttons are visible.

### Test 2: Create payment request from mobile UI

Expected:

1. user fills form,
2. request is created,
3. success message appears,
4. row exists in PAYMENT_REQUESTS.

### Test 3: List my requests

Expected:

1. user opens My Requests,
2. list is displayed.

### Test 4: Approve request from UI

Expected:

1. approver opens Requests for Approval,
2. approves request,
3. status changes to APPROVED.

### Test 5: List orders waiting for payment

Expected:

1. cashier opens orders section,
2. waiting orders are displayed.

### Test 6: Execute payment from UI

Expected:

1. cashier executes order,
2. CASH_OUTFLOW is created,
3. order status updates,
4. balance decreases.

### Test 7: Attach document from UI

Expected:

1. user selects entity and file,
2. file uploads to Drive,
3. DOCUMENTS row is created,
4. linked entity document_status changes.

### Test 8: Open and close shift from UI

Expected:

1. cashier opens shift,
2. active shift appears,
3. close shift with physical balance works.

### Test 9: Prepare daily closing from UI

Expected:

1. preview appears,
2. calculated balance is shown,
3. close daily cashbox creates closing record.

### Test 10: Desktop UI opens

Expected:

1. desktop page opens with `?view=desktop`,
2. dashboard sections are visible.

## Do not do these things in this task

1. Do not rewrite backend business logic.
2. Do not implement new business workflows.
3. Do not use React, Vue, Angular or external frameworks.
4. Do not add paid dependencies.
5. Do not expose sensitive config to frontend.
6. Do not bypass server validation.
7. Do not edit Google Sheets directly from frontend.
8. Do not implement advanced charts.
9. Do not implement PDF reports.
10. Do not implement OCR.

## Expected response after completion

After completing this task, report:

1. files updated,
2. UI routes implemented,
3. mobile sections implemented,
4. desktop sections implemented,
5. API wrappers implemented,
6. manual test steps,
7. limitations,
8. next recommended task.

## Recommended next task after this

Next task should be:

```text
Task 10 — Hardening, permissions and end-to-end testing
```

Task 10 should verify:

1. user roles,
2. permissions,
3. end-to-end payment flow,
4. error handling,
5. deployment settings,
6. Apps Script limitations,
7. test data reset tools,
8. production readiness checklist.
