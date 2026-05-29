# CODEX_TASK_14_PRODUCTION_READINESS_AND_PILOT_ROLLOUT.md

## Task name

BLAGAJNA WEB — Task 14: Production readiness cleanup and pilot rollout

## Purpose of this task

Prepare BLAGAJNA WEB for controlled pilot use.

This task is not about adding major new features.

The purpose is to make the current application safer, cleaner, easier to deploy, easier to test, and ready for a small pilot group.

The result should be a stable pilot package with:

1. reviewed configuration,
2. cleaned TODOs,
3. clear deployment steps,
4. pilot user setup,
5. pilot data setup,
6. backup/export procedure,
7. user SOP,
8. known issue list,
9. go-live checklist.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. all `CODEX_TASK_*.md` files,
4. all files in `/docs`,
5. all files in `/src`.

Do not overwrite useful existing work.

Do not add new major business modules.

Do not introduce external frameworks.

Do not use paid services.

## Critical rules to preserve

These rules must remain true:

```text
Payment Request is not payment.
Payment Order is not payment.
Only posted or locked Cash Event changes cashbox balance.
```

Additional pilot-readiness rules:

1. Test data must not be confused with real data.
2. Production users must be explicit in the `USERS` sheet.
3. Google Drive root folder must be configured or clearly created.
4. Deployment behavior must be documented.
5. Backup/export procedure must be documented.
6. Known limitations must be visible before pilot starts.
7. No function should silently act as ADMIN in production.

## Scope of this task

Implement or improve:

1. configuration review,
2. environment/deployment settings,
3. TODO and placeholder review,
4. pilot setup checklist,
5. safe test data handling,
6. backup/export helpers,
7. operational SOP for pilot users,
8. administrator checklist,
9. known issue tracker,
10. final pilot readiness report.

Do not implement:

1. OCR,
2. ERP integration,
3. accounting posting,
4. digital signature,
5. bank integration,
6. advanced BI,
7. new approval hierarchy,
8. paid services.

## Required files to update or create

Update or create:

1. `docs/18_PILOT_ROLLOUT_PLAN.md`
2. `docs/19_ADMIN_SETUP_GUIDE.md`
3. `docs/20_USER_SOP.md`
4. `docs/21_BACKUP_AND_EXPORT_PROCEDURE.md`
5. `docs/22_GO_LIVE_CHECKLIST.md`
6. `docs/23_KNOWN_ISSUES_REGISTER.md`
7. `docs/14_KNOWN_LIMITATIONS.md`
8. `README.md`
9. `src/Config.gs`
10. `src/AdminTools.gs`
11. `src/BackupExport.gs`
12. `src/SmokeTests.gs`
13. `src/TestData.gs`

If project structure differs, adapt carefully.

## Part 1 — Configuration review

Review `src/Config.gs`.

Ensure it contains clear configuration constants.

Required or recommended constants:

```javascript
const APP_NAME = 'BLAGAJNA WEB';
const APP_VERSION = '0.1.0-pilot';
const ENVIRONMENT = 'PILOT'; // DEV, PILOT, PROD
const DEBUG_MODE = false;
const DOCUMENT_ROOT_FOLDER_ID = '';
const DOCUMENT_ROOT_FOLDER_NAME = 'BLAGAJNA_WEB_DOCUMENTS';
const DATABASE_SPREADSHEET_ID = '';
```

Rules:

1. Do not hardcode private production IDs unless already configured.
2. If `DATABASE_SPREADSHEET_ID` is empty, project may use active spreadsheet if container-bound.
3. If `DOCUMENT_ROOT_FOLDER_ID` is empty, system may create/use folder by name.
4. `DEBUG_MODE` must not expose stack traces in production.
5. `ENVIRONMENT` must control dangerous helper behavior where practical.

Add clear comments.

## Part 2 — Admin tools

Create or update `src/AdminTools.gs`.

Required functions:

### 1. `getSystemStatus()`

Returns summary:

1. app name,
2. version,
3. environment,
4. active user email,
5. database connection status,
6. required sheets status,
7. document root folder status,
8. number of users,
9. number of active users,
10. number of cashboxes,
11. number of active cashboxes,
12. currencies,
13. warning list.

This function must not modify business data.

### 2. `validateSystemSetup()`

Checks:

1. all required sheets exist,
2. all required headers exist,
3. at least one ADMIN user exists,
4. at least one CASHIER user exists,
5. at least one active cashbox exists,
6. RSD currency exists and is active,
7. document root folder is available,
8. WebApp functions exist where practical,
9. audit log sheet exists.

Return:

```javascript
{
  ok: true,
  errors: [],
  warnings: []
}
```

or:

```javascript
{
  ok: false,
  errors: [...],
  warnings: [...]
}
```

### 3. `validateNoDangerousDefaults()`

Checks:

