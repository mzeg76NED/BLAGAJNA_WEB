# Data Model

Ovaj dokument je autoritativni pocetni model podataka za BLAGAJNA WEB.

Sistem je event-based. Stanje blagajne se ne unosi rucno, vec se racuna iz knjizenih novcanih dogadjaja.

Ključno poslovno pravilo:

```text
Payment Request nije isplata.
Payment Order nije isplata.
Samo posted ili locked Cash Event menja stanje blagajne.
```

## Sheetovi

Koriste se tacno ovi Google Sheets listovi:

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

## USERS

Svrha: korisnici sistema i njihove uloge.

| Column | Type | Required | Description |
|---|---|---:|---|
| user_id | string | yes | Internal user ID |
| email | string | yes | Google account email |
| full_name | string | yes | User full name |
| role | string | yes | ADMIN, DIRECTOR, FINANCE, CASHIER_SUPERVISOR, CASHIER, APPROVER, REQUESTER, VIEWER |
| active | boolean | yes | TRUE/FALSE |
| default_cashbox_id | string | no | Default cashbox |
| created_at | datetime | yes | Creation time |
| updated_at | datetime | no | Last update time |

Relationship: `default_cashbox_id` references `CASHBOXES.cashbox_id`.

## CASHBOXES

Svrha: blagajne u kojima se drzi novac.

| Column | Type | Required | Description |
|---|---|---:|---|
| cashbox_id | string | yes | Internal cashbox ID |
| name | string | yes | Cashbox name |
| location | string | no | Location |
| responsible_user_id | string | no | Responsible user |
| active | boolean | yes | TRUE/FALSE |
| created_at | datetime | yes | Creation time |
| updated_at | datetime | no | Last update time |

Relationship: `responsible_user_id` references `USERS.user_id`.

## CURRENCIES

Svrha: podrzane valute.

| Column | Type | Required | Description |
|---|---|---:|---|
| currency_code | string | yes | RSD, EUR |
| name | string | yes | Currency name |
| active | boolean | yes | TRUE/FALSE |
| is_default | boolean | yes | TRUE/FALSE |

Initial currencies: `RSD`, `EUR`.

## PAYMENT_REQUESTS

Svrha: zahtev koji korisnik podnosi trazeci isplatu.

Vazno: ova tabela nikada ne menja stanje blagajne.

| Column | Type | Required | Description |
|---|---|---:|---|
| request_id | string | yes | Unique request ID |
| created_at | datetime | yes | Creation time |
| created_by | string | yes | User email or ID |
| requester_user_id | string | no | User who requests payment |
| requested_for_name | string | yes | Person who should receive money |
| amount | number | yes | Requested amount |
| currency | string | yes | Currency |
| purpose | string | yes | Business purpose |
| description | text | no | Additional explanation |
| preferred_cashbox_id | string | no | Suggested cashbox |
| needed_by_date | date | no | Requested payment date |
| priority | string | yes | NORMAL, URGENT |
| status | string | yes | DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, CONVERTED_TO_ORDER, CANCELLED |
| reviewed_by | string | no | Reviewer user |
| reviewed_at | datetime | no | Review time |
| rejection_reason | text | no | Required if rejected |
| linked_order_id | string | no | Created payment order |
| document_status | string | yes | NONE, MISSING, ATTACHED |
| updated_at | datetime | no | Last update time |

Relationships: `currency` references `CURRENCIES.currency_code`; `preferred_cashbox_id` references `CASHBOXES.cashbox_id`; `linked_order_id` references `PAYMENT_ORDERS.order_id`.

## PAYMENT_ORDERS

Svrha: autorizovano uputstvo blagajniku da izvrsi isplatu.

Vazno: ova tabela ne menja stanje blagajne dok se nalog ne izvrsi kao Cash Event.

| Column | Type | Required | Description |
|---|---|---:|---|
| order_id | string | yes | Unique order ID |
| created_at | datetime | yes | Creation time |
| created_by | string | yes | User who created order |
| source_request_id | string | no | Linked payment request |
| order_type | string | yes | FROM_REQUEST, DIRECT_ORDER |
| cashbox_id | string | yes | Cashbox that should pay |
| pay_to_name | string | yes | Recipient |
| amount_ordered | number | yes | Ordered amount |
| amount_paid | number | yes | Paid amount, default 0 |
| currency | string | yes | Currency |
| purpose | string | yes | Payment purpose |
| description | text | no | Additional explanation |
| due_date | date | no | Due date |
| priority | string | yes | NORMAL, URGENT |
| status | string | yes | DRAFT, ISSUED, WAITING_PAYMENT, PARTIALLY_PAID, PAID, REJECTED_BY_CASHIER, CANCELLED, CLOSED |
| issued_by | string | no | User issuing order |
| issued_at | datetime | no | Issue time |
| executed_by | string | no | Cashier who executed |
| executed_at | datetime | no | Execution time |
| linked_cash_event_id | string | no | Actual cash event |
| document_status | string | yes | NONE, MISSING, ATTACHED |
| cancellation_reason | text | no | Required if cancelled |
| cashier_rejection_reason | text | no | Required if rejected by cashier |
| updated_at | datetime | no | Last update time |

Relationships: `source_request_id` references `PAYMENT_REQUESTS.request_id`; `cashbox_id` references `CASHBOXES.cashbox_id`; `currency` references `CURRENCIES.currency_code`; `linked_cash_event_id` references `CASH_EVENTS.event_id`.

## CASH_EVENTS

Svrha: stvarno kretanje novca.

Samo `POSTED` ili `LOCKED` Cash Event utice na izracunato stanje blagajne.

