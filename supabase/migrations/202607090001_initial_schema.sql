-- BLAGAJNA WEB migration baseline.
-- Source model: Google Apps Script TABLE_HEADERS in src/00_Config.gs.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table users (
  user_id text primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('ADMIN','DIRECTOR','FINANCE','CASHIER_SUPERVISOR','CASHIER','APPROVER','REQUESTER','VIEWER')),
  active boolean not null default true,
  default_cashbox_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  user_code text,
  pin_hash text,
  pin_salt text,
  last_login_at timestamptz,
  last_logout_at timestamptz,
  failed_login_count integer not null default 0 check (failed_login_count >= 0),
  locked_until timestamptz,
  last_google_session_email text
);

create unique index users_email_unique_idx on users (lower(email));
create unique index users_active_user_code_unique_idx on users (upper(user_code)) where active and user_code is not null and btrim(user_code) <> '';

create table roles (
  role_id text primary key,
  role_name text not null,
  description text,
  active boolean not null default true,
  system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table permissions (
  permission_id text primary key,
  permission_name text not null,
  description text,
  category text,
  active boolean not null default true,
  system_permission boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table role_permissions (
  role_id text not null references roles(role_id),
  permission_id text not null references permissions(permission_id),
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  primary key (role_id, permission_id)
);

create table cashboxes (
  cashbox_id text primary key,
  name text not null,
  location text,
  responsible_user_id text references users(user_id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table users
  add constraint users_default_cashbox_fk
  foreign key (default_cashbox_id) references cashboxes(cashbox_id);

create table currencies (
  currency_code text primary key,
  name text not null,
  active boolean not null default true,
  is_default boolean not null default false,
  denominations jsonb
);

create table app_sessions (
  session_id text primary key,
  app_user_id text not null references users(user_id),
  user_code text not null,
  role text not null,
  google_session_email text,
  cashbox_id text references cashboxes(cashbox_id),
  shift_id text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  expires_at timestamptz not null,
  active boolean not null default true,
  logout_at timestamptz,
  device_label text
);

create index app_sessions_active_user_idx on app_sessions(app_user_id, active, expires_at);

create table payment_requests (
  request_id text primary key,
  created_at timestamptz not null default now(),
  created_by text not null,
  requester_user_id text references users(user_id),
  requested_for_name text not null,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null references currencies(currency_code),
  purpose text not null,
  description text,
  preferred_cashbox_id text references cashboxes(cashbox_id),
  needed_by_date date,
  priority text not null default 'NORMAL' check (priority in ('NORMAL','URGENT','VERY_URGENT')),
  status text not null check (status in ('DRAFT','SUBMITTED','IN_REVIEW','CASHIER_REVIEW','APPROVED','APPROVED_FOR_DIRECT_PAYMENT','ESCALATED_TO_ORDER','ORDER_CREATED','PAID','REJECTED','RETURNED_FOR_CORRECTION','CONVERTED_TO_ORDER','CANCELLED')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  linked_order_id text,
  approval_path text check (approval_path is null or approval_path in ('DIRECT_PAYMENT','AUTO_ORDER','PAYMENT_ORDER','UNDECIDED')),
  direct_cash_event_id text,
  returned_for_correction_reason text,
  cancellation_reason text,
  document_status text not null default 'NONE' check (document_status in ('NONE','MISSING','ATTACHED','ACTIVE','REPLACED','CANCELLED')),
  updated_at timestamptz
);

create index payment_requests_status_idx on payment_requests(status);
create index payment_requests_created_at_idx on payment_requests(created_at desc);

create table payment_orders (
  order_id text primary key,
  created_at timestamptz not null default now(),
  created_by text not null,
  source_request_id text references payment_requests(request_id),
  linked_request_id text references payment_requests(request_id),
  order_type text not null check (order_type in ('FROM_REQUEST','DIRECT_ORDER')),
  cashbox_id text not null references cashboxes(cashbox_id),
  pay_to_name text not null,
  amount_ordered numeric(18,2) not null check (amount_ordered > 0),
  amount_paid numeric(18,2) not null default 0 check (amount_paid >= 0),
  currency text not null references currencies(currency_code),
  purpose text not null,
  description text,
  due_date date,
  priority text not null default 'NORMAL' check (priority in ('NORMAL','URGENT','VERY_URGENT')),
  status text not null check (status in ('DRAFT','ISSUED','WAITING_PAYMENT','PARTIALLY_PAID','PAID','REJECTED_BY_CASHIER','CANCELLED','CLOSED')),
  issued_by text,
  issued_at timestamptz,
  executed_by text,
  executed_at timestamptz,
  linked_cash_event_id text,
  document_status text not null default 'NONE' check (document_status in ('NONE','MISSING','ATTACHED','ACTIVE','REPLACED','CANCELLED')),
  cancellation_reason text,
  cashier_rejection_reason text,
  updated_at timestamptz,
  constraint payment_orders_amount_paid_not_over_ordered check (amount_paid <= amount_ordered)
);

alter table payment_requests
  add constraint payment_requests_linked_order_fk
  foreign key (linked_order_id) references payment_orders(order_id);

create index payment_orders_status_idx on payment_orders(status);
create index payment_orders_cashbox_currency_idx on payment_orders(cashbox_id, currency);

create table cash_events (
  event_id text primary key,
  created_at timestamptz not null default now(),
  created_by text not null,
  event_date timestamptz not null,
  event_type text not null check (event_type in ('CASH_INFLOW','CASH_OUTFLOW','CASH_TRANSFER_IN','CASH_TRANSFER_OUT','TREASURY_HANDOVER','CORRECTION','REVERSAL')),
  cashbox_id text not null references cashboxes(cashbox_id),
  currency text not null references currencies(currency_code),
  direction text not null check (direction in ('IN','OUT','NEUTRAL')),
  amount numeric(18,2) not null check (amount >= 0),
  linked_request_id text references payment_requests(request_id),
  linked_order_id text references payment_orders(order_id),
  partner_name text,
  description text not null,
  document_status text not null default 'NONE' check (document_status in ('NONE','MISSING','ATTACHED','ACTIVE','REPLACED','CANCELLED')),
  status text not null check (status in ('DRAFT','SUBMITTED','POSTED','LOCKED','CANCELLED','REVERSED')),
  posted_by text,
  posted_at timestamptz,
  locked_by text,
  locked_at timestamptz,
  reversal_of_event_id text references cash_events(event_id),
  updated_at timestamptz
);

alter table payment_orders
  add constraint payment_orders_linked_cash_event_fk
  foreign key (linked_cash_event_id) references cash_events(event_id);

alter table payment_requests
  add constraint payment_requests_direct_cash_event_fk
  foreign key (direct_cash_event_id) references cash_events(event_id);

create index cash_events_balance_idx on cash_events(cashbox_id, currency, status, event_date);
create index cash_events_order_idx on cash_events(linked_order_id);

create table shifts (
  shift_id text primary key,
  cashbox_id text not null references cashboxes(cashbox_id),
  opened_by text not null,
  opened_at timestamptz not null default now(),
  opening_note text,
  opening_balance_json jsonb,
  closed_by text,
  closed_at timestamptz,
  handover_to text,
  handover_at timestamptz,
  closing_balance_json jsonb,
  physical_balance_json jsonb,
  difference_json jsonb,
  status text not null check (status in ('OPEN','HANDED_OVER','CLOSED','CLOSED_WITH_DIFFERENCE','CANCELLED')),
  note text,
  updated_at timestamptz
);

alter table app_sessions
  add constraint app_sessions_shift_fk
  foreign key (shift_id) references shifts(shift_id);

create unique index shifts_one_open_per_cashbox_idx on shifts(cashbox_id) where status = 'OPEN';

create table cash_counts (
  count_id text primary key,
  created_at timestamptz not null default now(),
  created_by text not null,
  count_type text not null check (count_type in ('SHIFT_OPENING','CASHBOX_COUNT','SHIFT_CLOSING','DAILY_CLOSING_COUNT')),
  cashbox_id text not null references cashboxes(cashbox_id),
  shift_id text references shifts(shift_id),
  currency text not null references currencies(currency_code),
  counted_cash_total numeric(18,2) not null check (counted_cash_total >= 0),
  check_count numeric(18,2),
  check_total numeric(18,2),
  calculated_balance_before numeric(18,2) not null,
  difference numeric(18,2) not null,
  denominations_json jsonb,
  adjustment_event_id text references cash_events(event_id),
  note text,
  status text not null check (status in ('DRAFT','POSTED','CANCELLED')),
  posted_by text,
  posted_at timestamptz,
  updated_at timestamptz
);

create index cash_counts_shift_idx on cash_counts(shift_id, created_at desc);

create table documents (
  document_id text primary key,
  created_at timestamptz not null default now(),
  uploaded_by text not null,
  entity_type text not null check (entity_type in ('PAYMENT_REQUEST','PAYMENT_ORDER','CASH_EVENT','SHIFT','DAILY_CLOSING')),
  entity_id text not null,
  file_name text not null,
  file_id text not null,
  file_url text not null,
  mime_type text,
  status text not null check (status in ('NONE','MISSING','ATTACHED','ACTIVE','REPLACED','CANCELLED')),
  note text
);

create index documents_entity_idx on documents(entity_type, entity_id, status);

create table daily_closing (
  closing_id text primary key,
  closing_date date not null,
  cashbox_id text not null references cashboxes(cashbox_id),
  currency text not null references currencies(currency_code),
  opening_balance numeric(18,2) not null,
  total_in numeric(18,2) not null,
  total_out numeric(18,2) not null,
  calculated_balance numeric(18,2) not null,
  physical_balance numeric(18,2) not null,
  difference numeric(18,2) not null,
  status text not null check (status in ('DRAFT','CLOSED','CLOSED_WITH_DIFFERENCE','LOCKED','CANCELLED')),
  closed_by text,
  closed_at timestamptz,
  locked_by text,
  locked_at timestamptz,
  note text,
  updated_at timestamptz
);

create unique index daily_closing_active_unique_idx
  on daily_closing(closing_date, cashbox_id, currency)
  where status <> 'CANCELLED';

create table audit_log (
  log_id text primary key,
  "timestamp" timestamptz not null default now(),
  "user" text not null,
  app_user_id text,
  app_user_name text,
  user_code text,
  role text,
  google_session_email text,
  cashbox_id text,
  shift_id text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  old_value jsonb,
  new_value jsonb,
  comment text
);

create index audit_log_entity_idx on audit_log(entity_type, entity_id, "timestamp" desc);
create index audit_log_timestamp_idx on audit_log("timestamp" desc);

create or replace function prevent_audit_log_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

create trigger audit_log_no_update
before update on audit_log
for each row execute function prevent_audit_log_update_delete();

create trigger audit_log_no_delete
before delete on audit_log
for each row execute function prevent_audit_log_update_delete();

create or replace view cashbox_balances as
select
  cashbox_id,
  currency,
  sum(
    case
      when direction = 'IN' then amount
      when direction = 'OUT' then -amount
      else 0
    end
  ) as balance
from cash_events
where status in ('POSTED', 'LOCKED')
group by cashbox_id, currency;

create trigger users_set_updated_at before update on users for each row execute function set_updated_at();
create trigger roles_set_updated_at before update on roles for each row execute function set_updated_at();
create trigger role_permissions_set_updated_at before update on role_permissions for each row execute function set_updated_at();
create trigger cashboxes_set_updated_at before update on cashboxes for each row execute function set_updated_at();
create trigger payment_requests_set_updated_at before update on payment_requests for each row execute function set_updated_at();
create trigger payment_orders_set_updated_at before update on payment_orders for each row execute function set_updated_at();
create trigger cash_events_set_updated_at before update on cash_events for each row execute function set_updated_at();
create trigger shifts_set_updated_at before update on shifts for each row execute function set_updated_at();
create trigger cash_counts_set_updated_at before update on cash_counts for each row execute function set_updated_at();
create trigger daily_closing_set_updated_at before update on daily_closing for each row execute function set_updated_at();