1. no active placeholder users like `admin@example.com` in pilot/prod,
2. no DEBUG_MODE in PROD,
3. no empty critical config if required,
4. no fallback admin behavior in production.

Do not delete anything.

Return warnings/errors.

### 4. `listTodoMarkers()`

Optional helper.

Search source files if possible is not easy in Apps Script.

If not feasible, document that TODO review must be manual.

Do not over-engineer.

## Part 3 — Backup and export helpers

Create `src/BackupExport.gs`.

Required functions:

### 1. `createDatabaseBackupCopy()`

Creates a copy of the database spreadsheet.

Rules:

1. Current user must be ADMIN or FINANCE.
2. Copy name should include timestamp.
3. Store in same Drive folder as spreadsheet or configured backup folder if available.
4. Return backup file ID and URL.
5. Write audit log with action `BACKUP` if audit actions support it. If not, add safely.

### 2. `exportSheetAsCsv(sheetName)`

Exports one sheet as CSV string.

Rules:

1. Current user must be ADMIN or FINANCE.
2. Sheet must exist.
3. Return CSV text.
4. Do not modify data.

### 3. `exportAllCoreSheetsAsCsv()`

Returns object with CSV content for core sheets.

Core sheets:

1. USERS
2. CASHBOXES
3. CURRENCIES
4. PAYMENT_REQUESTS
5. PAYMENT_ORDERS
6. CASH_EVENTS
7. DOCUMENTS
8. SHIFTS
9. DAILY_CLOSING
10. AUDIT_LOG

If returning large data is risky, document limitation and implement per-sheet export only.

### 4. `createBackupFolderIfMissing_()`

Private helper if needed.

Folder name:

```text
BLAGAJNA_WEB_BACKUPS
```

## Part 4 — Test data safety

Review `src/TestData.gs`.

Ensure:

1. test data creation is clearly marked,
2. test users have obvious names/emails,
3. test cashboxes are clearly marked,
4. clearTestData does not delete real data,
5. production environment blocks dangerous reset functions.

If `clearTestData()` exists, it must:

1. refuse to run in PROD,
2. delete only records explicitly marked as test,
3. ask for hardcoded confirmation parameter, for example:
   `clearTestData('CONFIRM_DELETE_TEST_DATA')`.

If this is not safely implemented, leave it as a throwing placeholder.

## Part 5 — Smoke tests

Review and improve `src/SmokeTests.gs`.

Required smoke test functions:

1. `smokeTestDatabaseInitialization()`
2. `smokeTestSystemSetupValidation()`
3. `smokeTestPaymentRequestFlow()`
4. `smokeTestPaymentOrderFlow()`
5. `smokeTestCashPaymentFlow()`
6. `smokeTestDocumentWorkflow()`
7. `smokeTestShiftWorkflow()`
8. `smokeTestDailyClosingWorkflow()`
9. `smokeTestReportsReadOnly()`
10. `runAllSmokeTests()`

Rules:

1. Smoke tests must not require production data.
2. Smoke tests should use test data.
3. Smoke tests must clearly report pass/fail.
4. If a test cannot run because of user identity limitations, return SKIPPED with explanation.
5. Do not silently pass failed tests.

Return format:

```javascript
{
  ok: true,
  tests: [
    { name: '...', status: 'PASS', message: '...' }
  ]
}
```

or include FAIL/SKIPPED statuses.

## Part 6 — Pilot rollout documentation

Create `docs/18_PILOT_ROLLOUT_PLAN.md`.

Include:

1. pilot objective,
2. pilot scope,
3. pilot duration,
4. pilot users,
5. pilot cashboxes,
6. pilot currencies,
7. what is included,
8. what is excluded,
9. pilot success criteria,
10. daily review process,
11. issue reporting process,
12. rollback plan.

Recommended pilot scope:

```text
1 cashbox
2 currencies maximum: RSD and EUR
3 to 5 users
5 to 10 working days
manual parallel check against old process
```

Include this exact statement:

```text
Pilot nije puna produkcija. Pilot služi da proveri tokove, prava pristupa, dokumenta, izveštaje i ponašanje korisnika pre šire upotrebe.
```

## Part 7 — Admin setup guide

Create `docs/19_ADMIN_SETUP_GUIDE.md`.

Include step-by-step setup:

1. create Google Sheet database,
2. connect Apps Script,
3. run `initializeDatabase()`,
4. configure `Config.gs`,
5. create or verify Drive document folder,
6. add real users,
7. assign roles,
8. add cashboxes,
9. add currencies,
10. run validation,
11. deploy Web App,
12. test mobile URL,
13. test desktop URL,
14. run smoke tests,
15. backup before pilot,
16. start pilot.

Include exact command/function list where applicable.

## Part 8 — User SOP

Create `docs/20_USER_SOP.md`.

This is operational user instruction in Serbian Latin script.

It must be practical, not technical.

Include sections:

