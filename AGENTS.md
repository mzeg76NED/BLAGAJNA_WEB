# AGENTS.md

## Project name

BLAGAJNA WEB

## Purpose

Build an internal cash desk management application for company use.

The application must support daily operational work at the cash desk through a simple mobile-friendly interface and a more complete desktop web interface.

The system must be designed for Google Workspace:

1. Google Apps Script,
2. Google Sheets,
3. Google Drive,
4. HTML,
5. CSS,
6. JavaScript.

Do not use external paid services unless explicitly requested.

## Language rules

User interface: Serbian, Latin script.

Business documentation: Serbian, Latin script.

Code comments: English, except where Serbian business terminology is clearer.

## Main business principle

The system is event-based.

Cash balance must not be entered manually as a free value.

Cash balance must be calculated from business events.

Formula:

```text
opening balance
+ posted cash inflows
- posted cash outflows
+ posted transfers in
- posted transfers out
+ posted corrections
- posted reversals
= calculated cashbox balance
```

## Critical business distinction

The system must strictly distinguish between:

1. Payment Request
2. Payment Order
3. Cash Payment Event

### Payment Request

A Payment Request is a request submitted by a user asking that cash be paid to someone for a specific purpose.

It is a request only.

It does not authorize the cashier to pay.

It does not affect cashbox balance.

### Payment Order

A Payment Order is an authorized instruction issued to the cash desk.

It tells the cashier to pay a defined amount to a defined person for a defined purpose.

It authorizes payment.

It still does not affect cashbox balance until executed.

### Cash Payment Event

A Cash Payment Event is the actual payment executed by the cashier.

Only this event affects cashbox balance.

## Mandatory standard flow

```text
PAYMENT_REQUEST
→ APPROVAL
→ PAYMENT_ORDER
→ CASH_PAYMENT_EVENT
→ DOCUMENT / RECEIPT
→ CLOSING
```

## Absolute rules

1. Payment Request is not payment.
2. Payment Order is not payment.
3. Only executed Cash Payment Event changes cashbox balance.
4. A cashier must not execute payment based only on Payment Request.
5. A cashier normally executes payment only based on valid Payment Order.
6. Emergency payment without order may exist only if explicitly implemented later.
7. No business record should be physically deleted.
8. Use statuses instead of deletion.
9. Locked events cannot be edited.
10. Corrections must be made through reversal or correction events.
11. Every important action must be written to AUDIT_LOG.
12. Every uploaded document must be linked to a business entity.
13. Every cash movement must have cashbox, currency and amount.
14. Closed shifts are immutable.
15. Closed daily cash reports are immutable.

## User roles

Initial roles:

| Role | Meaning |
|---|---|
| ADMIN | System administrator |
| DIRECTOR | Director / executive overview |
| FINANCE | Finance controller |
| CASHIER_SUPERVISOR | Cash desk supervisor |
| CASHIER | Cashier |
| APPROVER | Person authorized to approve requests |
| REQUESTER | User who can submit payment requests |
| VIEWER | Read-only user |

## Core entities

The system must include these core entities:

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

## Initial sheet names

Use these exact sheet names:

```text
USERS
CASHBOXES
CURRENCIES
PAYMENT_REQUESTS
PAYMENT_ORDERS
CASH_EVENTS
DOCUMENTS
SHIFTS
DAILY_CLOSING
AUDIT_LOG
```

## Status conventions

Use uppercase snake case for statuses.

Examples:

```text
DRAFT
SUBMITTED
IN_REVIEW
APPROVED
REJECTED
CONVERTED_TO_ORDER
WAITING_PAYMENT
PARTIALLY_PAID
PAID
POSTED
LOCKED
CANCELLED
REVERSED
```

## Coding rules

Use modular Google Apps Script files.

Suggested modules:

1. `Config.gs`
2. `Database.gs`
3. `Users.gs`
4. `Cashboxes.gs`
5. `Currencies.gs`
6. `PaymentRequests.gs`
7. `PaymentOrders.gs`
8. `CashEvents.gs`
9. `Documents.gs`
10. `Shifts.gs`
11. `DailyClosing.gs`
12. `AuditLog.gs`
13. `WebApp.gs`

Every server-side business function must validate:

1. current user,
2. user role,
3. required fields,
4. entity status,
5. cashbox permission,
6. currency,
7. amount,
8. business rule constraints.

## UI principles

### Mobile UI

Mobile UI must be simple.

Priorities:

1. large buttons,
2. minimal typing,
3. quick entry,
4. camera/document upload,
5. clear status,
6. no complex tables.

Initial mobile actions:

1. Novi zahtev za isplatu
2. Nalozi za isplatu
3. Nova uplata
4. Presek blagajne
5. Primopredaja smene
6. Dnevni zaključak

### Desktop UI

Desktop UI must support:

1. dashboard,
2. tables,
3. filters,
4. approvals,
5. payment order management,
6. cashbox overview,
7. document overview,
8. daily closing,
9. audit review.

## Security rules

Regular users must not edit Google Sheets directly.

Users must interact through the Web App.

Use role-based access control.

Every important operation must be logged.

## Documentation rule

If a business rule changes, update documentation before or together with code.

Do not implement business logic that contradicts documentation.

## First development principle

Do not build the full system at once.

Work in small steps:

1. project skeleton,
2. data model,
3. database initialization,
4. user roles,
5. payment requests,
6. payment orders,
7. cash event execution,
8. documents,
9. shifts,
10. daily closing,
11. dashboard,
12. reports.

## Testing expectations

Every feature must include manual test instructions.

Minimum scenarios to support later:

1. create payment request,
2. approve payment request,
3. reject payment request,
4. create payment order from approved request,
5. create direct payment order,
6. execute payment order,
7. prevent payment without valid order,
8. prevent payment if insufficient balance,
9. upload document,
10. open shift,
11. hand over shift,
12. close day,
13. check audit log.
