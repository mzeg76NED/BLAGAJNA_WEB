# FAZA 0 - Data Source Inventory

Datum: 2026-07-09  
Status: IN PROGRESS  
Izvor: `src/00_Config.gs`, `docs/01_DATA_MODEL.md`, staticka analiza.

## 1. Opsti model

Postojeci izvor podataka je Google Sheets. `TABLE_HEADERS` definise 15 sheet-ova:

`USERS`, `APP_SESSIONS`, `ROLES`, `PERMISSIONS`, `ROLE_PERMISSIONS`, `CASHBOXES`, `CURRENCIES`, `PAYMENT_REQUESTS`, `PAYMENT_ORDERS`, `CASH_EVENTS`, `CASH_COUNTS`, `DOCUMENTS`, `SHIFTS`, `DAILY_CLOSING`, `AUDIT_LOG`.

Broj redova nije dostupan iz staticke analize. Za realan broj redova treba pokrenuti Apps Script read-only izvestaj nad produkcionom ili pilot bazom.

## 2. Tabele

### USERS

Svrha: aplikativni korisnici, Google kompatibilni email, role, PIN login metadata.

Kolone: `user_id`, `email`, `full_name`, `role`, `active`, `default_cashbox_id`, `created_at`, `updated_at`, `user_code`, `pin_hash`, `pin_salt`, `last_login_at`, `last_logout_at`, `failed_login_count`, `locked_until`, `last_google_session_email`.

Kljuc: `user_id`.  
Relacije: `default_cashbox_id -> CASHBOXES.cashbox_id`.  
Cita: login, permissions, audit, smene, korisnicka administracija.  
Pise: user admin, bootstrap/admin helpers, login fail/success metadata.  
Kriticnost: HIGH.  
Finansijski podaci: ne direktno.  
Audit podaci: identitet za audit.

### APP_SESSIONS

Svrha: interne aplikativne sesije.

Kolone: `session_id`, `app_user_id`, `user_code`, `role`, `google_session_email`, `cashbox_id`, `shift_id`, `created_at`, `last_seen_at`, `expires_at`, `active`, `logout_at`, `device_label`.

Kljuc: `session_id`.  
Relacije: `app_user_id -> USERS.user_id`, `cashbox_id -> CASHBOXES.cashbox_id`, `shift_id -> SHIFTS.shift_id`.  
Cita: svaki write API kroz `requireAppSession`.  
Pise: login, logout, switch user, session expiry.  
Kriticnost: HIGH.  
Finansijski podaci: ne.  
Audit podaci: da, session context.

### ROLES

Svrha: role registry.

Kolone: `role_id`, `role_name`, `description`, `active`, `system_role`, `created_at`, `updated_at`.

Kljuc: `role_id`.  
Cita/pise: permissions admin.  
Kriticnost: HIGH.

### PERMISSIONS

Svrha: registry privilegija.

Kolone: `permission_id`, `permission_name`, `description`, `category`, `active`, `system_permission`, `created_at`, `updated_at`.

Kljuc: `permission_id`.  
Cita/pise: permission matrix.  
Kriticnost: HIGH.

### ROLE_PERMISSIONS

Svrha: veza role i privilegije.

Kolone: `role_id`, `permission_id`, `allowed`, `created_at`, `updated_at`.

Kljuc: kompozitno `role_id + permission_id`.  
Relacije: `role_id -> ROLES.role_id`, `permission_id -> PERMISSIONS.permission_id`.  
Kriticnost: HIGH.

### CASHBOXES

Kolone: `cashbox_id`, `name`, `location`, `responsible_user_id`, `active`, `created_at`, `updated_at`.

Kljuc: `cashbox_id`.  
Relacije: `responsible_user_id -> USERS.user_id`.  
Cita: gotovo svi operativni tokovi.  
Pise: setup/admin.  
Kriticnost: HIGH.  
Finansijski podaci: indirektno.

### CURRENCIES

Kolone: `currency_code`, `name`, `active`, `is_default`, `denominations`.

Kljuc: `currency_code`.  
Cita: validacije, preseci, izvestaji.  
Pise: setup/admin.  
Kriticnost: HIGH.  
Finansijski podaci: indirektno.

### PAYMENT_REQUESTS

