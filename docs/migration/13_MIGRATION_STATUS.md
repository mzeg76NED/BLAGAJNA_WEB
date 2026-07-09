# Migration Status

Datum poslednjeg azuriranja: 2026-07-09

## FAZA 0 - tehnicki inventar postojeceg sistema

Status: IN PROGRESS

Sta je uradjeno:

- Procitan korisnicki migracioni dokument `CODEX_FULL_MIGRACIJA_BLAGAJNA_WEB_CLOUDFLARE_SUPABASE.md`.
- Procitan prethodno generisani tehnicki inventar `docs/25_MIGRACIJA_CLOUDFLARE_SUPABASE_TEHNICKI_INVENTAR.md`.
- Potvrdjeno da je aktivni repo `C:\Users\milan\source\repos\BLAGAJNA_WEB`.
- Dodati pocetni FAZA 0 dokumenti u `docs/migration/`.
- Izvuceni su glavni API wrapper-i iz `WebApp.gs`.
- Evidentirani su frontend `callApi`, `v2CallApi` i `google.script.run` oslonci.
- Evidentirani su postojece tabele, workflow-i i target arhitektura.

Sta nije uradjeno:

- Nije kreiran Supabase projekat.
- Nije kreiran `supabase/` folder.
- Nije pisana SQL migracija.
- Nije izdvojen frontend iz Apps Script-a.
- Nisu menjani Apps Script `.gs` fajlovi.
- Nisu menjani postojeci HTML/CSS/JS fajlovi.
- Nije uradjen runtime test nad Google Sheets bazom.
- Nije uradjen deploy.

Izmenjeni fajlovi:

- Nema izmena postojecih fajlova.

Nove datoteke:

- `docs/migration/00_CURRENT_SYSTEM_INVENTORY.md`
- `docs/migration/01_GOOGLE_SCRIPT_RUN_MAP.md`
- `docs/migration/02_DATA_SOURCE_INVENTORY.md`
- `docs/migration/03_WORKFLOW_INVENTORY.md`
- `docs/migration/04_TARGET_ARCHITECTURE.md`
- `docs/migration/13_MIGRATION_STATUS.md`

Migracije baze:

- Nema.

Testovi:

- U ovom batch-u samo staticka provera fajlova.

Otvoreni rizici:

- Potrebno je runtime citanje realne Google Sheets baze za broj redova i data-quality kontrole.
- Potrebno je dodatno razloziti svaki `api*` wrapper po parametrima, response shape-u, tabelama i audit efektima.
- Postoje direktni `google.script.run` blokovi pored centralnog `callApi` helpera.
- Postoje dva desktop UI toka: `desktop` i `desktop-v2`.

Sledeci korak:

- FAZA 0 ostaje otvorena za detaljniju API contract razradu po modulima.

## FAZA 1 - ciljna arhitektura i migracioni plan

Status: IN PROGRESS

Sta je uradjeno:

- Napravljen pocetni dokument `docs/migration/04_TARGET_ARCHITECTURE.md`.
- Definisan kontrolisani pristup: Cloudflare Pages frontend, server API sloj, Supabase PostgreSQL, legacy Apps Script kao trenutni source of truth.
- Definisano da dokumenti u prvoj funkcionalnoj migraciji mogu ostati na Google Drive adapteru dok se posebno ne odobri storage migracija.

Sta nije uradjeno:

- Nije izabran konacni backend runtime izmedju Cloudflare Pages Functions i Supabase Edge Functions za sve module.
- Nije povezan Cloudflare projekat.
- Nije konfigurisan domen.

Izmenjeni fajlovi:

- `docs/migration/04_TARGET_ARCHITECTURE.md`

Migracije baze:

- Nema deploy-ovane migracije.

Testovi:

- Staticka provera dokumentacije.

Otvoreni rizici:

- Treba potvrditi operativnu odluku gde ce ziveti poslovni API: Cloudflare Functions ili Supabase Edge Functions.

Sledeci korak:

- Nastaviti sa FAZOM 2 bazne osnove i lokalnim proverama skeleton-a.

## FAZA 2 - Supabase i PostgreSQL osnova

Status: IN PROGRESS

Sta je uradjeno:

