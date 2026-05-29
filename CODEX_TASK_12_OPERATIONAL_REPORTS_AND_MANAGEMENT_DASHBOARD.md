# CODEX_TASK_12_OPERATIONAL_REPORTS_AND_MANAGEMENT_DASHBOARD.md

## Task name

BLAGAJNA WEB — Task 12: Operational reports and management dashboard

## Purpose of this task

Implement operational reports and a simple management dashboard for BLAGAJNA WEB.

The goal is to give management, finance and cash desk supervisors a clear overview of:

1. current cashbox balances,
2. open payment requests,
3. payment orders waiting for payment,
4. executed payments,
5. missing documents,
6. shift status,
7. daily closings,
8. differences,
9. reversals and corrections,
10. audit-sensitive exceptions.

This task must not change core business workflows.

It must read and summarize existing data.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. all `CODEX_TASK_*.md` files
4. all files in `/docs`
5. all files in `/src`

Do not overwrite useful existing work.

If report functions already exist, improve them.

If UI files already have dashboard sections, extend them carefully.

## Critical rules to preserve

These rules must remain true:

```text
Payment Request is not payment.
Payment Order is not payment.
Only posted or locked Cash Event changes cashbox balance.
```

Reports must not create, edit or delete business records.

Reports are read-only unless explicitly documented as administrative helper actions.

## Scope of this task

Implement:

1. report service functions,
2. management dashboard API wrappers,
3. dashboard UI cards,
4. simple report tables,
5. missing document report,
6. open requests report,
7. orders waiting payment report,
8. cashbox balance report,
9. daily closing report,
10. differences report,
11. corrections/reversals report,
12. documentation and manual tests.

Do not implement:

1. advanced BI,
2. charts requiring external libraries,
3. Looker Studio integration,
4. PDF export,
5. Excel export,
6. ERP integration,
7. accounting posting,
8. new approval workflows.

## Required files to update or create

Update or create:

1. `src/Reports.gs`
2. `src/WebApp.gs`
3. `src/html/desktop.html`
4. `src/html/mobile.html` only if simple report links are useful
5. `src/html/scripts.html`
6. `src/html/styles.html`
7. `docs/16_REPORTS_AND_DASHBOARD.md`
8. `docs/10_TEST_CASES.md`
9. `README.md`

If project structure differs, adapt carefully.

## Required report functions in `src/Reports.gs`

Create `Reports.gs` if it does not exist.

### 1. `getManagementDashboardSummary(filters)`

Returns high-level dashboard summary.

Input:

```javascript
{
  cashbox_id: 'CB_MAIN', // optional
  currency: 'RSD',      // optional
  date: '2026-05-28'    // optional
}
```

Output should include:

```javascript
{
  balances: [...],
  openRequestsCount: 0,
  requestsForApprovalCount: 0,
  ordersWaitingPaymentCount: 0,
  missingDocumentsCount: 0,
  openShiftsCount: 0,
  dailyClosingsTodayCount: 0,
  differencesCount: 0,
  reversalsTodayCount: 0
}
```

Rules:

1. Current user must have one of these roles:
   - ADMIN
   - DIRECTOR
   - FINANCE
   - CASHIER_SUPERVISOR
   - CASHIER for limited cashbox view if supported
2. Use existing data tables.
3. Do not change any data.
4. Return empty arrays/counts instead of throwing when there is simply no data.
5. Throw only for real errors or permission issues.

### 2. `getCashboxBalanceReport(filters)`

Returns balance by cashbox and currency.

Rules:

1. Use `calculateCashboxBalance(cashboxId, currency)`.
2. If no cashbox filter is provided, report all active cashboxes.
3. If no currency filter is provided, report all active currencies.
4. Return array:

```javascript
[
  {
    cashbox_id: 'CB_MAIN',
    cashbox_name: 'Glavna blagajna',
    currency: 'RSD',
    balance: 100000
  }
]
```

### 3. `getOpenPaymentRequestsReport(filters)`

Returns payment requests that are not final.

Include statuses:

```text
DRAFT
SUBMITTED
IN_REVIEW
APPROVED
```

Exclude:

```text
REJECTED
CONVERTED_TO_ORDER
CANCELLED
```

Fields to return:

1. request_id,
2. created_at,
3. created_by,
4. requested_for_name,
5. amount,
6. currency,
7. purpose,
8. priority,
9. status,
10. document_status.

### 4. `getRequestsForApprovalReport(filters)`

Returns requests with status:

```text
SUBMITTED
IN_REVIEW
```

Sort:

1. urgent first,
2. oldest first.

