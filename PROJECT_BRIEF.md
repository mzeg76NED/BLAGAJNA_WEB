# PROJECT_BRIEF.md

# BLAGAJNA WEB

## 1. Project summary

BLAGAJNA WEB is an internal web application for complete operational cash desk management.

The application must work on:

1. desktop web browser,
2. mobile phone browser.

The system is intended for internal company use.

It must replace informal cash desk work through paper, Excel files, phone messages and verbal instructions.

## 2. Main goal

The main goal is to create a controlled, auditable and document-supported cash desk system.

The system must allow management and finance to know:

1. who requested payment,
2. who approved payment,
3. who ordered payment,
4. who executed payment,
5. who received money,
6. for what purpose money was paid,
7. from which cashbox money was paid,
8. in which currency,
9. with which document,
10. what is the current cashbox balance.

## 3. Platform

Preferred implementation:

1. Google Apps Script backend,
2. Google Sheets as structured database,
3. Google Drive for documents,
4. HTML/CSS/JavaScript frontend,
5. Google Apps Script Web App deployment.

## 4. Main entities

The system must contain these main entities:

### User

A person using the system.

Examples:

1. cashier,
2. requester,
3. approver,
4. finance controller,
5. director,
6. administrator.

### Cashbox

A place or logical unit where cash is held.

Examples:

1. Glavna blagajna,
2. Devizna blagajna,
3. Maloprodajna blagajna,
4. Terenska blagajna.

### Currency

Currency in which money is tracked.

Initial currencies:

1. RSD,
2. EUR.

### Payment Request

A request submitted by a user asking that money be paid.

This is not authorization for payment.

This does not change cashbox balance.

### Payment Order

An authorized instruction to the cashier to pay money.

This authorizes payment.

This still does not change cashbox balance until the cashier executes it.

### Cash Event

A real cash movement.

Examples:

1. cash inflow,
2. cash outflow,
3. transfer in,
4. transfer out,
5. correction,
6. reversal.

Only posted cash events affect cashbox balance.

### Document

A file attached to a business entity.

Examples:

1. receipt,
2. invoice,
3. signed payment confirmation,
4. photo,
5. PDF,
6. internal note.

### Shift

A cashier working period.

Used for opening, handover and closing of cash responsibility.

### Daily Closing

Daily cash desk closing by cashbox and currency.

### Audit Log

A mandatory log of important actions.

## 5. Critical payment process

The most important business process is payment from cashbox.

Normal process:

```text
User submits Payment Request
→ Authorized person reviews request
→ Authorized person creates Payment Order
→ Cashier executes Payment Order
→ System creates Cash Payment Event
→ Recipient confirmation/document is attached
→ Cashbox balance is updated
```

## 6. Payment Request

Payment Request answers:

1. who requests money,
2. who should receive money,
3. how much money is requested,
4. in which currency,
5. for what purpose,
6. when money is needed,
7. whether there is supporting documentation.

Payment Request statuses:

```text
DRAFT
SUBMITTED
IN_REVIEW
APPROVED
REJECTED
CONVERTED_TO_ORDER
CANCELLED
```

Rules:

1. Request can be created by non-cashier user.
2. Request does not affect balance.
3. Request does not authorize payment.
4. Rejected request must have rejection reason.
5. Approved request can be converted to Payment Order.
6. Converted request must reference created Payment Order.

## 7. Payment Order

Payment Order answers:

1. who issued the order,
2. who approved payment,
3. who should be paid,
4. how much should be paid,
5. in which currency,
6. from which cashbox,
7. for what purpose,
8. whether it came from Payment Request,
9. whether it was executed.

Payment Order statuses:

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

Rules:

1. Payment Order authorizes payment.
2. Payment Order does not affect balance.
3. Payment Order must define amount, currency, cashbox and recipient.
4. Cashier can execute only valid Payment Order.
5. Paid amount cannot exceed ordered amount.
6. Cancelled order cannot be paid.
7. Paid order cannot be cancelled directly.

## 8. Cash Payment Event

Cash Payment Event is the actual payment made by cashier.

It answers:

1. who paid,
2. when payment was made,
3. from which cashbox,
4. in which currency,
5. how much was paid,
6. to whom it was paid,
7. based on which Payment Order,
8. which document confirms the payment.

Rules:

1. Cash Payment Event affects cashbox balance.
2. Cash Payment Event must normally reference Payment Order.
3. Payment amount cannot exceed remaining ordered amount.
4. Currency must match Payment Order.
5. Cashbox must match Payment Order.
6. System must prevent negative cashbox balance unless special override exists.
7. Executed payment must be written to audit log.

## 9. Mobile interface

Mobile interface must be simple.

Main screens:

1. Home
2. New Payment Request
3. My Payment Requests
4. Payment Orders Waiting for Payment
5. Execute Payment Order
6. New Cash Inflow
7. Cashbox Balance
8. Shift Handover
9. Daily Closing

Mobile home buttons in Serbian:

```text
NOVI ZAHTEV ZA ISPLATU
NALOZI ZA ISPLATU
NOVA UPLATA
PRESEK BLAGAJNE
PRIMOPREDAJA SMENE
DNEVNI ZAKLJUČAK
```

## 10. Desktop interface

Desktop interface must support:

1. dashboard,
2. list of payment requests,
3. approval queue,
4. list of payment orders,
5. cash events table,
6. documents table,
7. cashbox balance overview,
8. shift management,
9. daily closing,
10. audit log.

## 11. Balance rule

Cashbox balance must be calculated.

It must not be manually entered.

Balance is calculated from posted cash events.

Payment Request does not affect balance.

Payment Order does not affect balance.

Only Cash Event with posted/locked status affects balance.

## 12. Document rule

Documents are stored in Google Drive.

The database stores only metadata and link.

Every document must be linked to one of:

1. Payment Request,
2. Payment Order,
3. Cash Event,
4. Shift,
5. Daily Closing.

## 13. Audit rule

Every important action must be recorded in AUDIT_LOG.

Examples:

1. create request,
2. submit request,
3. approve request,
4. reject request,
5. create order,
6. issue order,
7. execute payment,
8. cancel order,
9. upload document,
10. open shift,
11. close shift,
12. daily closing,
13. reversal,
14. correction.

## 14. First version scope

Version 1 should include only:

1. users,
2. cashboxes,
3. currencies,
4. payment requests,
5. payment orders,
6. cash payment execution,
7. cash inflows,
8. balance calculation,
9. document metadata,
10. audit log,
11. simple mobile UI,
12. simple desktop UI.

Do not implement:

1. OCR,
2. ERP integration,
3. bank integration,
4. accounting posting,
5. advanced reporting,
6. complex multi-company setup.

These can be added later.
