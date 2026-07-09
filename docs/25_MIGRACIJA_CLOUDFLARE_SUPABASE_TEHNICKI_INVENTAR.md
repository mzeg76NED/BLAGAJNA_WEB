# Migracija sistema: tehnicki inventar za Cloudflare Pages + Supabase PostgreSQL

Datum analize: 2026-07-09  
Aktivni repo: `C:\Users\milan\source\repos\BLAGAJNA_WEB`  
Backup/prototip folder: `D:\NED.POSAO\MyDocNED\NED\...DOC\PROJEKTI_AI\CODEX\BLAGAJNA`  
Vazeca aplikacija: `BLAGAJNA WEB`, verzija `2.0.38-business-record-read-recovery`

## 1. Svrha dokumenta

Ovaj dokument je tehnicki inventar postojeceg Google Apps Script sistema za migraciju na:

- Cloudflare Pages za frontend,
- Cloudflare Pages Functions ili Worker API za backend endpoint-e,
- Supabase PostgreSQL za poslovnu bazu,
- Supabase Storage ili kompatibilan storage za dokumente.

Inventar ne predlaze funkcionalne izmene. Cilj migracije je da se postojece funkcije, statusi, poslovna pravila, UI tekstovi i tokovi prenesu sto vernije.

## 2. Izvori analize

Glavni izvor je aktivni repo naveden u `AKTIVNI_REPO_PREMESTEN.txt`: `C:\Users\milan\source\repos\BLAGAJNA_WEB`.

Drive folder u trenutnom workspace-u sadrzi stariji skeleton, mockup HTML fajlove, slike i zadatke. On je koristan kao istorijski i dizajnerski materijal, ali nije glavni izvor za migraciju poslovne logike.

Najbitniji aktivni fajlovi:

- `src/00_Config.gs` - konfiguracija, statusi, tipovi, sheet nazivi, headeri.
- `src/Database.gs` - Google Sheets CRUD sloj.
- `src/WebApp.gs` - Apps Script web rute i javni API wrapper-i.
- `src/Users.gs` i `src/AppLogin.gs` - korisnici, role, privilegije, PIN login i app sesije.
- `src/PaymentRequests.gs`, `src/PaymentOrders.gs`, `src/CashEvents.gs` - glavni tok isplate.
- `src/CashCounts.gs`, `src/Shifts.gs`, `src/DailyClosing.gs` - preseci, smene i zakljucak.
- `src/Documents.gs` - Google Drive dokumenti i metadata.
- `src/Reports.gs`, `src/PrintViews.gs`, `src/BackupExport.gs`, `src/AdminTools.gs`, `src/SmokeTests.gs`.
- `src/html/*.html` - Apps Script HTML frontend, CSS, JS, print prikazi.

## 3. Trenutna platforma

Trenutni sistem je Google Workspace aplikacija:

- Apps Script V8 runtime.
- Deployment preko `.clasp`, `rootDir: src`.
- Web App `executeAs: USER_ACCESSING`, `access: DOMAIN`.
- Google Sheets kao baza.
- Google Drive kao skladiste dokumenata i backup-a.
- `google.script.run` kao RPC kanal iz browsera ka Apps Script funkcijama.
- `HtmlService` template include sistem za HTML/CSS/JS.
- `Session.getActiveUser()` za Google Workspace tehnicku sesiju.
- Interni app login preko `user_code` + PIN-a i `APP_SESSIONS` sheet-a.

Direktne Apps Script zavisnosti za migraciju:

- `SpreadsheetApp` -> Supabase PostgreSQL.
- `DriveApp` -> Supabase Storage ili Cloudflare R2.
- `HtmlService` / `ContentService` -> Cloudflare Pages static assets i Functions responses.
- `Session` / `ScriptApp` -> auth/session layer i env vars.
- `Utilities` -> Web Crypto / Node crypto, date formatting, UUID.
- `LockService` -> PostgreSQL transakcije i row-level locking.
- `PropertiesService` -> environment variables / Supabase secrets.
- `CacheService` -> in-memory edge cache, KV ili DB cache strategy.
- `google.script.run` -> `fetch()` prema REST API endpoint-ima.