### 5. `getOrdersWaitingPaymentReport(filters)`

Returns orders with status:

```text
WAITING_PAYMENT
PARTIALLY_PAID
```

Fields:

1. order_id,
2. source_request_id,
3. cashbox_id,
4. pay_to_name,
5. amount_ordered,
6. amount_paid,
7. remaining_amount,
8. currency,
9. purpose,
10. due_date,
11. priority,
12. status,
13. document_status.

### 6. `getExecutedPaymentsReport(filters)`

Returns cash outflows.

Filters:

1. date_from,
2. date_to,
3. cashbox_id,
4. currency,
5. pay_to_name or partner_name.

Include only:

```text
event_type = CASH_OUTFLOW
status = POSTED, LOCKED
```

Fields:

1. event_id,
2. event_date,
3. cashbox_id,
4. currency,
5. amount,
6. partner_name,
7. description,
8. linked_order_id,
9. linked_request_id,
10. status,
11. document_status,
12. posted_by,
13. posted_at.

### 7. `getMissingDocumentsReport(filters)`

Returns entities where `document_status = MISSING` or where document is expected but not attached.

Minimum implementation:

1. Payment Requests with document_status = MISSING.
2. Payment Orders with document_status = MISSING.
3. Cash Events with document_status = MISSING.
4. Daily Closings with document_status = MISSING if field exists.
5. Shifts with document_status = MISSING if field exists.

Return unified array:

```javascript
[
  {
    entity_type: 'CASH_EVENT',
    entity_id: 'CEV-2026-000001',
    date: '2026-05-28',
    description: '...',
    amount: 15000,
    currency: 'RSD',
    document_status: 'MISSING'
  }
]
```

### 8. `getDailyClosingReport(filters)`

Returns daily closings.

Filters:

1. date_from,
2. date_to,
3. cashbox_id,
4. currency,
5. status.

Fields:

1. closing_id,
2. closing_date,
3. cashbox_id,
4. currency,
5. opening_balance,
6. total_in,
7. total_out,
8. calculated_balance,
9. physical_balance,
10. difference,
11. status,
12. closed_by,
13. closed_at.

### 9. `getDifferencesReport(filters)`

Returns:

1. daily closings with non-zero difference,
2. shifts with non-zero difference if difference_json exists.

Unified output:

```javascript
[
  {
    source_type: 'DAILY_CLOSING',
    source_id: 'CLS-2026-000001',
    date: '2026-05-28',
    cashbox_id: 'CB_MAIN',
    currency: 'RSD',
    calculated_balance: 100000,
    physical_balance: 99500,
    difference: -500,
    status: 'CLOSED_WITH_DIFFERENCE'
  }
]
```

### 10. `getCorrectionsAndReversalsReport(filters)`

Returns cash events where:

```text
event_type = CORRECTION
or
event_type = REVERSAL
or
status = REVERSED
```

Fields:

1. event_id,
2. event_date,
3. event_type,
4. cashbox_id,
5. currency,
6. direction,
7. amount,
8. reversal_of_event_id,
9. description,
10. status,
11. posted_by,
12. posted_at.

### 11. `getAuditExceptionsReport(filters)`

Simple exception report.

Return items such as:

1. cancelled requests,
2. rejected requests,
3. rejected payment orders,
4. cancelled payment orders,
5. cancelled documents,
6. reversed cash events,
7. daily closings with difference.

This can be a unified array with:

```javascript
{
  exception_type: 'REJECTED_REQUEST',
  entity_type: 'PAYMENT_REQUEST',
  entity_id: 'REQ-...',
  date: '...',
  description: '...',
  status: 'REJECTED'
}
```

## Required helper functions

Implement in `Reports.gs` or use existing helpers.

### `getDateRangeFilter_(filters)`

Normalizes optional date filters.

### `isDateInRange_(dateValue, dateFrom, dateTo)`

Checks date range.

### `safeNumber_(value)`

Converts value to number safely.

### `sortByPriorityAndDate_(items)`

Sorts urgent first, then date.

### `getActiveCashboxes_()`

Returns active cashboxes.

### `getActiveCurrencies_()`

Returns active currencies.

### `getCashboxName_(cashboxId)`

Returns display name if available.

## Required WebApp API wrappers

Update `src/WebApp.gs`.

Add wrappers:

