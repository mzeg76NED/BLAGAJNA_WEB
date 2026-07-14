-- Korisnikov zahtev (2026-07-14): "CASHIER i admin vide sve najave uplata kada vise
-- nisu nacrti." - tj. cim najava predje iz DRAFT/RETURNED u OPEN/MATCHED/CANCELLED
-- (poslata / obradjena), CASHIER i ADMIN treba da je vide na listi, ne samo one koje
-- su sami kreirali.
--
-- supabase/seed.sql VEC sadrzi payment_announcements:view = true za oba (CASHIER liniju
-- 205, ADMIN liniju 103), ali seed.sql se koristi samo za pocetno/dev okruzenje - ne
-- primenjuje se automatski na postojecu produkcionu bazu (isti razlog zbog kog je bio
-- potreban 202607121400_announcer_view_all.sql za ANNOUNCER). Ova migracija prenosi to
-- isto stanje u produkciju za CASHIER i ADMIN.
--
-- Napomena: :view iskljucuje sopstvene NACRTE drugih korisnika (vidi FAZA 3z ispravku u
-- _lib/paymentAnnouncements.js - listAnnouncementsCore), sto je i trazeno ponasanje -
-- CASHIER/ADMIN ne treba da vide tudje jos-nepodnete nacrte, samo posle slanja.
insert into role_permissions (role_id, permission_id, allowed)
values
  ('CASHIER', 'payment_announcements:view', true),
  ('CASHIER', 'payment_announcements:create', true),
  ('CASHIER', 'payment_announcements:match', true),
  ('ADMIN', 'payment_announcements:view', true),
  ('ADMIN', 'payment_announcements:create', true),
  ('ADMIN', 'payment_announcements:match', true)
on conflict (role_id, permission_id) do update set
  allowed = excluded.allowed,
  updated_at = now();
