-- Manual bootstrap template for the first Supabase migration environment.
-- Do not run this file unchanged.
--
-- Purpose:
-- - create the first real cashbox only after business data is confirmed;
-- - create the first real app ADMIN only after the initial PIN is entered
--   manually in Supabase SQL Editor for this one-time bootstrap.
--
-- Source notes:
-- - `docs/12_APP_LOGIN_AND_SESSIONS.md` references `CB_MAIN` and
--   `USR_ADMIN_MILANKO` as pilot values.
-- - The migration procedure must not invent production users, locations or PINs.
-- - Replace every `<TODO: ...>` placeholder before running.
-- - Do not commit a filled-in copy of this file.

/*
insert into cashboxes (
  cashbox_id,
  name,
  location,
  responsible_user_id,
  active
) values (
  'CB_MAIN',
  '<TODO: real cashbox name>',
  '<TODO: real cashbox location>',
  null,
  true
)
on conflict (cashbox_id) do update set
  name = excluded.name,
  location = excluded.location,
  active = excluded.active,
  updated_at = now();
*/

/*
with bootstrap_pin as (
  select
    '<TODO: initial PIN, digits only>'::text as pin,
    gen_random_uuid()::text as salt
),
bootstrap_user as (
  select
    'USR_ADMIN_MILANKO'::text as user_id,
    '<TODO: real approved email>'::text as email,
    '<TODO: real full name>'::text as full_name,
    'ADMIN'::text as role,
    true::boolean as active,
    'CB_MAIN'::text as default_cashbox_id,
    'MILANKO'::text as user_code,
    encode(digest(pin || ':' || salt, 'sha256'), 'hex') as pin_hash,
    salt as pin_salt
  from bootstrap_pin
)
insert into users (
  user_id,
  email,
  full_name,
  role,
  active,
  default_cashbox_id,
  user_code,
  pin_hash,
  pin_salt
)
select
  user_id,
  email,
  full_name,
  role,
  active,
  default_cashbox_id,
  user_code,
  pin_hash,
  pin_salt
from bootstrap_user
on conflict (user_id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  active = excluded.active,
  default_cashbox_id = excluded.default_cashbox_id,
  user_code = excluded.user_code,
  pin_hash = excluded.pin_hash,
  pin_salt = excluded.pin_salt,
  failed_login_count = 0,
  locked_until = null,
  updated_at = now();
*/