1. `apiGetManagementDashboardSummary(filters)`
2. `apiGetCashboxBalanceReport(filters)`
3. `apiGetOpenPaymentRequestsReport(filters)`
4. `apiGetRequestsForApprovalReport(filters)`
5. `apiGetOrdersWaitingPaymentReport(filters)`
6. `apiGetExecutedPaymentsReport(filters)`
7. `apiGetMissingDocumentsReport(filters)`
8. `apiGetDailyClosingReport(filters)`
9. `apiGetDifferencesReport(filters)`
10. `apiGetCorrectionsAndReversalsReport(filters)`
11. `apiGetAuditExceptionsReport(filters)`

All wrappers must use existing API response format:

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

## Desktop UI requirements

Update `desktop.html`, `scripts.html` and `styles.html`.

### Dashboard cards

Add dashboard cards:

1. Stanje blagajne,
2. Zahtevi za odobrenje,
3. Nalozi za isplatu,
4. Nedostaju dokumenta,
5. Otvorene smene,
6. Dnevni zaključci,
7. Razlike,
8. Korekcije/storno.

### Report sections

Add simple report sections:

1. Presek stanja blagajni,
2. Otvoreni zahtevi,
3. Zahtevi za odobrenje,
4. Nalozi koji čekaju isplatu,
5. Izvršene isplate,
6. Nedostajuća dokumenta,
7. Dnevni zaključci,
8. Razlike,
9. Korekcije i storno,
10. Izuzeci za kontrolu.

Use plain HTML tables.

No external libraries.

### Filters

Add simple filters where practical:

1. cashbox_id,
2. currency,
3. date_from,
4. date_to,
5. status.

If full dynamic filters are too much, add minimal text/date inputs and document limitation.

## Mobile UI requirements

Mobile UI may include a simplified "Pregledi" section.

Minimum mobile report actions:

1. Presek blagajne,
2. Nalozi za isplatu,
3. Zahtevi za odobrenje,
4. Nedostaju dokumenta.

Do not overload mobile UI.

## Required documentation: create `docs/16_REPORTS_AND_DASHBOARD.md`

Document must include:

1. purpose of reports,
2. report list,
3. who can view reports,
4. dashboard card definitions,
5. data sources,
6. filters,
7. report limitations,
8. no-write/report-only rule.

Include this exact statement:

```text
Izveštaji ne smeju da menjaju podatke. Izveštaj samo čita postojeće poslovne događaje i prikazuje stanje, otvorene stavke, razlike i izuzetke.
```

## Required tests: update `docs/10_TEST_CASES.md`

Add manual tests for reports.

### Test 1: Dashboard summary

Expected:

1. dashboard API returns summary,
2. counts match current sheets,
3. no data is modified.

### Test 2: Cashbox balance report

Expected:

1. report shows active cashboxes,
2. balance matches `calculateCashboxBalance`.

### Test 3: Requests for approval report

Expected:

1. submitted/in review requests appear,
2. rejected/cancelled requests do not appear.

### Test 4: Orders waiting payment report

Expected:

1. waiting and partially paid orders appear,
2. paid/cancelled orders do not appear.

### Test 5: Missing documents report

Expected:

1. entities with `document_status = MISSING` appear,
2. entities with `ATTACHED` do not appear.

### Test 6: Daily closing report

Expected:

1. daily closing records appear,
2. filters work by date/cashbox/currency if implemented.

### Test 7: Differences report

Expected:

1. closings with non-zero difference appear,
2. zero-difference closings do not appear.

### Test 8: Corrections and reversals report

Expected:

1. correction events appear,
2. reversal events appear,
3. reversed original events appear or are documented according to chosen strategy.

### Test 9: Reports are read-only

Expected:

1. running report functions does not create, update or delete business rows,
2. audit log is not polluted by read-only report calls.

### Test 10: Desktop dashboard opens

Expected:

1. desktop dashboard loads,
2. cards are visible,
3. report tables can be refreshed.

## Do not do these things in this task

1. Do not change payment request workflow.
2. Do not change payment order workflow.
3. Do not change cash event posting logic.
4. Do not implement PDF export.
5. Do not implement Excel export.
6. Do not add external chart libraries.
7. Do not integrate Looker Studio.
8. Do not integrate ERP.
9. Do not use paid services.
10. Do not make reports write data.

## Expected response after completion

After completing this task, report:

1. files created,
2. files updated,
3. report functions implemented,
4. dashboard sections added,
5. API wrappers added,
6. manual test steps,
7. limitations,
8. next recommended task.

## Recommended next task after this

Next task should be:

```text
Task 13 — Export, printable reports and document templates
```

Task 13 should implement:

1. printable daily closing report,
2. printable shift handover report,
3. printable payment order,
4. simple HTML print views,
5. optional PDF generation if safe in Apps Script,
6. no external paid dependencies.