- Kreiran `supabase/` skeleton.
- Kreiran `supabase/config.toml`.
- Kreirana pocetna SQL migracija `supabase/migrations/202607090001_initial_schema.sql`.
- Kreiran `supabase/seed.sql` za valute, role i privilegije.
- Dopunjen `supabase/seed.sql` za `role_permissions` na osnovu legacy `ROLE_PRIVILEGES` fallback matrice.
- Rucno je primenjen `role_permissions` seed kroz Supabase SQL Editor.
- Potvrdjen broj redova: `role_permissions = 122`.
- Dodat rucni bootstrap template za realne korisnike i blagajne: `supabase/templates/bootstrap_auth_cashbox_template.sql`.
- Bootstrap template dopunjen je SQL generisanjem `pin_salt` i `pin_hash` preko `pgcrypto.digest`.
- Kreiran dokument `docs/migration/05_DATABASE_MODEL.md`.
- Kreiran dokument `docs/migration/06_API_CONTRACTS.md`.
- Kreiran dokument `docs/migration/07_AUTH_AND_SESSION_MODEL.md`.

Sta nije uradjeno:

- Nije izvrsen import realnih podataka.
- Nisu kreirane RLS policy.
- Nisu kreirane SQL RPC funkcije za poslovne transakcije.
- Nije kreirana staging schema za migraciju podataka.
- Nisu seed-ovani realni korisnici i cashbox-i.

Izmenjeni fajlovi:

- `.gitignore`
- `.env.example`
- `supabase/seed.sql`

Nove datoteke:

- `supabase/config.toml`
- `supabase/migrations/202607090001_initial_schema.sql`
- `supabase/seed.sql`
- `supabase/templates/bootstrap_auth_cashbox_template.sql`
- `docs/migration/05_DATABASE_MODEL.md`
- `docs/migration/06_API_CONTRACTS.md`
- `docs/migration/07_AUTH_AND_SESSION_MODEL.md`

Migracije baze:

- `202607090001_initial_schema.sql` je dodata u repo i primenjena na Supabase remote.
- `npx supabase migration list` po korisnickoj potvrdi pokazuje `Local 202607090001 = Remote 202607090001`.

Testovi:

- Supabase CLI nije globalno u PATH-u, ali radi preko `npx supabase`.
- Pocetna migracija je primenjena na remote projekat `jxlztevomgwhttmawblz`.
- `npx supabase migration list` je prosao i vratio `Local 202607090001 = Remote 202607090001`.
- Rucna SQL provera posle seed-a: `role_permission_count = 122`.
- Tajni podaci nisu pronadjeni u novim migracionim fajlovima; pretraga je nasla samo ocekivane env nazive, dokumentaciju i schema/TODO polja za `pin_hash` i `pin_salt`.
- Ne koristiti Docker-dependent komande u trenutnom okruzenju.
- Ne koristiti `npx supabase db seed`; CLI 2.109.1 nema tu podkomandu.

Otvoreni rizici:

- Foreign key relacije su dodate tamo gde postoje u kodu, ali import realnih legacy podataka moze otkriti nekonzistentne stare redove.
- Pocetni korisnici i osnovne blagajne nisu automatski seed-ovani jer nisu potvrdjeni svi realni poslovni podaci i PIN hash/salt.

Sledeci korak:

- Potvrditi realne bootstrap podatke za prvi `ADMIN` i osnovni `cashbox`, pa runtime testirati auth endpoint-e.

## FAZA 3 - frontend izdvajanje iz Apps Script runtime-a

Status: STARTED

Sta je uradjeno:

