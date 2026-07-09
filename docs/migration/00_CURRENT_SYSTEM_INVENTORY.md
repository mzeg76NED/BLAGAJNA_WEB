# FAZA 0 - Current System Inventory

Datum: 2026-07-09  
Repo: `C:\Users\milan\source\repos\BLAGAJNA_WEB`  
Status: IN PROGRESS  
Izvor: staticka analiza koda i dokumentacije. Runtime podaci iz Google Sheets nisu citani.

## 1. Opsti zakljucak

Postojeci BLAGAJNA_WEB je pilot Apps Script sistem, ne samo skeleton. Ima:

- Apps Script backend u `src/*.gs`,
- veliki HTML/CSS/JS frontend u `src/html`,
- Google Sheets data layer,
- Google Drive dokumente,
- interni app login preko `user_code` + PIN,
- role/privilege model,
- audit log,
- smene, preseke, dnevni zakljucak, naloge, zahteve, cash events, izvestaje i print prikaze.

Ovaj dokument je FAZA 0 inventar. Ne uvodi novu funkcionalnost.

## 2. Frontend inventar

HTML ulazne tacke:

| Fajl | Uloga | Apps Script zavisnost |
|---|---|---|
| `src/html/index.html` | pocetni izbor prikaza | `include(...)` |
| `src/html/mobile.html` | mobilni UI | `include(...)`, `ScriptApp.getService().getUrl()` |
| `src/html/desktop.html` | glavni desktop UI | `include(...)`, `ScriptApp.getService().getUrl()` |
| `src/html/desktop-v2.html` | moderniji desktop UI | `include(...)`, `ScriptApp.getService().getUrl()` |
| `src/html/print-payment-request.html` | print zahteva | Apps Script template data |
| `src/html/print-payment-order.html` | print naloga | Apps Script template data |
| `src/html/print-cash-event.html` | print cash event-a | Apps Script template data |
| `src/html/print-shift-handover.html` | print primopredaje | Apps Script template data |
| `src/html/print-daily-closing.html` | print dnevnog zakljucka | Apps Script template data |
| `src/html/print-report.html` | print izvestaja | Apps Script template data |
| `src/html/styles.html` | glavni CSS | Apps Script include |
| `src/html/styles-v2.html` | v2 CSS | Apps Script include |
| `src/html/print-styles.html` | print CSS | Apps Script include |
| `src/html/scripts.html` | glavni JS, oko 419 KB | `google.script.run` |
| `src/html/scripts-v2.html` | v2 JS | `google.script.run` |

Web rute iz `WebApp.gs`:

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

Glavni ekrani identifikovani iz UI i poziva:

| Ekran | Ulaz | Backend pozivi | Menja podatke |
|---|---|---|---|
| App login | desktop shell | `apiLoginAppUser`, `apiGetCurrentAppSession`, `apiLogoutAppUser`, `apiSwitchAppUser` | da, sesije |
| Mobilni home | `mobile.html` | bootstrap i operativni API pozivi | da |
| Desktop dashboard | `desktop.html` | `apiGetUiBootstrap`, report API | ne uglavnom |
| Blagajnicka knjiga | desktop/v2 | `apiGetCashMovementsReport`, `apiCreateCashInflow`, `apiCreateTreasuryHandover`, `apiReverseCashEvent` | da |
| Nalozi za isplatu | desktop/v2 | `apiListPaymentOrders`, `apiListOrdersWaitingForPayment`, `apiIssuePaymentOrder`, `apiSendPaymentOrderToCashier`, `apiExecutePendingPaymentOrderOutflow` | da |
| Zahtevi za isplatu | desktop/v2 | `apiListPaymentRequests`, `apiCreatePaymentRequest`, `apiSubmitPaymentRequest`, `apiApproveAndIssuePaymentOrder`, `apiRejectPaymentRequest` | da |
| Smene | desktop/v2/mobile | `apiOpenShift*`, `apiHandoverShift`, `apiCloseShift*`, `apiGetActiveShiftState` | da |
| Presek stanja | desktop/mobile | `apiPrepareCashCount`, `apiCreateCashCounts`, `apiGetCashCountsReport` | da |
| Dnevni zakljucak | desktop/mobile | `apiPrepareDailyClosing`, `apiCloseDailyCashbox`, `apiListDailyClosings` | da |
| Korisnici i prava | desktop | `apiListUsers`, `apiCreateUser`, `apiUpdateUserPermissions`, `apiResetUserPin`, `apiUpdateRolePermissions` | da |
| Audit log | desktop/v2 | `apiGetAuditLog` | ne |
| Print prikazi | print rute | `PrintViews.gs` helpers | ne |

