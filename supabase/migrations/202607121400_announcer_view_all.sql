-- FAZA 3w-10: ANNOUNCER rola - "svi vide sve najave, ali edituje/salje samo
-- svoje". Korisnik (Mika, Pera, Zika) potvrdio da ANNOUNCER ne sme da vidi
-- Knjigu, Smene, ni Naloge - to je vec obezbedjeno na frontendu kroz
-- restrictNavToNajave_() (scripts.html), koja hardkodovano sakriva sve
-- sekcije/navigaciju osim Najava za role ASSISTANT_CASHIER i ANNOUNCER, i na
-- backendu kroz odsustvo ijedne cash_events/shifts/payment_orders privilegije
-- za ANNOUNCER (ovaj fajl to ne dira).
--
-- Stanje PRE ove migracije (supabase/seed.sql, ANNOUNCER blok):
--   samo payment_announcements:create -> posledica: api/payment-announcements/
--   list.js racuna `ownOnly = !userHasAnyPrivilege(appUser, ['payment_announcements:view',
--   'payment_announcements:match'])` = true za ANNOUNCER, pa je svaki ANNOUNCER
--   video SAMO SVOJE najave - suprotno od trazenog "svi vide sve najave".
--
-- Ova migracija dodaje payment_announcements:view (pregled svih najava), a
-- payment_announcements:match OSTAJE false (eksplicitno postavljeno) - zato
-- sto vec postojeca ownership provera u _lib/paymentAnnouncements.js
-- (`if (announcement.created_by !== email && !canOverride) throw ...`, gde je
-- canOverride === userHasPrivilege(appUser, 'payment_announcements:match'))
-- automatski ogranicava izmenu/slanje na SOPSTVENE najave kada :match nije
-- dodeljen - bez ijedne izmene u kodu, isti mehanizam kao za DIRECTOR
-- (videti 202607121300_director_permissions_fix.sql).
insert into role_permissions (role_id, permission_id, allowed)
values
  ('ANNOUNCER', 'payment_announcements:create', true),
  ('ANNOUNCER', 'payment_announcements:view', true),
  ('ANNOUNCER', 'payment_announcements:match', false)
on conflict (role_id, permission_id) do update set
  allowed = excluded.allowed,
  updated_at = now();