## 4. Ciljno mapiranje platforme

| Postojece | Migracija |
|---|---|
| Apps Script `.gs` poslovne funkcije | TypeScript/JavaScript service layer u Cloudflare Functions/Worker-u |
| `WebApp.gs` API wrapper-i | REST endpoint-i, npr. `/api/payment-requests` |
| Google Sheets listovi | PostgreSQL tabele |
| `TABLE_HEADERS` | SQL migracije, kolone, constraint-i, index-i |
| `appendRecord`, `findRecordById`, `updateRecordById`, `listRecords` | Supabase client queries ili SQL funkcije |
| `LockService` | DB transakcije, `SELECT ... FOR UPDATE`, advisory locks |
| Google Drive file upload | Supabase Storage bucket ili R2 bucket |
| `APP_SESSIONS` sheet | `app_sessions` tabela |
| `ROLES`, `PERMISSIONS`, `ROLE_PERMISSIONS` sheetovi | RBAC tabele + RLS/policy layer |
| `AUDIT_LOG` sheet | Append-only `audit_log` tabela |
| `HtmlService` includes | Build-time bundled frontend |
| `google.script.run` | `fetch('/api/...')` |
| Apps Script print routes | Cloudflare Pages routes / print pages |
| Browser Save as PDF | Ostaje browser print, bez server-side PDF-a |

## 5. Baza podataka: postojece tabele

Postojeci `TABLE_HEADERS` definise 15 sheet-ova. Migracija treba da ih prenese kao PostgreSQL tabele, po mogucstvu u `snake_case`.

### `users`

Izvor: `USERS`.

Kolone:

`user_id`, `email`, `full_name`, `role`, `active`, `default_cashbox_id`, `created_at`, `updated_at`, `user_code`, `pin_hash`, `pin_salt`, `last_login_at`, `last_logout_at`, `failed_login_count`, `locked_until`, `last_google_session_email`.

Napomene:

- `user_code` je operativni login identifikator.
- PIN se ne cuva kao plain text.
- `default_cashbox_id` referencira `cashboxes.cashbox_id`.
- Treba jedinstveni index za `user_id`, pozeljno i za aktivni `user_code`.

### `app_sessions`

Izvor: `APP_SESSIONS`.

Kolone:

`session_id`, `app_user_id`, `user_code`, `role`, `google_session_email`, `cashbox_id`, `shift_id`, `created_at`, `last_seen_at`, `expires_at`, `active`, `logout_at`, `device_label`.

Napomene:

- Sesija traje 12 sati u trenutnom kodu.
- Migracija mora sacuvati server-side session gating za write API-je.
- `session_id` ne sme biti predvidiv.

### `roles`, `permissions`, `role_permissions`

Izvori: `ROLES`, `PERMISSIONS`, `ROLE_PERMISSIONS`.

Kolone:

- `roles`: `role_id`, `role_name`, `description`, `active`, `system_role`, `created_at`, `updated_at`.
- `permissions`: `permission_id`, `permission_name`, `description`, `category`, `active`, `system_permission`, `created_at`, `updated_at`.
- `role_permissions`: `role_id`, `permission_id`, `allowed`, `created_at`, `updated_at`.

Napomene:

- Trenutno postoji hardcoded fallback `ROLE_PRIVILEGES`.
- U Supabase-u treba sacuvati fallback semantiku ili izvrsiti seed ovih tabela pre ukljucenja RLS-a.

### `cashboxes`

Izvor: `CASHBOXES`.

Kolone:

`cashbox_id`, `name`, `location`, `responsible_user_id`, `active`, `created_at`, `updated_at`.

### `currencies`

Izvor: `CURRENCIES`.

Kolone:

`currency_code`, `name`, `active`, `is_default`, `denominations`.

