# FAZA 0 - Google Script Run Map

Datum: 2026-07-09  
Status: IN PROGRESS  
Izvor: `src/html/scripts.html`, `src/html/scripts-v2.html`, `src/html/desktop-v2.html`, `src/WebApp.gs`.

## 1. Centralni RPC mehanizam

Postojeci frontend ne poziva backend direktno kroz REST. Pozivi idu preko:

- `callApi(functionName, args, onSuccess, options)` u `scripts.html`,
- `v2CallApi(functionName, args, onSuccess, options)` u `scripts-v2.html`.

Oba helpera se oslanjaju na `google.script.run`.

Migracioni cilj:

```text
callApi(...) / v2CallApi(...)
->
apiClient.<module>.<method>(...)
->
fetch('/api/...')
```

Response envelope treba privremeno zadrzati kompatibilan sa `apiWrap_`.

## 2. API mapa po modulima

| Legacy API | Tip | Novi servisni metod | Predlog nove rute | Autorizacija |
|---|---|---|---|---|
| `apiLoginAppUser` | WRITE | `apiClient.auth.login` | `POST /api/auth/login` | Google session + app PIN |
| `apiLogoutAppUser` | WRITE | `apiClient.auth.logout` | `POST /api/auth/logout` | app session |
| `apiGetCurrentAppSession` | READ | `apiClient.auth.currentSession` | `GET /api/auth/session` | app session optional |
| `apiSwitchAppUser` | WRITE | `apiClient.auth.switchUser` | `POST /api/auth/switch-user` | app PIN |
| `apiGetUiBootstrap` | READ | `apiClient.bootstrap.get` | `GET /api/bootstrap` | app session |
| `apiGetCurrentUserContext` | READ | `apiClient.auth.context` | `GET /api/auth/context` | app session |
| `apiGetAppConfigForUi` | READ | `apiClient.bootstrap.config` | `GET /api/config` | app session optional |
| `apiCreatePaymentRequest` | WRITE | `apiClient.paymentRequests.create` | `POST /api/payment-requests` | `payment_requests:create` |
| `apiSubmitPaymentRequest` | WRITE | `apiClient.paymentRequests.submit` | `POST /api/payment-requests/:id/submit` | `payment_requests:create` |
| `apiUpdatePaymentRequest` | WRITE | `apiClient.paymentRequests.updateDraft` | `PATCH /api/payment-requests/:id` | `payment_requests:create` |
| `apiListMyPaymentRequests` | READ | `apiClient.paymentRequests.listMine` | `GET /api/payment-requests/mine` | app session |
| `apiListRequestsForApproval` | READ | `apiClient.paymentRequests.listForApproval` | `GET /api/payment-requests/approval` | app session |
| `apiListPaymentRequests` | READ | `apiClient.paymentRequests.list` | `GET /api/payment-requests` | app session |
| `apiApprovePaymentRequest` | WRITE | `apiClient.paymentRequests.approve` | `POST /api/payment-requests/:id/approve` | `payment_requests:approve` |
| `apiApprovePaymentRequestForDirectPayment` | WRITE | `apiClient.paymentRequests.approveDirectDeprecated` | `POST /api/payment-requests/:id/approve-direct` | `payment_requests:approve` |
| `apiRejectPaymentRequest` | WRITE | `apiClient.paymentRequests.reject` | `POST /api/payment-requests/:id/reject` | `payment_requests:reject` |
| `apiReturnPaymentRequestForCorrection` | WRITE | `apiClient.paymentRequests.returnForCorrection` | `POST /api/payment-requests/:id/return` | `payment_requests:return_for_correction` |
| `apiCreatePaymentOrderFromRequest` | WRITE | `apiClient.paymentOrders.createFromRequest` | `POST /api/payment-orders/from-request` | `payment_orders:create` |
| `apiCreateDirectPaymentOrder` | WRITE | `apiClient.paymentOrders.createDirect` | `POST /api/payment-orders` | `payment_orders:create` |
| `apiUpdateDraftPaymentOrder` | WRITE | `apiClient.paymentOrders.updateDraft` | `PATCH /api/payment-orders/:id` | `payment_orders:create` |
| `apiIssuePaymentOrder` | WRITE | `apiClient.paymentOrders.issue` | `POST /api/payment-orders/:id/issue` | `payment_orders:issue` |
| `apiCreateAndIssuePaymentOrderFromRequest` | WRITE | `apiClient.paymentOrders.createAndIssueFromRequest` | `POST /api/payment-orders/from-request/issue` | `payment_orders:create` |
| `apiApproveAndIssuePaymentOrder` | WRITE | `apiClient.paymentRequests.approveAndIssueOrder` | `POST /api/payment-requests/:id/approve-and-issue-order` | `payment_requests:approve` |
| `apiListOrdersWaitingForPayment` | READ | `apiClient.paymentOrders.listWaitingPayment` | `GET /api/payment-orders/waiting-payment` | app session |
| `apiSendPaymentOrderToCashier` | WRITE | `apiClient.paymentOrders.sendToCashier` | `POST /api/payment-orders/:id/send-to-cashier` | `payment_orders:issue` |
| `apiListPendingPaymentOrderOutflows` | READ | `apiClient.paymentOrders.listPendingOutflows` | `GET /api/payment-orders/pending-outflows` | app session |
| `apiExecutePendingPaymentOrderOutflow` | WRITE | `apiClient.paymentOrders.executePendingOutflow` | `POST /api/payment-orders/pending-outflows/:id/execute` | `payment_orders:execute` |
| `apiGetPaymentOrderTimeline` | READ | `apiClient.paymentOrders.timeline` | `GET /api/payment-orders/:id/timeline` | app session |
| `apiListPaymentOrders` | READ | `apiClient.paymentOrders.list` | `GET /api/payment-orders` | app session |
| `apiRejectPaymentOrderByCashier` | WRITE | `apiClient.paymentOrders.rejectByCashier` | `POST /api/payment-orders/:id/reject-by-cashier` | `payment_orders:reject` |
| `apiExecutePaymentOrder` | WRITE | `apiClient.paymentOrders.execute` | `POST /api/payment-orders/:id/execute` | `payment_orders:execute` |
| `apiReverseCashEvent` | WRITE | `apiClient.cashEvents.reverse` | `POST /api/cash-events/:id/reverse` | `cash_events:reverse` |
| `apiCreateCashInflow` | WRITE | `apiClient.cashEvents.createInflow` | `POST /api/cash-events/inflow` | `cash_events:create` |
| `apiCreateDirectCashOutflow` | WRITE | `apiClient.cashEvents.createDirectOutflow` | `POST /api/cash-events/direct-outflow` | `cash_events:create` |
| `apiCreateTreasuryHandover` | WRITE | `apiClient.cashEvents.createTreasuryHandover` | `POST /api/cash-events/treasury-handover` | `cash_events:create` |
| `apiCalculateCashboxBalance` | READ | `apiClient.cashEvents.balance` | `GET /api/cashboxes/:id/balance` | app session |
| `apiPrepareCashCount` | READ | `apiClient.cashCounts.prepare` | `GET /api/cash-counts/prepare` | app session |
| `apiCreateCashCount` | WRITE | `apiClient.cashCounts.create` | `POST /api/cash-counts` | `shifts:count` |
| `apiCreateCashCounts` | WRITE | `apiClient.cashCounts.createBatch` | `POST /api/cash-counts/batch` | `shifts:count` |
| `apiGetCashCountsReport` | READ | `apiClient.cashCounts.report` | `GET /api/reports/cash-counts` | app session |
| `apiAttachDocumentToEntity` | WRITE | `apiClient.documents.attach` | `POST /api/documents` | `documents:attach` |
| `apiListDocumentsForEntity` | READ | `apiClient.documents.listForEntity` | `GET /api/documents` | `documents:view` |
| `apiOpenShift` | WRITE | `apiClient.shifts.open` | `POST /api/shifts/open` | `shifts:open` |
| `apiOpenShiftWithOpeningCount` | WRITE | `apiClient.shifts.openWithCount` | `POST /api/shifts/open-with-count` | `shifts:open` |
| `apiGetMyActiveShifts` | READ | `apiClient.shifts.listMineActive` | `GET /api/shifts/mine/active` | app session |
| `apiGetShiftHistory` | READ | `apiClient.shifts.history` | `GET /api/shifts` | app session |
| `apiGetCashbookFilterOptions` | READ | `apiClient.cashbook.filterOptions` | `GET /api/cashbook/filter-options` | app session |
| `apiGetShiftBalance` | READ | `apiClient.shifts.balance` | `GET /api/shifts/:id/balance` | app session |
| `apiGetActiveShiftBalance` | READ | `apiClient.shifts.activeBalance` | `GET /api/shifts/active/balance` | app session |
| `apiGetActiveShiftState` | READ | `apiClient.shifts.activeState` | `GET /api/shifts/active/state` | app session |
| `apiHandoverShift` | WRITE | `apiClient.shifts.handover` | `POST /api/shifts/:id/handover` | `shifts:close` |
| `apiCloseShift` | WRITE | `apiClient.shifts.close` | `POST /api/shifts/:id/close` | `shifts:close` |
| `apiCloseShiftWithLatestCashCounts` | WRITE | `apiClient.shifts.closeWithLatestCounts` | `POST /api/shifts/:id/close-latest-counts` | `shifts:close` |
| `apiCloseShiftWithClosingCount` | WRITE | `apiClient.shifts.closeWithCount` | `POST /api/shifts/close-with-count` | `shifts:close` |
| `apiCloseActiveShift` | WRITE | `apiClient.shifts.closeActive` | `POST /api/shifts/active/close` | `shifts:close` |
| `apiPrepareDailyClosing` | READ | `apiClient.dailyClosing.prepare` | `GET /api/daily-closing/prepare` | app session |
| `apiCloseDailyCashbox` | WRITE | `apiClient.dailyClosing.closeCashbox` | `POST /api/daily-closing` | `shifts:close` |
| `apiListDailyClosings` | READ | `apiClient.dailyClosing.list` | `GET /api/daily-closing` | app session |
| `apiGetAuditLog` | READ | `apiClient.audit.list` | `GET /api/audit-log` | `audit:view` |
| `apiListUsers` | READ | `apiClient.users.list` | `GET /api/users` | `users:create` or `users:update` or `users:assign_roles` |
| `apiCreateUser` | WRITE | `apiClient.users.create` | `POST /api/users` | `users:create` |
| `apiUpdateUserPermissions` | WRITE | `apiClient.users.updatePermissions` | `PATCH /api/users/:id/permissions` | `users:update` or `users:assign_roles` |
| `apiResetUserPin` | WRITE | `apiClient.users.resetPin` | `POST /api/users/:id/reset-pin` | `users:update` or `users:assign_roles` |
| `apiUpdateRolePermissions` | WRITE | `apiClient.permissions.updateRole` | `PUT /api/roles/:id/permissions` | `users:assign_roles` |