1. osnovno pravilo sistema,
2. kako se podnosi zahtev za isplatu,
3. kako se odobrava zahtev,
4. kako se pravi nalog za isplatu,
5. kako blagajnik izvršava nalog,
6. kako se dodaje dokument,
7. kako se otvara smena,
8. kako se predaje/zatvara smena,
9. kako se radi dnevni zaključak,
10. šta raditi kad postoji razlika,
11. šta raditi kad je greška,
12. šta korisnik ne sme da radi.

Include this exact statement:

```text
Zahtev nije isplata. Nalog nije isplata. Isplata nastaje tek kada blagajnik izvrši nalog i sistem napravi blagajnički događaj.
```

## Part 9 — Backup and export procedure

Create `docs/21_BACKUP_AND_EXPORT_PROCEDURE.md`.

Include:

1. why backup is needed,
2. when backup is required,
3. backup before pilot,
4. daily backup during pilot,
5. backup before code changes,
6. how to create spreadsheet copy,
7. how to export CSV,
8. how to verify backup,
9. where backup should be stored,
10. who is responsible.

Include this exact statement:

```text
Pre svake veće izmene aplikacije ili strukture baze mora postojati sveža kopija Google Sheet baze.
```

## Part 10 — Go-live checklist

Create `docs/22_GO_LIVE_CHECKLIST.md`.

Checklist sections:

1. system setup,
2. users and roles,
3. cashboxes and currencies,
4. documents,
5. permissions,
6. workflows,
7. reports,
8. backup,
9. training,
10. known limitations,
11. approval to start pilot.

Use checkbox markdown.

Example:

```markdown
- [ ] Google Sheet baza je kreirana
- [ ] initializeDatabase() je izvršen
```

## Part 11 — Known issues register

Create `docs/23_KNOWN_ISSUES_REGISTER.md`.

Use table:

| ID | Date | Area | Issue | Severity | Status | Owner | Note |
|---|---|---|---|---|---|---|---|

Pre-fill with likely issues:

1. user identity behavior must be confirmed after deployment,
2. Drive upload must be tested on mobile,
3. concurrent writes must be tested,
4. Apps Script quotas must be monitored,
5. PDF generation if not implemented,
6. correction after daily closing requires management process.

## Part 12 — Update known limitations

Update `docs/14_KNOWN_LIMITATIONS.md`.

Ensure it includes:

1. Google Apps Script quotas,
2. Google Sheets is not full transactional DB,
3. concurrency limitations,
4. user identity depends on deployment,
5. offline not supported,
6. OCR not supported,
7. ERP integration not supported,
8. accounting posting not supported,
9. advanced correction after closing needs process,
10. PDF generation may rely on browser Save as PDF,
11. no digital signature,
12. backup must be operationally enforced.

## Part 13 — Update README.md

Add:

1. project status,
2. current modules,
3. how to set up pilot,
4. how to validate system,
5. how to run smoke tests,
6. how to back up,
7. known limitations,
8. next recommended tasks.

## Required tests: update docs/10_TEST_CASES.md

Add pilot readiness tests.

### Test 1: System setup validation

Expected:

1. `validateSystemSetup()` returns ok or clear error list,
2. no silent failures.

### Test 2: Dangerous defaults validation

Expected:

1. `validateNoDangerousDefaults()` detects placeholder users in PILOT/PROD,
2. DEBUG_MODE warning appears if unsafe.

### Test 3: Backup copy

Expected:

1. authorized user creates backup copy,
2. backup file exists in Drive,
3. function returns file URL.

### Test 4: CSV export

Expected:

1. authorized user exports one sheet,
2. CSV contains header row,
3. data is not modified.

### Test 5: Unauthorized backup

Expected:

1. unauthorized user attempts backup,
2. server rejects action.

### Test 6: Run all smoke tests

Expected:

1. `runAllSmokeTests()` returns PASS/FAIL/SKIPPED results,
2. failures include message,
3. no false PASS.

### Test 7: Pilot checklist review

Expected:

1. admin can follow `docs/22_GO_LIVE_CHECKLIST.md`,
2. missing items are visible before pilot.

## Do not do these things in this task

1. Do not add major business workflows.
2. Do not remove existing business rules.
3. Do not delete production data.
4. Do not silently create admin fallback in production.
5. Do not use paid services.
6. Do not introduce frameworks.
7. Do not integrate ERP.
8. Do not implement OCR.
9. Do not implement accounting posting.
10. Do not ignore known limitations.

## Expected response after completion

After completing this task, report:

1. files created,
2. files updated,
3. admin tools implemented,
4. backup/export helpers implemented,
5. smoke tests updated,
6. pilot docs created,
7. known limitations updated,
8. recommended next task.

## Recommended next task after this

Next task should be:

```text
Task 15 — Pilot feedback fixes and production stabilization
```

Task 15 should be done only after the app is tested in a real pilot.

It should be based on actual defects, user feedback, performance issues and missing operational details discovered during pilot.
