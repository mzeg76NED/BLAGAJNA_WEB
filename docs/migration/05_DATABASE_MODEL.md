# FAZA 2 - Database Model Draft

Datum: 2026-07-09  
Status: DRAFT  
SQL migracija: `supabase/migrations/202607090001_initial_schema.sql`

## 1. Princip

Model baze je izveden iz postojeceg `TABLE_HEADERS` modela u `src/00_Config.gs`. Namerno nisu uvodjeni novi poslovni entiteti niti novi statusi.

## 2. Tabele

Pocetna PostgreSQL sema sadrzi:

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

## 3. Finansijski podaci

Svi novcani iznosi koriste `numeric(18,2)`.

Saldo se ne cuva kao slobodna vrednost. Pocetni SQL dodaje view:

```sql
cashbox_balances
```

koji racuna stanje iz `cash_events` samo za statuse `POSTED` i `LOCKED`.

## 4. Integritet

Dodati su:

- primary key constraint-i,
- foreign key constraint-i gde relacije postoje u kodu,
- check constraint-i za postojece statuse i enum vrednosti,
- partial unique index za jednu otvorenu smenu po blagajni,
- partial unique index za aktivni dnevni zakljucak po datumu/blagajni/valuti,
- append-only trigger za `audit_log`.

## 5. Namerno odlozeno

Nije jos dodato:

- RLS policy,
- SQL RPC funkcije za poslovne transakcije,
- migracioni staging schema,
- storage bucket,
- realni import podataka iz Google Sheets,
- idempotency tabela.

Ovo ide tek posle dodatne API contract razrade i test fixture-a.

