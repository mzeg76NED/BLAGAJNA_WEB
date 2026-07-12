-- FAZA 3w-9: DIREKTOR rola nije odgovarala specifikaciji ("mobilni, rola DIRECTOR,
-- dozvoljene akcije: pregled svih dokumenata samo pregled / obavezan presek / nova
-- najava / novi nalog / nad ovim dokumentima ima sve akcije ako je on njihov vlasnik /
-- na nalogu za isplatu ima sve akcije bez obzira ko je vlasnik").
--
-- Stvarno stanje u supabase/seed.sql (DIRECTOR blok) pre ove migracije:
--   audit:view, cash_events:view, documents:attach, documents:cancel, documents:view,
--   payment_orders:create/issue/view, payment_requests:approve/create/reject/
--   return_for_correction/view_all, shifts:view
-- - DIREKTOR je imao PUNU kontrolu (odobri/odbij/vrati na doradu/kreiraj) nad TUDJIM
--   Zahtevima za isplatu i nad dokumentima uopste (attach/cancel) - suprotno od
--   "samo pregled" za ostale dokumente.
-- - DIREKTOR nije imao NIJEDNU payment_announcements privilegiju - zato mu se
--   "Najave" stavka u hamburgeru uopste nije ni pojavljivala (to nije bio bag u
--   kodu, nego ispravno ponasanje za korisnika bez privilegije).
-- - DIREKTOR nije imao payment_orders:reject/cancel/execute/reverse - nepotpun
--   set za "sve akcije" na Nalogu za isplatu.
--
-- payment_orders akcije (create/issue/reject/cancel/execute/reverse) NEMAJU nikakvu
-- proveru vlasnistva u backend kodu (videti web/functions/api/payment-orders/*.js) -
-- ko god ima privilegiju moze da radi sa BILO KOJIM nalogom, bez obzira ko ga je
-- kreirao. Zato je dovoljno dodeliti pun set payment_orders:* da bi DIREKTOR imao
-- "sve akcije bez obzira ko je vlasnik" na nalozima, ukljucujuci slanje na naplatu
-- (payment_orders:issue -> send-to-cashier.js).
--
-- payment_announcements akcije VEC IMAJU ugradjenu proveru vlasnistva u kodu
-- (_lib/paymentAnnouncements.js: `if (announcement.created_by !== email && !canOverride)`,
-- gde je canOverride === payment_announcements:match) - dodeljivanjem :view + :create
-- (BEZ :match) DIREKTOR dobija tacno "pregled svih najava, ali izmena/slanje samo
-- sopstvenih" - bez ijedne izmene koda, samo kroz vec postojecu logiku.
--
-- "Obavezan presek stanja" je vec hardkodovano ogranicen na ADMIN/DIREKTOR u
-- web/functions/_lib/mandatoryCount.js (MANDATE_COUNT_ROLES) - ne prolazi kroz
-- permission matricu, DIREKTOR to vec moze, ovde nema sta da se doda.
insert into role_permissions (role_id, permission_id, allowed)
values
  ('DIRECTOR', 'audit:view', true),
  ('DIRECTOR', 'cash_events:view', true),
  ('DIRECTOR', 'shifts:view', true),
  -- Dokumenti: samo pregled - attach/cancel eksplicitno iskljuceni.
  ('DIRECTOR', 'documents:view', true),
  ('DIRECTOR', 'documents:attach', false),
  ('DIRECTOR', 'documents:cancel', false),
  -- Zahtevi za isplatu: samo pregled svih - odobravanje/kreiranje/odbijanje/
  -- vracanje na doradu eksplicitno iskljuceni (to su bile "sve akcije nad
  -- tudjim dokumentima" koje spec NIJE trazio za Zahteve).
  ('DIRECTOR', 'payment_requests:view_all', true),
  ('DIRECTOR', 'payment_requests:approve', false),
  ('DIRECTOR', 'payment_requests:create', false),
  ('DIRECTOR', 'payment_requests:reject', false),
  ('DIRECTOR', 'payment_requests:return_for_correction', false),
  -- Nalog za isplatu: sve akcije, bez obzira na vlasnika (nema ownership provere
  -- u kodu za payment_orders, pa pun set = trazeno ponasanje).
  ('DIRECTOR', 'payment_orders:view', true),
  ('DIRECTOR', 'payment_orders:create', true),
  ('DIRECTOR', 'payment_orders:issue', true),
  ('DIRECTOR', 'payment_orders:reject', true),
  ('DIRECTOR', 'payment_orders:cancel', true),
  ('DIRECTOR', 'payment_orders:execute', true),
  ('DIRECTOR', 'payment_orders:reverse', true),
  -- Najava uplate: pregled svih + kreiranje sopstvene; BEZ :match, tako da
  -- izmena/slanje ostaju ograniceni na sopstvene najave (postojeca logika u
  -- _lib/paymentAnnouncements.js).
  ('DIRECTOR', 'payment_announcements:view', true),
  ('DIRECTOR', 'payment_announcements:create', true),
  ('DIRECTOR', 'payment_announcements:match', false)
on conflict (role_id, permission_id) do update set
  allowed = excluded.allowed,
  updated_at = now();