- Kreiran minimalni Cloudflare Pages skeleton u `web/`.
- Kreiran staticki migracioni shell: `web/public/index.html`, `web/public/styles.css`, `web/public/app.js`.
- Pocetni shell je prebacen u prvi operativni frontend tok: login, session restore, logout i read-only lista blagajni.
- Frontend prikazuje i read-only listu mojih aktivnih smena.
- Frontend ima formu za otvaranje smene.
- Frontend ima osnovnu formu za zatvaranje aktivne smene za seed valute RSD/EUR.
- Cloudflare build sada renderuje postojeći Apps Script frontend iz `src/html`.
- Podrazumevani Cloudflare prikaz je postojeći `desktop`, dok je `desktop-v2` dostupan kao posebna opcija.
- Dodat je Cloudflare `google.script.run` kompatibilni adapter za postepenu migraciju backend funkcija.
- Frontend koristi `sessionStorage` kljuc `BLAGAJNA_APP_SESSION_ID`.
- Frontend salje sesiju kroz `X-App-Session-Id` header.
- Kreiran Cloudflare Pages Functions health endpoint: `web/functions/api/health.js`.
- Kreiran status endpoint: `web/functions/api/status.js`.
- Kreiran auth/session adapter za proveru sesije: `web/functions/api/auth/session.js`.
- Kreiran auth/check adapter za proveru sesije i privilegija: `web/functions/api/auth/check.js`.
- Kreiran auth/login adapter: `web/functions/api/auth/login.js`.
- Kreiran auth/logout adapter: `web/functions/api/auth/logout.js`.
- Kreiran auth/switch-user adapter: `web/functions/api/auth/switch-user.js`.
- Auth helper sada podrzava PIN proveru kompatibilnu sa legacy SHA-256 modelom, neuspele pokusaje, privremeno zakljucavanje, kreiranje/zatvaranje sesije i audit upise.
- Kreiran prvi read-only poslovni adapter: `web/functions/api/cashboxes.js`.
- Kreiran prvi read-only adapter za smene: `web/functions/api/shifts/mine/active.js`.
- Kreiran prvi write adapter za smene: `web/functions/api/shifts/open.js`.
- Kreiran prvi write adapter za zatvaranje smene: `web/functions/api/shifts/close.js`.
- Kreiran read-only adapter za stanje blagajne: `web/functions/api/cashbox-balance.js`.
- Kreirani read-only report adapteri: `web/functions/api/reports/cashbox-balance.js`, `web/functions/api/reports/cash-movements.js`.
- Kreirani migracioni adapteri za naloge koji čekaju isplatu, slanje blagajniku, odbijanje i izvršenje pending isplate.
- Dopunjen adapter za postojeće pozive `apiOpenShiftWithOpeningCount`, `apiListPendingPaymentOrderOutflows`, `apiCreateCashInflow`, `apiCreateTreasuryHandover`.
- Kreirani cash event adapteri za direktnu uplatu i predaju u trezor.
- Kreirani zajednicki adapter helperi u `web/functions/_lib/`.
- Kreiran `package.json` sa osnovnim build/check skriptama.
- `package.json` je oznacen sa `"type": "module"` zbog Cloudflare ES module handlera.
- Kreiran `.env.example` bez tajni.

Sta nije uradjeno:

- Postojeci Apps Script frontend nije prebacen.
- `google.script.run` nije zamenjen u legacy UI-ju.
- Nije uveden kompletan API adapter.
- Login/logout/switch-user endpoint-i nisu runtime testirani protiv realne Supabase sesije.
- Nije pokrenut Cloudflare deploy.
- Novi frontend tok nije testiran preko lokalnog Wrangler runtime-a zbog Windows out-of-memory problema; testirati samo preko deploy okruzenja ili direktnih HTTP endpoint-a.

Izmenjeni fajlovi:

- `.gitignore`
- `package.json`
- `web/public/index.html`
- `web/public/styles.css`
- `web/public/app.js`

Nove datoteke:

- `package.json`
- `.env.example`
- `web/build.mjs`
- `web/public/index.html`
- `web/public/styles.css`
- `web/public/app.js`
- `web/public/_redirects`
- `web/functions/api/health.js`
- `web/functions/api/status.js`
- `web/functions/api/auth/session.js`
- `web/functions/api/auth/check.js`
- `web/functions/api/auth/login.js`
- `web/functions/api/auth/logout.js`
- `web/functions/api/auth/switch-user.js`
- `web/functions/api/cashboxes.js`
- `web/functions/api/shifts/open.js`
- `web/functions/api/shifts/close.js`
- `web/functions/api/shifts/mine/active.js`
- `web/functions/api/cashbox-balance.js`
- `web/functions/api/reports/cashbox-balance.js`
- `web/functions/api/reports/cash-movements.js`
- `web/functions/api/payment-orders/waiting.js`
- `web/functions/api/payment-orders/send-to-cashier.js`
- `web/functions/api/payment-orders/reject.js`
- `web/functions/api/payment-orders/execute-pending.js`
- `web/functions/api/payment-orders/pending-outflows.js`
- `web/functions/api/cash-events/inflow.js`
- `web/functions/api/cash-events/treasury-handover.js`
- `web/functions/_lib/api.js`
- `web/functions/_lib/auth.js`
- `web/functions/_lib/supabase.js`