Valute u kodu: `RSD`, `EUR`; u pravilima za limit postoji i `ČEK` kao posebna vrednost u approval rules, ali `SUPPORTED_CURRENCIES` je `RSD`, `EUR`.

### `payment_requests`

Izvor: `PAYMENT_REQUESTS`.

Kolone:

`request_id`, `created_at`, `created_by`, `requester_user_id`, `requested_for_name`, `amount`, `currency`, `purpose`, `description`, `preferred_cashbox_id`, `needed_by_date`, `priority`, `status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `linked_order_id`, `approval_path`, `direct_cash_event_id`, `returned_for_correction_reason`, `cancellation_reason`, `document_status`, `updated_at`.

Kriticno pravilo:

- Payment Request nije isplata.
- Ne sme menjati stanje.
- Redovan tok vodi ka Payment Order-u.

### `payment_orders`

Izvor: `PAYMENT_ORDERS`.

Kolone:

`order_id`, `created_at`, `created_by`, `source_request_id`, `linked_request_id`, `order_type`, `cashbox_id`, `pay_to_name`, `amount_ordered`, `amount_paid`, `currency`, `purpose`, `description`, `due_date`, `priority`, `status`, `issued_by`, `issued_at`, `executed_by`, `executed_at`, `linked_cash_event_id`, `document_status`, `cancellation_reason`, `cashier_rejection_reason`, `updated_at`.

Kriticno pravilo:

- Payment Order autorizuje isplatu, ali ne menja stanje.
- Izvrsenje ide kroz pending `CASH_OUTFLOW` i postovanje cash event-a.

### `cash_events`

Izvor: `CASH_EVENTS`.

Kolone:

`event_id`, `created_at`, `created_by`, `event_date`, `event_type`, `cashbox_id`, `currency`, `direction`, `amount`, `linked_request_id`, `linked_order_id`, `partner_name`, `description`, `document_status`, `status`, `posted_by`, `posted_at`, `locked_by`, `locked_at`, `reversal_of_event_id`, `updated_at`.

Kriticno pravilo:

- Samo `POSTED` ili `LOCKED` dogadjaji ulaze u saldo.
- `DRAFT`, `SUBMITTED`, `CANCELLED`, `REVERSED` ne smeju menjati saldo.
- Posted/locked event ne sme da se menja direktno osim kroz definisane reversal/correction tokove.

### `cash_counts`

Izvor: `CASH_COUNTS`.

Kolone:

`count_id`, `created_at`, `created_by`, `count_type`, `cashbox_id`, `shift_id`, `currency`, `counted_cash_total`, `check_count`, `check_total`, `calculated_balance_before`, `difference`, `denominations_json`, `adjustment_event_id`, `note`, `status`, `posted_by`, `posted_at`, `updated_at`.

Napomene:

- Ako postoji razlika, sistem pravi korektivni `CASH_EVENTS` dogadjaj.
- `denominations_json` treba prevesti u `jsonb`.

### `documents`

Izvor: `DOCUMENTS`.

Kolone:

`document_id`, `created_at`, `uploaded_by`, `entity_type`, `entity_id`, `file_name`, `file_id`, `file_url`, `mime_type`, `status`, `note`.

Napomene:

- `file_id` je trenutno Google Drive ID.
- U Supabase/R2 varijanti treba cuvati `bucket`, `object_path`, `public_url` ili signed URL metadata.
- Dokument se ne brise fizicki kroz poslovne funkcije; koristi status.

### `shifts`

Izvor: `SHIFTS`.

Kolone:

`shift_id`, `cashbox_id`, `opened_by`, `opened_at`, `opening_note`, `opening_balance_json`, `closed_by`, `closed_at`, `handover_to`, `handover_at`, `closing_balance_json`, `physical_balance_json`, `difference_json`, `status`, `note`, `updated_at`.

Napomene:

- Zatvorene smene su immutable.
- JSON kolone treba prevesti u `jsonb`.
- Potreban constraint koji sprecava dve otvorene smene po blagajni.

### `daily_closing`

Izvor: `DAILY_CLOSING`.

Kolone:

`closing_id`, `closing_date`, `cashbox_id`, `currency`, `opening_balance`, `total_in`, `total_out`, `calculated_balance`, `physical_balance`, `difference`, `status`, `closed_by`, `closed_at`, `locked_by`, `locked_at`, `note`, `updated_at`.

Napomene:

- Dnevni zakljucak zakljucava ukljucene cash event-e.
- Potreban unique constraint nad `closing_date`, `cashbox_id`, `currency` za aktivne zakljucke.

### `audit_log`

Izvor: `AUDIT_LOG`.

Kolone:

`log_id`, `timestamp`, `user`, `app_user_id`, `app_user_name`, `user_code`, `role`, `google_session_email`, `cashbox_id`, `shift_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `comment`.