| Column | Type | Required | Description |
|---|---|---:|---|
| event_id | string | yes | Unique event ID |
| created_at | datetime | yes | Creation time |
| created_by | string | yes | User who created event |
| event_date | date | yes | Business date |
| event_type | string | yes | CASH_INFLOW, CASH_OUTFLOW, CASH_TRANSFER_IN, CASH_TRANSFER_OUT, CORRECTION, REVERSAL |
| cashbox_id | string | yes | Cashbox |
| currency | string | yes | Currency |
| direction | string | yes | IN, OUT, NEUTRAL |
| amount | number | yes | Amount |
| linked_request_id | string | no | Linked payment request |
| linked_order_id | string | no | Linked payment order |
| partner_name | string | no | Partner or person |
| description | text | yes | Business explanation |
| document_status | string | yes | NONE, MISSING, ATTACHED |
| status | string | yes | DRAFT, SUBMITTED, POSTED, LOCKED, CANCELLED, REVERSED |
| posted_by | string | no | User who posted event |
| posted_at | datetime | no | Posting time |
| locked_by | string | no | User who locked event |
| locked_at | datetime | no | Lock time |
| reversal_of_event_id | string | no | Original event if this is reversal |
| updated_at | datetime | no | Last update time |

Relationships: `cashbox_id` references `CASHBOXES.cashbox_id`; `currency` references `CURRENCIES.currency_code`; `linked_request_id` references `PAYMENT_REQUESTS.request_id`; `linked_order_id` references `PAYMENT_ORDERS.order_id`; `reversal_of_event_id` references `CASH_EVENTS.event_id`.

## DOCUMENTS

Svrha: metapodaci za fajlove sacuvane u Google Drive-u.

| Column | Type | Required | Description |
|---|---|---:|---|
| document_id | string | yes | Unique document ID |
| created_at | datetime | yes | Upload time |
| uploaded_by | string | yes | User |
| entity_type | string | yes | PAYMENT_REQUEST, PAYMENT_ORDER, CASH_EVENT, SHIFT, DAILY_CLOSING |
| entity_id | string | yes | Linked entity ID |
| file_name | string | yes | Original file name |
| file_id | string | yes | Google Drive file ID |
| file_url | string | yes | Google Drive file URL |
| mime_type | string | no | File MIME type |
| status | string | yes | ACTIVE, REPLACED, CANCELLED |
| note | text | no | Note |

Relationship: `entity_type` and `entity_id` identify the business entity that owns the document.

## SHIFTS

Svrha: pracenje smene blagajnika i primopredaje.

Smena ne menja stanje blagajne. Smena odredjuje odgovornost nad blagajnom, dok se stanje blagajne racuna iz knjizenih blagajnickih dogadjaja.

| Column | Type | Required | Description |
|---|---|---:|---|
| shift_id | string | yes | Unique shift ID |
| cashbox_id | string | yes | Cashbox |
| opened_by | string | yes | User |
| opened_at | datetime | yes | Opening time |
| opening_note | text | no | Opening note |
| opening_balance_json | text/json | no | Calculated balance by currency at opening |
| closed_by | string | no | User |
| closed_at | datetime | no | Closing time |
| handover_to | string | no | Receiving user |
| handover_at | datetime | no | Handover time |
| closing_balance_json | text/json | no | Calculated balance by currency at close/handover |
| physical_balance_json | text/json | no | Physically counted balance by currency |
| difference_json | text/json | no | Physical balance minus calculated balance by currency |
| status | string | yes | OPEN, HANDED_OVER, CLOSED, CLOSED_WITH_DIFFERENCE, CANCELLED |
| note | text | no | Note |
| updated_at | datetime | no | Last update timestamp |

Relationship: `cashbox_id` references `CASHBOXES.cashbox_id`.

## DAILY_CLOSING

Svrha: dnevni zakljucak po blagajni i valuti.

Dnevni zakljucak ne pravi promet i ne menja iznose na blagajnickim dogadjajima. On evidentira obracunsko stanje, fizicko stanje, razliku i zakljucava dogadjaje koji su usli u zakljucak.

| Column | Type | Required | Description |
|---|---|---:|---|
| closing_id | string | yes | Unique closing ID |
| closing_date | date | yes | Business date |
| cashbox_id | string | yes | Cashbox |
| currency | string | yes | Currency |
| opening_balance | number | yes | Opening calculated balance |
| total_in | number | yes | Total inflow |
| total_out | number | yes | Total outflow |
| calculated_balance | number | yes | System calculated balance |
| physical_balance | number | yes | Counted cash |
| difference | number | yes | Physical minus calculated |
| status | string | yes | DRAFT, CLOSED, CLOSED_WITH_DIFFERENCE, LOCKED, CANCELLED |
| closed_by | string | no | User |
| closed_at | datetime | no | Closing time |
| locked_by | string | no | User who administratively locked closing |
| locked_at | datetime | no | Lock time |
| note | text | no | Note |
| updated_at | datetime | no | Last update timestamp |

Relationships: `cashbox_id` references `CASHBOXES.cashbox_id`; `currency` references `CURRENCIES.currency_code`.

## AUDIT_LOG

Svrha: neizmenjiv log vaznih akcija.

| Column | Type | Required | Description |
|---|---|---:|---|
| log_id | string | yes | Unique log ID |
| timestamp | datetime | yes | Action time |
| user | string | yes | User email or ID |
| action | string | yes | CREATE, UPDATE, SUBMIT, APPROVE, REJECT, CANCEL, POST, LOCK, REVERSE |
| entity_type | string | yes | Table/entity name |
| entity_id | string | yes | Entity ID |
| old_value | text | no | Previous value as JSON string |
| new_value | text | no | New value as JSON string |
| comment | text | no | Explanation |

Audit log se ne azurira i ne brise kroz poslovne funkcije. Svaka vazna akcija dodaje novi red.
