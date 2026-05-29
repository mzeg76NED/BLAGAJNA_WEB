# CODEX_TASK_10_HARDENING_PERMISSIONS_AND_E2E_TESTING.md

## Task name

BLAGAJNA WEB — Task 10: Hardening, permissions and end-to-end testing

## Purpose of this task

Stabilize the BLAGAJNA WEB project before wider testing.

This task must verify and harden:

1. user roles,
2. permissions,
3. server-side validation,
4. consistent API responses,
5. end-to-end business flow,
6. audit logging,
7. test data tools,
8. deployment readiness,
9. known limitations.

Do not add large new business features in this task.

Do not rewrite the full application.

Do not introduce external frameworks.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `CODEX_START_PROMPT.md`
4. all `CODEX_TASK_*.md` files
5. all files in `/docs`
6. all files in `/src`

Do not overwrite useful existing work.

If a function already exists, improve it.

If several modules implement duplicate logic, consolidate carefully without breaking existing behavior.

## Critical business rules to preserve

These rules must remain true after this task:

```text
Payment Request is not payment.
Payment Order is not payment.
Only posted or locked Cash Event changes cashbox balance.
```

Additional absolute rules:

1. Users must not bypass server-side validation.
2. Frontend must not decide authorization.
3. No important business record should be physically deleted.
4. Audit log must record important state changes.
5. Locked records must not be silently edited.
6. Cashbox balance must be calculated from cash events.
7. Daily closing must not invent balance.
8. Documents must be stored in Drive, while metadata is stored in `DOCUMENTS`.

## Scope of this task

Implement or improve:

1. role matrix documentation,
2. permission checks in server functions,
3. API wrapper consistency,
4. error handling consistency,
5. end-to-end test scenarios,
6. smoke test functions,
7. test data setup/reset helpers,
8. deployment checklist,
9. known limitations document.

Do not implement:

1. OCR,
2. ERP integration,
3. accounting posting,
4. advanced dashboard,
5. PDF reports,
6. bank integration,
7. digital signature,
8. paid services.

## Required files to update or create

Update or create:

1. `docs/11_PERMISSIONS_MATRIX.md`
2. `docs/12_E2E_TEST_PLAN.md`
3. `docs/13_DEPLOYMENT_CHECKLIST.md`
4. `docs/14_KNOWN_LIMITATIONS.md`
5. `docs/10_TEST_CASES.md`
6. `src/Users.gs`
7. `src/Validation.gs`
8. `src/WebApp.gs`
9. `src/TestData.gs`
10. `src/SmokeTests.gs`
11. `README.md`

If project structure differs, adapt carefully.

## Part 1 — Permissions matrix

Create `docs/11_PERMISSIONS_MATRIX.md`.

It must define what each role can do.

Use these roles:

```text
ADMIN
DIRECTOR
FINANCE
CASHIER_SUPERVISOR
CASHIER
APPROVER
REQUESTER
VIEWER
```

### Required permission matrix

Document permissions for these actions:

| Action | ADMIN | DIRECTOR | FINANCE | CASHIER_SUPERVISOR | CASHIER | APPROVER | REQUESTER | VIEWER |
|---|---|---|---|---|---|---|---|---|
| View dashboard | yes | yes | yes | yes | yes | yes | limited | yes |
| Create payment request | yes | yes | yes | yes | yes | yes | yes | no |
| Submit own payment request | yes | yes | yes | yes | yes | yes | yes | no |
| Approve payment request | yes | yes | yes | yes | no | yes | no | no |
| Reject payment request | yes | yes | yes | yes | no | yes | no | no |
| Create order from request | yes | yes | yes | yes | no | yes | no | no |
| Create direct payment order | yes | yes | yes | yes | no | no | no | no |
| Issue payment order | yes | yes | yes | yes | no | yes | no | no |
| Reject order as cashier | yes | no | no | yes | yes | no | no | no |
| Execute payment order | yes | no | no | yes | yes | no | no | no |
| Create cash inflow | yes | no | yes | yes | yes | no | no | no |
| Attach document | yes | yes | yes | yes | yes | yes | yes | no |
| Cancel document | yes | yes | yes | yes | no | no | no | no |
| Open shift | yes | no | no | yes | yes | no | no | no |
| Handover shift | yes | no | yes | yes | yes-own | no | no | no |
| Close shift | yes | no | yes | yes | yes-own | no | no | no |
| Daily closing | yes | yes | yes | yes | no | no | no | no |
| View audit log | yes | yes | yes | yes | no | no | no | no |
| Initialize database | yes | no | no | no | no | no | no | no |

Add notes:

1. `yes-own` means user can act only on their own record or own shift.
2. `limited` means user can view only their own requests.
3. Server-side checks are authoritative.

Include this exact statement:

```text
Prava pristupa se ne oslanjaju na frontend. Frontend može da sakrije dugme, ali server mora ponovo da proveri pravo korisnika za svaku akciju.
```

## Part 2 — Harden user and permission helpers