Globalne frontend zavisnosti:

- `window.google.script.run`
- `window.BLAGAJNA_WEB_APP_URL`
- `window.BLAGAJNA_WEB_CONFIG`
- `sessionStorage` kljuc `BLAGAJNA_APP_SESSION_ID`
- centralni `callApi(...)`
- v2 centralni `v2CallApi(...)`

## 3. Backend inventar

Apps Script fajlovi:

| Fajl | Svrha |
|---|---|
| `00_Config.gs` | konfiguracija, sheet nazivi, statusi, enum-i, headeri |
| `AdminTools.gs` | status sistema, readiness, validacija setup-a |
| `AppLogin.gs` | PIN login, app sesije, session gating |
| `AuditLog.gs` | centralni audit zapis |
| `BackupExport.gs` | Drive backup i CSV export |
| `Cashboxes.gs` | blagajne i pristup blagajni |
| `CashCounts.gs` | preseci, apoeni, korektivni event |
| `CashEvents.gs` | uplate, isplate, trezor, saldo, storno |
| `Code.gs` | spreadsheet menu |
| `Currencies.gs` | valute i apoeni |
| `DailyClosing.gs` | priprema i zatvaranje dana |
| `Database.gs` | Google Sheets CRUD layer |
| `Documents.gs` | Drive upload i document metadata |
| `PaymentOrders.gs` | nalozi i pending isplata |
| `PaymentRequests.gs` | zahtevi i approval path |
| `PrintViews.gs` | podaci za print prikaze |
| `Reports.gs` | dashboard i operativni izvestaji |
| `Shifts.gs` | smene, primopredaja, zatvaranje |
| `SmokeTests.gs` | smoke testovi |
| `TestData.gs` | test setup |
| `Users.gs` | korisnici, role, privilegije |
| `Validation.gs` | zajednicke validacije |
| `WebApp.gs` | web rute i javni API wrapper-i |

Javni API wrapper-i su popisani u `01_GOOGLE_SCRIPT_RUN_MAP.md`.

## 4. Platform-specific zavisnosti

| Apps Script servis | Koriscenje | Migraciona zamena |
|---|---|---|
| `SpreadsheetApp` | CRUD nad Sheets bazom | Supabase PostgreSQL |
| `DriveApp` | upload, folderi, backup | Google Drive servis adapter ili Supabase Storage kasnije |
| `HtmlService` | HTML template i include | Cloudflare Pages static build |
| `ContentService` | manifest i service worker response | static files ili Pages Function |
| `Session` | Google email, timezone | auth context i env timezone |
| `Utilities` | UUID, hash, base64, date format | Web Crypto / Node crypto / JS helpers |
| `LockService` | kriticne transakcije | PostgreSQL transakcije |
| `PropertiesService` | bootstrap/admin property | secrets/env vars |
| `CacheService` | permission matrix cache | cache layer ili DB backed cache |
| `ScriptApp` | service URL u template-u | env var / runtime config |

## 5. Najkriticniji backend tokovi

Kriticne funkcije sa promenom vise entiteta:

- `executePendingPaymentOrderOutflow`
- `sendPaymentOrderToCashier`
- `createPaymentOrderFromRequest`
- `createCashInflow`
- `createDirectCashOutflow`
- `createTreasuryHandover`
- `reverseCashEvent`
- `createCashCount`, `createCashCounts`
- `openShift`, `openShiftWithOpeningCount`
- `handoverShift`, `closeShift`, `closeShiftWithClosingCount`
- `closeDailyCashbox`
- `createUser`, `updateUserPermissions`, `resetUserPin`

Ove funkcije moraju biti prioritet za PostgreSQL transakcije u kasnijim fazama.

## 6. Nije poznato iz staticke analize

Sledece zahteva pristup realnom Apps Script/Sheets runtime-u:

- broj redova po sheet-u,
- realni ID Google Sheet baze,
- realni Drive folderi,
- stvarne produkcione vrednosti `DATABASE_SPREADSHEET_ID`, `DOCUMENT_ROOT_FOLDER_ID`, `BACKUP_ROOT_FOLDER_ID`,
- stanje readiness helpera,
- runtime performanse,
- stvarni set korisnika i aktivnih sesija.