Napomene:

- Append-only.
- `old_value` i `new_value` treba da budu `jsonb`.
- Korisnicke akcije ne smeju brisati ili azurirati audit log.

## 6. Statusi, tipovi i enum-i

Migracija treba da zadrzi postojece string vrednosti.

Role:

`ADMIN`, `DIRECTOR`, `FINANCE`, `CASHIER_SUPERVISOR`, `CASHIER`, `APPROVER`, `REQUESTER`, `VIEWER`.

Request statusi:

`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `CASHIER_REVIEW`, `APPROVED`, `APPROVED_FOR_DIRECT_PAYMENT`, `ESCALATED_TO_ORDER`, `ORDER_CREATED`, `PAID`, `REJECTED`, `RETURNED_FOR_CORRECTION`, `CONVERTED_TO_ORDER`, `CANCELLED`.

Order statusi:

`DRAFT`, `ISSUED`, `WAITING_PAYMENT`, `PARTIALLY_PAID`, `PAID`, `REJECTED_BY_CASHIER`, `CANCELLED`, `CLOSED`.

Cash event statusi:

`DRAFT`, `SUBMITTED`, `POSTED`, `LOCKED`, `CANCELLED`, `REVERSED`.

Cash event tipovi:

`CASH_INFLOW`, `CASH_OUTFLOW`, `CASH_TRANSFER_IN`, `CASH_TRANSFER_OUT`, `TREASURY_HANDOVER`, `CORRECTION`, `REVERSAL`.

Dokument statusi:

`NONE`, `MISSING`, `ATTACHED`, `ACTIVE`, `REPLACED`, `CANCELLED`.

Shift statusi:

`OPEN`, `HANDED_OVER`, `CLOSED`, `CLOSED_WITH_DIFFERENCE`, `CANCELLED`.

Daily closing statusi:

`DRAFT`, `CLOSED`, `CLOSED_WITH_DIFFERENCE`, `LOCKED`, `CANCELLED`.

Cash count tipovi:

`SHIFT_OPENING`, `CASHBOX_COUNT`, `SHIFT_CLOSING`, `DAILY_CLOSING_COUNT`.

Cash count statusi:

`DRAFT`, `POSTED`, `CANCELLED`.

## 7. Poslovni tokovi za prenosenje bez izmene

### Tok isplate

Vazeci tok:

`PAYMENT_REQUEST -> APPROVAL -> PAYMENT_ORDER -> pending CASH_OUTFLOW/SUBMITTED -> CASH_PAYMENT_EVENT/POSTED -> DOCUMENT/RECEIPT -> CLOSING`

Bitna implementaciona napomena:

- `executePaymentOrder(orderId, paymentData)` sada zahteva da nalog prvo ima pending `CASH_OUTFLOW` event u statusu `SUBMITTED`.
- `executePendingPaymentOrderOutflow(pendingPaymentId, paymentData)` postuje taj event, proverava saldo, aktivnu smenu, cashbox i valutu, zatim azurira nalog na `PAID` ili `PARTIALLY_PAID`.

### Zahtevi za isplatu

Glavne funkcije:

- `createPaymentRequest`
- `submitPaymentRequest`
- `updatePaymentRequest`
- `markPaymentRequestInReview`
- `approvePaymentRequest`
- `approvePaymentRequestForDirectPayment`
- `rejectPaymentRequest`
- `returnPaymentRequestForCorrection`
- `cancelPaymentRequest`
- `listMyPaymentRequests`
- `listRequestsForApproval`
- `listPaymentRequests`

Migracioni zahtev:

- Ne menjati semantiku statusa i approval path-a.
- Posebno paziti na deprecated/direktne isplate zahteva; redovan tok ne sme zaobici nalog.

### Nalozi za isplatu

Glavne funkcije:

- `createPaymentOrderFromRequest`
- `createDirectPaymentOrder`
- `updateDraftPaymentOrder`
- `issuePaymentOrder`
- `sendPaymentOrderToCashier`
- `cancelPaymentOrder`
- `rejectPaymentOrderByCashier`
- `listOrdersWaitingForPayment`
- `listPendingPaymentOrderOutflows`
- `getPaymentOrderTimeline`
- `listPaymentOrders`
- `markPaymentOrderClosed`
- `repairPaymentOrdersCashboxFromRequest`

Migracioni zahtev:

- Nalog ne menja saldo.
- Slanje naloga blagajniku/pending event mora ostati transakciono povezano.

### Cash events

Glavne funkcije:

- `executePaymentOrder`
- `executePendingPaymentOrderOutflow`
- `createCashInflow`
- `createCashTransfer`
- `calculateCashboxBalance`
- `calculateCashboxBalances`
- `getCashEventsForCashbox`
- `reverseCashEvent`
- `createCorrectionEvent`
- `createDirectCashOutflow`
- `createTreasuryHandover`

Migracioni zahtev:

- Saldo mora biti SQL agregacija iz `cash_events`.
- Izvrsenje isplate mora biti transakcija.
- Storno i korekcija moraju praviti nove event-e, ne fizicku izmenu originala.

### Smene i preseci

Glavne funkcije:

- `openShift`
- `openShiftWithOpeningCount`
- `getActiveShiftForCashbox`
- `getMyActiveShifts`
- `getShiftBalance`
- `handoverShift`
- `closeShift`
- `closeShiftWithLatestCashCounts`
- `closeShiftWithClosingCount`
- `createCashCount`
- `createCashCounts`
- `prepareCashCount`
- `getCashCountsReport`

Migracioni zahtev:

- Jedna otvorena smena po blagajni.
- Blagajnik sme raditi write akcije samo u okviru svoje aktivne smene gde pravilo to trazi.

### Dnevni zakljucak

Glavne funkcije:

- `prepareDailyClosing`
- `closeDailyCashbox`
- `getDailyClosingById`
- `findDailyClosing`
- `listDailyClosings`
- `lockDailyClosing`
- `cancelDailyClosing`

Migracioni zahtev:

- Zakljucak dana zakljucava ukljucene dogadjaje.
- Zatvoreni dnevni zakljucci su immutable.

### Dokumenti

Glavne funkcije:

- `attachDocumentToEntity`
- `linkDocumentToEntity`
- `createDocumentMetadata`
- `listDocumentsForEntity`
- `listActiveDocumentsForEntity`
- `cancelDocument`
- `replaceDocument`

Migracioni zahtev:

- Upload API mora prihvatiti fajl payload umesto Apps Script base64/Drive blob logike.
- Metadata mora ostati povezana sa jednim poslovnim entitetom.

## 8. API inventar

`WebApp.gs` je trenutni javni API sloj. U migraciji svaki `api*` wrapper treba dobiti REST endpoint ili RPC endpoint.

Grupe API-ja:

- Zahtevi: `apiCreatePaymentRequest`, `apiSubmitPaymentRequest`, `apiUpdatePaymentRequest`, `apiListMyPaymentRequests`, `apiListRequestsForApproval`, `apiListPaymentRequests`, `apiApprovePaymentRequest`, `apiApprovePaymentRequestForDirectPayment`, `apiRejectPaymentRequest`, `apiReturnPaymentRequestForCorrection`.
- Nalozi: `apiCreatePaymentOrderFromRequest`, `apiCreateDirectPaymentOrder`, `apiUpdateDraftPaymentOrder`, `apiIssuePaymentOrder`, `apiCreateAndIssuePaymentOrderFromRequest`, `apiApproveAndIssuePaymentOrder`, `apiListOrdersWaitingForPayment`, `apiSendPaymentOrderToCashier`, `apiListPendingPaymentOrderOutflows`, `apiExecutePendingPaymentOrderOutflow`, `apiGetPaymentOrderTimeline`, `apiListPaymentOrders`, `apiRejectPaymentOrderByCashier`, `apiExecutePaymentOrder`.
- Cash events: `apiReverseCashEvent`, `apiCreateCashInflow`, `apiCreateDirectCashOutflow`, `apiCreateTreasuryHandover`, `apiCalculateCashboxBalance`.
- Preseci: `apiPrepareCashCount`, `apiCreateCashCount`, `apiCreateCashCounts`, `apiGetCashCountsReport`.
- Dokumenti: `apiAttachDocumentToEntity`, `apiListDocumentsForEntity`.
- Smene: `apiOpenShift`, `apiOpenShiftWithOpeningCount`, `apiGetMyActiveShifts`, `apiGetShiftHistory`, `apiGetCashbookFilterOptions`, `apiGetShiftBalance`, `apiGetActiveShiftBalance`, `apiGetActiveShiftState`, `apiHandoverShift`, `apiCloseShift`, `apiCloseShiftWithLatestCashCounts`, `apiCloseShiftWithClosingCount`, `apiCloseActiveShift`.
- Dnevni zakljucak: `apiPrepareDailyClosing`, `apiCloseDailyCashbox`, `apiListDailyClosings`.
- Dashboard/reporti: `apiGetManagementDashboardSummary`, `apiGetCashSheetReport`, `apiGetCashboxBalanceReport`, `apiGetOpenPaymentRequestsReport`, `apiGetRequestsForApprovalReport`, `apiGetOrdersWaitingPaymentReport`, `apiGetExecutedPaymentsReport`, `apiGetCashMovementsReport`, `apiGetMissingDocumentsReport`, `apiGetDailyClosingReport`, `apiGetDifferencesReport`, `apiGetCorrectionsAndReversalsReport`, `apiGetAuditExceptionsReport`.
- App login: `apiLoginAppUser`, `apiLogoutAppUser`, `apiGetCurrentAppSession`, `apiSwitchAppUser`.
- Korisnici i prava: `apiListUsers`, `apiCreateUser`, `apiUpdateUserPermissions`, `apiResetUserPin`, `apiPrepareUsersForAppLogin`, `apiGetRolePermissionsMatrix`, `apiListRoles`, `apiListPermissions`, `apiUpdateRolePermissions`, `apiGetPermissionsMatrix`.
- Sistem: `apiGetUiBootstrap`, `apiGetCurrentUserContext`, `apiGetAppConfigForUi`, `apiGetAuditLog`, `apiRepairPaymentOrdersCashboxFromRequest`.

Postojeci `apiWrap_` format vraca success/error envelope. Migracija treba da zadrzi kompatibilan response format dok se frontend ne prebaci.

## 9. Frontend inventar

HTML fajlovi:

- `index.html` - pocetni izbor.
- `mobile.html` - mobilni UI.
- `desktop.html` - glavni/stari desktop UI.
- `desktop-v2.html` - moderniji desktop UI.
- `print-payment-request.html`, `print-payment-order.html`, `print-cash-event.html`, `print-shift-handover.html`, `print-daily-closing.html`, `print-report.html`.
- `styles.html`, `styles-v2.html`, `print-styles.html`.
- `scripts.html`, `scripts-v2.html`.

Rute iz `WebApp.gs`:

- `?view=index`
- `?view=mobile`
- `?view=desktop`
- `?view=desktop-v2`
- `?view=manifest`
- `?view=sw`
- `?view=print-payment-request&id=...`
- `?view=print-payment-order&id=...`
- `?view=print-cash-event&id=...`
- `?view=print-shift-handover&id=...`
- `?view=print-daily-closing&id=...`
- `?view=print-report&type=...`

Migracioni zahtev:

- Zameniti Apps Script template include sa standardnim bundling-om.
- Zameniti `google.script.run` centralnim `fetch` klijentom.
- Zadrzati `sessionStorage` kljuc `BLAGAJNA_APP_SESSION_ID` ili uvesti kompatibilni migration adapter.
- PWA manifest i service worker prebaciti u static fajlove ili Pages Function odgovore.

## 10. Auth i autorizacija

Postojeci model ima dva identiteta:

- Google session email kao tehnicki nalog.
- Aplikativni korisnik iz `USERS` preko `user_code` + PIN.

Backend write API-ji koriste `requireAppSession(sessionId, requiredPrivileges)`. Ovo mora biti preneto.

Privilegije:

`users:create`, `users:update`, `users:disable`, `users:assign_roles`, `roles:view`, `roles:update`, `permissions:view`, `permissions:update`, `payment_requests:create`, `payment_requests:view_own`, `payment_requests:view_all`, `payment_requests:approve`, `payment_requests:reject`, `payment_requests:return_for_correction`, `payment_requests:cancel`, `payment_orders:create`, `payment_orders:view`, `payment_orders:issue`, `payment_orders:reject`, `payment_orders:cancel`, `payment_orders:execute`, `payment_orders:reverse`, `documents:attach`, `documents:view`, `documents:cancel`, `cash_events:create`, `cash_events:view`, `cash_events:reverse`, `treasury:create`, `treasury:view`, `shifts:open`, `shifts:count`, `shifts:close`, `shifts:handover`, `shifts:view`, `audit:view`.

Supabase RLS preporuka:

- Ne oslanjati se samo na client-side Supabase SDK.
- Business write operacije voditi kroz server API sa service role key-em.
- RLS koristiti za dodatnu zastitu read-a i eventualno admin/readonly pristup.
- Audit pisati server-side.

## 11. Transakcije i zakljucavanje

Mesta koja trenutno koriste `LockService` i moraju postati DB transakcije:

- `createCashCount`, `createCashCounts`
- `executePendingPaymentOrderOutflow`
- `reverseCashEvent`
- `createDirectCashOutflow`
- `createTreasuryHandover`
- `closeDailyCashbox`
- `openShift`, `openShiftWithOpeningCount`
- `handoverShift`, `closeShift`
- `createPaymentOrderFromRequest`, `sendPaymentOrderToCashier`

Za PostgreSQL:

- koristiti transakcije za svaku operaciju koja menja vise tabela,
- zakljucati nalog/event/smenu pre promene statusa,
- koristiti unique partial index za otvorene smene i dnevne zakljucke,
- saldo racunati iz baze, ne cuvati kao slobodan unos.

## 12. Dokumenti i storage

Trenutno:

- Dokumenti idu u Google Drive.
- `DOCUMENTS` cuva metadata i link.
- Fajl se moze otkazati/zameniti statusom, bez fizickog brisanja poslovnog traga.

Migracija:

- Bucket: npr. `business-documents`.
- Object path: `entity_type/entity_id/document_id/original_filename`.
- Metadata u `documents` tabeli.
- Upload endpoint mora validirati app session, pravo `documents:attach`, entitet i status.
- Download treba koristiti signed URL ako dokumenti nisu javni.

## 13. Reporti i print

Postoje report funkcije:

- dashboard summary,
- saldo blagajne,
- blagajnicka knjiga,
- otvoreni zahtevi,
- zahtevi za odobrenje,
- nalozi koji cekaju,
- izvrsene isplate,
- cash movements,
- dokumenti koji nedostaju,
- dnevni zakljucci,
- razlike,
- korekcije/storna,
- audit exceptions,
- otvorene smene.

Migracija:

- Reporte preneti kao SQL query/view/service funkcije.
- Print stranice zadrzati kao HTML print prikaze.
- Server-side PDF nije implementiran i ne treba ga dodavati u migraciji ako cilj nema funkcionalne izmene.

## 14. Testovi i QA inventar

Postoje `SmokeTests.gs` funkcije:

- database initialization,
- payment request/order/cash payment flow,
- document workflow,
- shift workflow,
- daily closing workflow,
- reports read-only,
- draft order cannot be executed,
- overpayment rejected,
- duplicate order prevention,
- request limit behavior,
- permission matrix,
- app login/session readiness,
- user admin checks.

Migracija treba da dobije ekvivalent:

- unit testovi za service funkcije,
- integration testovi nad Supabase test bazom,
- API testovi za svaki `api*` wrapper,
- migracioni parity testovi koji porede rezultat starih Apps Script funkcija i novih API-ja na istom fixture dataset-u.

## 15. Poznata ogranicenja koja ostaju vazeca

Iz `docs/14_KNOWN_LIMITATIONS.md` i `docs/23_KNOWN_ISSUES_REGISTER.md`:

- Offline rad nije podrzan.
- OCR, ERP, banka, racunovodstvo i digitalni potpis nisu podrzani.
- Server-side PDF nije implementiran.
- Emergency payment bez naloga nije implementiran.
- Napredna hijerarhija odobravanja nije implementirana.
- Post-closing korekcije zahtevaju poslovni proces.
- Dokument upload treba posebno testirati na mobilnim uredjajima.

Ogranicenja vezana iskljucivo za Apps Script/Sheets kvote i Sheets transakcionost treba zatvoriti migracijom, ali ne uvoditi nove funkcionalnosti dok parity nije potvrden.

## 16. Minimalni migracioni redosled

1. Zamrznuti postojece statuse, kolone, API ugovore i test fixture-e.
2. Napraviti SQL schema migracije za svih 15 tabela.
3. Seed-ovati role, permissions, valute i osnovne konfiguracije.
4. Implementirati auth/session API kompatibilan sa `APP_SESSIONS`.
5. Implementirati database repository layer kao zamenu za `Database.gs`.
6. Preneti poslovne servise po modulima: users, requests, orders, cash events, counts, shifts, closing, documents, reports.
7. Implementirati REST adapter koji zadrzava `apiWrap_` envelope.
8. Prebaciti frontend na Cloudflare Pages i zameniti `google.script.run` sa `fetch`.
9. Implementirati storage upload i signed URL tok.
10. Pokrenuti parity smoke testove i rucne testove iz postojece dokumentacije.
11. Tek nakon parity-a iskljuciti Apps Script write tokove.

## 17. Migracioni rizici

Najveci rizici:

- Nekonzistentan odnos starih i novih UI tokova (`desktop` i `desktop-v2`).
- Postojanje legacy/direktnih funkcija za cash outflow koje ne smeju postati redovan tok isplate.
- Razlika izmedju Google session identity i aplikativnog korisnika.
- Prenos `LockService` semantike u prave SQL transakcije.
- Saldo se mora racunati iz event-a bez uvodjenja rucnog stanja.
- Dokumenti moraju ostati povezani sa entitetima tokom migracije file ID-jeva.
- Apps Script date/time formatiranje mora biti standardizovano na `Europe/Belgrade`.
- Mock/fallback frontend podaci ne smeju u produkcioni Cloudflare build kao stvarni poslovni podaci.

## 18. Zakljucak

Postojeci aktivni sistem nije samo skeleton; to je pilot paket sa razvijenim Apps Script backendom, velikim HTML/JS frontend-om, RBAC/app-login slojem, dokumentima, smenama, zakljuccima, reportima, print prikazima i smoke testovima.

Migracija na Cloudflare Pages + Supabase PostgreSQL je izvodljiva bez funkcionalnih izmena ako se prvo sacuva API i data-model kompatibilnost, a poslovne operacije koje sada zavise od `LockService` prenesu kao PostgreSQL transakcije.