Migracije baze:

- Nema frontend migracija baze.

Testovi:

- `node --check web/build.mjs` je prosao.
- `node --check web/functions/api/health.js` je prosao.
- `node --check web/functions/api/status.js` je prosao.
- `node --check web/functions/api/auth/session.js` je prosao.
- `node --check web/functions/api/auth/check.js` je prosao.
- `node --check web/functions/api/auth/login.js` je prosao.
- `node --check web/functions/api/auth/logout.js` je prosao.
- `node --check web/functions/api/auth/switch-user.js` je prosao.
- `node --check web/functions/api/cashboxes.js` je prosao.
- `node --check web/functions/api/shifts/open.js` je prosao.
- `node --check web/functions/api/shifts/close.js` je prosao.
- `node --check web/functions/api/shifts/mine/active.js` je prosao.
- `node --check web/functions/api/cashbox-balance.js` je prosao.
- `node --check web/functions/api/reports/cashbox-balance.js` je prosao.
- `node --check web/functions/api/reports/cash-movements.js` je prosao.
- `node --check web/functions/api/payment-orders/waiting.js` je prosao.
- `node --check web/functions/api/payment-orders/send-to-cashier.js` je prosao.
- `node --check web/functions/api/payment-orders/reject.js` je prosao.
- `node --check web/functions/api/payment-orders/execute-pending.js` je prosao.
- `node --check web/functions/api/payment-orders/pending-outflows.js` je prosao.
- `node --check web/functions/api/cash-events/inflow.js` je prosao.
- `node --check web/functions/api/cash-events/treasury-handover.js` je prosao.
- `node --check web/functions/_lib/api.js` je prosao.
- `node --check web/functions/_lib/auth.js` je prosao.
- `node --check web/functions/_lib/supabase.js` je prosao.
- `node --check web/public/app.js` je prosao.
- `node web/build.mjs` je prosao i generisao `web/dist`.
- `npx supabase migration list` je prosao i potvrdio `Local 202607090001 = Remote 202607090001`.
- Remote REST provera preko `web/.dev.vars` je potvrdila: `roles = 8`, `permissions = 36`, `role_permissions = 122`, `currencies = 2`, `users = 1`, `cashboxes = 1`, `app_sessions = 2`, `audit_log = 2`.
- Runtime smoke preko Cloudflare handlera je prosao: aktivna sesija postoji, `/api/auth/session` vraca aktivnog `ADMIN` korisnika, `/api/cashboxes` vraca `count = 1`.
- Git nije dostupan u trenutnom shell-u, pa commit nije uradjen.

Otvoreni rizici:

- Shell je samo pocetna tehnicka osnova, ne funkcionalna zamena postojece aplikacije.
- Legacy Apps Script ostaje source of truth.
- Runtime test je potvrdio auth/session, read-only cashboxes adapter i read-only mine active shifts adapter.
- `POST /api/shifts/open` nije runtime testiran automatski jer otvara stvarnu smenu u Supabase bazi.
- `POST /api/shifts/close` nije runtime testiran automatski jer menja stvarnu smenu u Supabase bazi.
- `cash movements` report trenutno cita samo `cash_events`; `cash_counts` deo legacy izveštaja ostaje sledeći migracioni korak.
- Payment order write adapteri nisu automatski runtime testirani jer kreiraju ili knjiže stvarne poslovne zapise.
- Direktna uplata i trezor adapteri nisu automatski runtime testirani jer knjiže stvarne cash event zapise.
- Lokalni Wrangler runtime se ne koristi zbog stabilnosti masine.

Sledeci korak:

- Rucno testirati otvaranje i zatvaranje smene preko Cloudflare Pages okruzenja, zatim proveriti audit zapis.