Update `src/Users.gs`.

Required functions:

### 1. `getCurrentUserEmail()`

Rules:

1. Use `Session.getActiveUser().getEmail()` where available.
2. If unavailable, return clear fallback only in development mode.
3. Do not silently return admin user in production mode.

### 2. `getCurrentUser()`

Rules:

1. Lookup user in `USERS` sheet by email.
2. Return user record.
3. If user is not found, throw clear error unless development mode allows fallback.
4. If user is inactive, throw clear error.

### 3. `getCurrentUserRole()`

Rules:

1. Use `getCurrentUser()`.
2. Return role.

### 4. `assertCurrentUserActive()`

Rules:

1. Throws if user missing or inactive.
2. Returns current user if valid.

### 5. `assertUserHasRole(allowedRoles)`

Rules:

1. Uses current user.
2. Throws clear error if role is not allowed.
3. Returns current user if authorized.

### 6. `assertUserCanActOnOwnOrRole(ownerFieldValue, elevatedRoles)`

Rules:

1. Allows if current user email or user_id matches ownerFieldValue.
2. Allows if current role is in elevatedRoles.
3. Throws otherwise.

### 7. `getUserByEmail(email)`

Rules:

1. Reads `USERS`.
2. Returns user or null.

### 8. `assertUserExistsAndActive(email)`

Rules:

1. Used for shift handover and assignment.
2. Throws if missing or inactive.

## Part 3 — Harden validation helpers

Update `src/Validation.gs`.

Required functions:

1. `assertRequiredFields(data, requiredFields)`
2. `assertPositiveAmount(amount, fieldName)`
3. `assertNonNegativeAmount(amount, fieldName)`
4. `assertAllowedValue(value, allowedValues, fieldName)`
5. `assertNonEmptyString(value, fieldName)`
6. `assertActiveCurrency(currency)`
7. `assertActiveCashbox(cashboxId)`
8. `assertEntityStatus(record, allowedStatuses, entityName)`
9. `assertSufficientBalance(balance, amount, cashboxId, currency)`
10. `assertValidDate(value, fieldName)`
11. `assertValidFilePayload(filePayload)`

Rules:

1. Error messages must be clear.
2. Do not return false silently.
3. Throw errors for invalid business data.
4. Keep functions Google Apps Script compatible.

## Part 4 — API wrapper consistency

Update `src/WebApp.gs`.