Kolone: `request_id`, `created_at`, `created_by`, `requester_user_id`, `requested_for_name`, `amount`, `currency`, `purpose`, `description`, `preferred_cashbox_id`, `needed_by_date`, `priority`, `status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `linked_order_id`, `approval_path`, `direct_cash_event_id`, `returned_for_correction_reason`, `cancellation_reason`, `document_status`, `updated_at`.

Kljuc: `request_id`.  
Relacije: `currency -> CURRENCIES.currency_code`, `preferred_cashbox_id -> CASHBOXES.cashbox_id`, `linked_order_id -> PAYMENT_ORDERS.order_id`.  
Cita: requests UI, approvals, reports, documents, print.  
Pise: request create/update/submit/approve/reject/return/cancel/order creation.  
Kriticnost: HIGH.  
Finansijski podaci: da, trazeni iznos.

### PAYMENT_ORDERS

Kolone: `order_id`, `created_at`, `created_by`, `source_request_id`, `linked_request_id`, `order_type`, `cashbox_id`, `pay_to_name`, `amount_ordered`, `amount_paid`, `currency`, `purpose`, `description`, `due_date`, `priority`, `status`, `issued_by`, `issued_at`, `executed_by`, `executed_at`, `linked_cash_event_id`, `document_status`, `cancellation_reason`, `cashier_rejection_reason`, `updated_at`.

Kljuc: `order_id`.  
Relacije: `source_request_id/linked_request_id -> PAYMENT_REQUESTS.request_id`, `cashbox_id -> CASHBOXES.cashbox_id`, `linked_cash_event_id -> CASH_EVENTS.event_id`.  
Cita: orders UI, execution, reports, print.  
Pise: order creation/update/issue/send/execute/reject/cancel/repair.  
Kriticnost: CRITICAL.  
Finansijski podaci: da.

### CASH_EVENTS

Kolone: `event_id`, `created_at`, `created_by`, `event_date`, `event_type`, `cashbox_id`, `currency`, `direction`, `amount`, `linked_request_id`, `linked_order_id`, `partner_name`, `description`, `document_status`, `status`, `posted_by`, `posted_at`, `locked_by`, `locked_at`, `reversal_of_event_id`, `updated_at`.

Kljuc: `event_id`.  
Relacije: `cashbox_id -> CASHBOXES.cashbox_id`, `currency -> CURRENCIES.currency_code`, `linked_order_id -> PAYMENT_ORDERS.order_id`, `linked_request_id -> PAYMENT_REQUESTS.request_id`, `reversal_of_event_id -> CASH_EVENTS.event_id`.  
Cita: saldo, knjiga, reports, closing, print.  
Pise: inflow, pending outflow, payment execution, treasury, correction, reversal, closing lock.  
Kriticnost: CRITICAL.  
Finansijski podaci: da, source of truth za saldo.

### CASH_COUNTS

Kolone: `count_id`, `created_at`, `created_by`, `count_type`, `cashbox_id`, `shift_id`, `currency`, `counted_cash_total`, `check_count`, `check_total`, `calculated_balance_before`, `difference`, `denominations_json`, `adjustment_event_id`, `note`, `status`, `posted_by`, `posted_at`, `updated_at`.

Kljuc: `count_id`.  
Relacije: `cashbox_id`, `shift_id`, `adjustment_event_id`.  
Cita: preseci, shift close, reports.  
Pise: cash count create batch, shift open/close with count.  
Kriticnost: HIGH.  
Finansijski podaci: da.

### DOCUMENTS

Kolone: `document_id`, `created_at`, `uploaded_by`, `entity_type`, `entity_id`, `file_name`, `file_id`, `file_url`, `mime_type`, `status`, `note`.

Kljuc: `document_id`.  
Relacije: polymorphic `entity_type + entity_id`.  
Cita: entity details, missing docs, print.  
Pise: attach, cancel, replace.  
Kriticnost: HIGH.  
Finansijski podaci: indirektno.

### SHIFTS

Kolone: `shift_id`, `cashbox_id`, `opened_by`, `opened_at`, `opening_note`, `opening_balance_json`, `closed_by`, `closed_at`, `handover_to`, `handover_at`, `closing_balance_json`, `physical_balance_json`, `difference_json`, `status`, `note`, `updated_at`.

Kljuc: `shift_id`.  
Relacije: `cashbox_id -> CASHBOXES.cashbox_id`.  
Cita: cash event write validation, UI, reports, print.  
Pise: open, handover, close, cancel.  
Kriticnost: CRITICAL.  
Finansijski podaci: da, kroz balance snapshots.

### DAILY_CLOSING

Kolone: `closing_id`, `closing_date`, `cashbox_id`, `currency`, `opening_balance`, `total_in`, `total_out`, `calculated_balance`, `physical_balance`, `difference`, `status`, `closed_by`, `closed_at`, `locked_by`, `locked_at`, `note`, `updated_at`.

Kljuc: `closing_id`.  
Relacije: `cashbox_id`, `currency`.  
Cita: reports, print.  
Pise: prepare/close/lock/cancel daily closing.  
Kriticnost: CRITICAL.  
Finansijski podaci: da.

### AUDIT_LOG

Kolone: `log_id`, `timestamp`, `user`, `app_user_id`, `app_user_name`, `user_code`, `role`, `google_session_email`, `cashbox_id`, `shift_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `comment`.

Kljuc: `log_id`.  
Cita: audit UI, reports, reconstruction helpers.  
Pise: sve bitne poslovne akcije.  
Kriticnost: CRITICAL.  
Audit podaci: da.

## 3. Enum i status izvori

Statusi i enum-i su definisani u `src/00_Config.gs` i ne smeju se menjati u migraciji bez posebnog naloga.

Kriticni skupovi:

- role: `ADMIN`, `DIRECTOR`, `FINANCE`, `CASHIER_SUPERVISOR`, `CASHIER`, `APPROVER`, `REQUESTER`, `VIEWER`
- request statusi: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `CASHIER_REVIEW`, `APPROVED`, `APPROVED_FOR_DIRECT_PAYMENT`, `ESCALATED_TO_ORDER`, `ORDER_CREATED`, `PAID`, `REJECTED`, `RETURNED_FOR_CORRECTION`, `CONVERTED_TO_ORDER`, `CANCELLED`
- order statusi: `DRAFT`, `ISSUED`, `WAITING_PAYMENT`, `PARTIALLY_PAID`, `PAID`, `REJECTED_BY_CASHIER`, `CANCELLED`, `CLOSED`
- cash event statusi: `DRAFT`, `SUBMITTED`, `POSTED`, `LOCKED`, `CANCELLED`, `REVERSED`

