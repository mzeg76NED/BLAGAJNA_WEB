# FAZA 1 - Target Architecture

Datum: 2026-07-09  
Status: DRAFT  
Napomena: Ovo je pocetna arhitektura za migraciju. Ne znaci da je implementacija pocela.

## 1. Ciljna arhitektura

```text
Korisnik
  |
  v
blagajna.nedeljkovic.co.rs
  |
  v
Cloudflare Pages
  |
  v
Cloudflare Pages Functions ili Supabase Edge Functions
  |
  v
Supabase PostgreSQL
```

Dokumenti u prvoj migracionoj fazi mogu ostati na Google Drive-u preko backend adaptera, jer korisnicki dokument izricito kaze da se ne uvodi Supabase Storage bez potrebe. Dugorocno je moguce prebacivanje na Supabase Storage ili Cloudflare R2, ali to nije deo prvog funkcionalnog cutover-a ako nije posebno odobreno.

## 2. Principi

- Ne menjati poslovnu logiku.
- Ne menjati statuse.
- Ne menjati UI dizajn.
- Ne prepisivati sve odjednom.
- Legacy Apps Script ostaje operativan dok novi modul nije dokazan.
- Jedan source of truth po write workflow-u.
- Sva poslovno kriticna logika je na backend-u.
- Frontend je samo prikaz, unos i poziv API-ja.

## 3. Frontend

Predlog strukture:

```text
web/
  public/
  src/
    api/
      client.ts
      auth.ts
      users.ts
      cashboxes.ts
      shifts.ts
      cashEvents.ts
      paymentOrders.ts
      paymentRequests.ts
      documents.ts
      reports.ts
    legacy/
      appsScriptAdapter.ts
    screens/
    styles/
```

U prvoj fazi nije cilj redizajn. Postojeci HTML/CSS/JS treba izdvajati minimalno i kontrolisano.

## 4. Backend

Dve dozvoljene opcije:

1. Cloudflare Pages Functions kao API sloj koji pristupa Supabase-u.
2. Supabase Edge Functions kao API sloj.

Za poslovne write operacije preporuka je server-side API sa service role pristupom, uz strogu proveru app session-a i privilegija. Frontend ne sme imati service role key.

## 5. Baza

Supabase PostgreSQL.

Minimalna migraciona struktura mora poceti od postojeceg modela:

- `users`
- `app_sessions`
- `roles`
- `permissions`
- `role_permissions`
- `cashboxes`
- `currencies`
- `payment_requests`
- `payment_orders`
- `cash_events`
- `cash_counts`
- `documents`
- `shifts`
- `daily_closing`
- `audit_log`

Ne uvoditi novi apstraktni model koji menja poslovne pojmove dok parity nije zavrsen.

## 6. Auth i session

Zadrzati postojece dve ravni identiteta:

- Google nalog kao tehnicka sesija.
- Aplikativni korisnik preko `user_code` + PIN.

App session mora nositi:

- `session_id`,
- `app_user_id`,
- `user_code`,
- `role`,
- `google_session_email`,
- `cashbox_id`,
- `shift_id`,
- `created_at`,
- `last_seen_at`,
- `expires_at`,
- `active`.

## 7. API adapter

Uvesti adapter koji moze da radi u rezimu:

```text
BACKEND_MODE=legacy
BACKEND_MODE=supabase
```

Po modulu kasnije:

```text
auth=supabase
shifts=legacy
paymentOrders=legacy
```

Ovo omogucava modul-po-modul migraciju bez velikog reza.

## 8. Transakcioni model

Svaki kritican workflow mora biti jedna DB transakcija:

- izvrsenje isplate,
- slanje naloga blagajniku,
- otvaranje/zatvaranje smene,
- presek sa korekcijom,
- dnevni zakljucak,
- storno i korekcija,
- korisnicke promene koje uticu na pristup.

`LockService` semantika se prenosi na PostgreSQL transakcije, unique partial indexe i po potrebi `SELECT ... FOR UPDATE`.

## 9. Deploy

Planirani deploy:

- GitHub kao source control,
- Cloudflare Pages build iz repozitorijuma,
- Supabase migrations u Git-u,
- secrets samo u Cloudflare/Supabase env konfiguraciji,
- bez automatskog DNS menjanja bez posebne potvrde.

Ciljni domen:

`blagajna.nedeljkovic.co.rs`

## 10. Sledeci koraci posle FAZE 0

1. Dovrsiti sve FAZA 0 inventare.
2. Napraviti `05_DATABASE_MODEL.md`.
3. Tek zatim kreirati `supabase/` skeleton i prvu SQL migraciju.
4. Ne dirati postojece Apps Script fajlove bez posebnog zadatka.