All frontend-facing functions must return:

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
    message: "..."
  }
}
```

Create helpers:

```javascript
function apiSuccess_(data) {}
function apiError_(error) {}
function apiWrap_(fn) {}
```

Use wrappers consistently.

Do not expose raw stack trace in normal mode.

If `DEBUG_MODE` exists and is true, include optional debug details.

## Part 5 — Test data tools

Create `src/TestData.gs`.

Purpose:

Allow safe creation of test data for development.

Required functions:

### 1. `createTestUsers()`

Creates or updates basic users.

Suggested test users:

1. admin@example.com — ADMIN
2. director@example.com — DIRECTOR
3. finance@example.com — FINANCE
4. supervisor@example.com — CASHIER_SUPERVISOR
5. cashier@example.com — CASHIER
6. approver@example.com — APPROVER
7. requester@example.com — REQUESTER
8. viewer@example.com — VIEWER

Important:

If using real Google Workspace emails is required, document that these placeholder emails must be replaced.

### 2. `createTestCashboxes()`

Creates:

1. `CB_MAIN` — Glavna blagajna
2. `CB_EUR` — Devizna blagajna

### 3. `createTestCurrencies()`

Creates:

1. RSD
2. EUR

### 4. `createMinimalTestSetup()`

Runs:

1. initializeDatabase,
2. createTestCurrencies,
3. createTestCashboxes,
4. createTestUsers.

### 5. `clearTestData()`

Safe placeholder only unless implemented very carefully.

Do not delete production-like data.

If implemented, delete only records clearly marked as test data.

Otherwise throw:

```text
clearTestData is not implemented for safety. Use a separate test spreadsheet.
```

## Part 6 — Smoke test functions

Create `src/SmokeTests.gs`.

Purpose:

Provide basic developer functions that can be run manually from Apps Script editor.

Required functions:

### 1. `smokeTestDatabaseInitialization()`

Expected:

1. runs `initializeDatabase()`,
2. verifies all required sheets exist,
3. verifies headers exist,
4. returns summary object.

### 2. `smokeTestPaymentRequestFlow()`

Expected:

1. creates request,
2. submits request,
3. approves request,
4. verifies no cash event was created,
5. returns summary object.

### 3. `smokeTestPaymentOrderFlow()`

Expected:

1. creates approved request or uses helper,
2. creates order from request,
3. issues order,
4. verifies no cash event was created,
5. returns summary object.

### 4. `smokeTestCashPaymentFlow()`

Expected:

1. creates inflow,
2. creates/uses issued order,
3. executes payment,
4. verifies CASH_OUTFLOW exists,
5. verifies balance changed,
6. returns summary object.

### 5. `smokeTestDailyClosingPreview()`

Expected:

1. prepares daily closing,
2. verifies no closing row created,
3. returns summary object.

### Important limitation

If current user cannot impersonate multiple roles because Google Apps Script runs as active user, document the limitation.

Do not fake production permissions silently.

## Part 7 — End-to-end test plan

Create `docs/12_E2E_TEST_PLAN.md`.

It must include a complete manual test scenario:

```text
Requester creates Payment Request
→ Approver approves request
→ Finance/Supervisor creates Payment Order
→ Authorized user issues Payment Order
→ Cashier creates cash inflow for test balance
→ Cashier executes Payment Order
→ Cash Event is created
→ Document is attached
→ Cashier opens shift
→ Cashier closes shift
→ Supervisor performs daily closing
→ Events are locked
→ Audit log is reviewed
```

For every step define:

1. actor,
2. screen/function,
3. input,
4. expected result,
5. expected table changes,
6. expected audit log entry.

## Part 8 — Deployment checklist

Create `docs/13_DEPLOYMENT_CHECKLIST.md`.

Must include:

1. Apps Script project created,
2. Google Sheet database connected,
3. `initializeDatabase()` run,
4. root Drive folder configured,
5. real users added to `USERS`,
6. test users removed or disabled,
7. deployment mode selected,
8. access permissions checked,
9. Web App URL tested,
10. mobile UI tested,
11. desktop UI tested,
12. audit log checked,
13. backup/export plan defined,
14. known limitations reviewed.

Include Apps Script deployment note:

```text
Deployment mode and user identity behavior must be tested in the actual Google Workspace environment, because Session.getActiveUser().getEmail() behavior can depend on deployment settings and domain context.
```

## Part 9 — Known limitations

Create `docs/14_KNOWN_LIMITATIONS.md`.

Include at least:

1. Google Apps Script quotas may limit heavy usage.
2. Google Sheets is not a full transactional database.
3. Concurrent writes must be handled carefully.
4. User identity depends on deployment settings.
5. Offline mode is not implemented.
6. OCR is not implemented.
7. ERP integration is not implemented.
8. Accounting posting is not implemented.
9. Reversal/correction workflow may need a dedicated later task.
10. PDF report generation is not implemented unless already built.
11. Document digital signature is not implemented.
12. Advanced reporting/dashboard is not implemented.

## Part 10 — Update `README.md`

Add section:

```text
Current project status
```

Must summarize completed modules:

1. data model,
2. payment requests,
3. payment orders,
4. cash execution,
5. documents,
6. shifts,
7. daily closing,
8. basic UI,
9. hardening/testing.

Add section:

```text
How to test
```

Include:

1. run initializeDatabase,
2. run createMinimalTestSetup,
3. deploy Web App,
4. run smoke tests,
5. execute manual E2E test.

## Required tests: update `docs/10_TEST_CASES.md`

Add section:

```text
Hardening and permission tests
```

Minimum tests:

### Test 1: Unauthorized user cannot approve request

Expected:

1. REQUESTER tries to approve request,
2. server rejects action,
3. status remains unchanged,
4. audit log does not record false approval.

### Test 2: Cashier cannot create direct order

Expected:

1. CASHIER tries direct order,
2. server rejects action.

### Test 3: Cashier can execute waiting order

Expected:

1. order is WAITING_PAYMENT,
2. cashier executes,
3. CASH_OUTFLOW created.

### Test 4: Viewer cannot modify data

Expected:

1. VIEWER tries to create request or order,
2. server rejects action.

### Test 5: Frontend hidden button is not enough

Expected:

1. direct API call without permission fails server-side.

### Test 6: Inactive user is blocked

Expected:

1. user active = FALSE,
2. any business action is rejected.

### Test 7: API response format is consistent

Expected:

1. success responses use `{ ok: true, data }`,
2. error responses use `{ ok: false, error: { message } }`.

### Test 8: Audit log is append-only

Expected:

1. business actions append audit rows,
2. old audit rows are not modified by normal business functions.

## Do not do these things in this task

1. Do not build new major business modules.
2. Do not change the core event model.
3. Do not add paid services.
4. Do not add external frameworks.
5. Do not implement ERP integration.
6. Do not implement OCR.
7. Do not implement accounting posting.
8. Do not weaken server-side validation.
9. Do not hardcode real production user emails without instruction.
10. Do not delete production data.

## Expected response after completion

After completing this task, report:

1. files created,
2. files updated,
3. permission rules implemented,
4. validation improvements,
5. API consistency improvements,
6. smoke tests added,
7. deployment checklist location,
8. known limitations,
9. next recommended task.

## Recommended next task after this

Next task should be:

```text
Task 11 — Correction and reversal workflow
```

Task 11 should implement:

1. reversal of posted cash events,
2. correction events,
3. handling mistakes after payment,
4. handling mistakes after daily closing,
5. audit trail for corrections,
6. preventing direct edits of locked business records.