## 3. Report API mapa

| Legacy API | Novi servisni metod | Predlog rute |
|---|---|---|
| `apiGetManagementDashboardSummary` | `apiClient.reports.dashboardSummary` | `GET /api/reports/dashboard-summary` |
| `apiGetCashSheetReport` | `apiClient.reports.cashSheet` | `GET /api/reports/cash-sheet` |
| `apiGetCashboxBalanceReport` | `apiClient.reports.cashboxBalance` | `GET /api/reports/cashbox-balance` |
| `apiGetOpenPaymentRequestsReport` | `apiClient.reports.openPaymentRequests` | `GET /api/reports/open-payment-requests` |
| `apiGetRequestsForApprovalReport` | `apiClient.reports.requestsForApproval` | `GET /api/reports/requests-for-approval` |
| `apiGetOrdersWaitingPaymentReport` | `apiClient.reports.ordersWaitingPayment` | `GET /api/reports/orders-waiting-payment` |
| `apiGetExecutedPaymentsReport` | `apiClient.reports.executedPayments` | `GET /api/reports/executed-payments` |
| `apiGetCashMovementsReport` | `apiClient.reports.cashMovements` | `GET /api/reports/cash-movements` |
| `apiGetMissingDocumentsReport` | `apiClient.reports.missingDocuments` | `GET /api/reports/missing-documents` |
| `apiGetDailyClosingReport` | `apiClient.reports.dailyClosing` | `GET /api/reports/daily-closing` |
| `apiGetDifferencesReport` | `apiClient.reports.differences` | `GET /api/reports/differences` |
| `apiGetCorrectionsAndReversalsReport` | `apiClient.reports.correctionsAndReversals` | `GET /api/reports/corrections-and-reversals` |
| `apiGetAuditExceptionsReport` | `apiClient.reports.auditExceptions` | `GET /api/reports/audit-exceptions` |

## 4. Direktni `google.script.run` nalazi

Direktni nalazi postoje u:

- `src/html/scripts.html`
- `src/html/scripts-v2.html`

Glavni pozivi su centralizovani u `callApi` i `v2CallApi`, ali postoje i direktni blokovi oko brzih uplata/isplata u `scripts.html` na oko linija 4965 i 5149. Ti blokovi moraju dobiti adapter pre izdvajanja frontenda.

## 5. Napomena

Ova mapa je pocetna mapa za FAZU 0. Pre funkcionalne migracije svakog modula potrebno je proveriti tacne parametre, response shape, statusne provere i audit za svaku funkciju.

