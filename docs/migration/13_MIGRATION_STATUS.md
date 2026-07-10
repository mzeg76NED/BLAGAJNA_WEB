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

## FAZA 3b - Korisnici i prava (2026-07-09, Claude/Cowork sesija)

Status: IN PROGRESS

Sta je uradjeno:

- Popravljen kriticni bag u `src/html/scripts.html`: `refreshBalance_()` se trajno blokirala kad se optimisticki unos ne pomiri sa serverom (`hasPendingOptimisticForSession_()` nije imao TTL). Dodat `__addedAt` timestamp i `OPTIMISTIC_STALE_GUARD_MS` guard.
- Popravljen race-condition bag "Korisnici i prava" (lazna poruka o nedostatku ovlascenja) u `loadDesktopUsersAdmin_()` - sada ceka da se `uiState.currentUser` popuni pre nego sto proveri privilegije.
- Implementirani novi backend adapteri: `web/functions/_lib/permissions.js`, `web/functions/_lib/users.js`, `web/functions/api/users/list.js`, `web/functions/api/users/create.js`, `web/functions/api/users/update-permissions.js`, `web/functions/api/users/reset-pin.js`, `web/functions/api/roles/permissions-matrix.js`, `web/functions/api/roles/update-permissions.js`.
- Dopunjen `_lib/auth.js` sa `hashUserPin` (export), `makeSalt`, `userHasPrivilege`, `userHasAnyPrivilege`.
- Dopunjen `web/public/cloudflare-apps-script-adapter.js` sa handlerima za `apiListUsers`, `apiCreateUser`, `apiUpdateUserPermissions`, `apiResetUserPin`, `apiGetRolePermissionsMatrix`, `apiUpdateRolePermissions`.

Sta nije uradjeno:

- `apiListRoles`, `apiListPermissions`, `apiPrepareUsersForAppLogin`, `apiGetPermissionsMatrix` nisu migrirani (trenutni frontend ih ne poziva direktno).
- Nije runtime testirano preko Cloudflare Pages okruzenja (samo staticka provera koda) - build/deploy/git commit ostaje na korisniku u ovoj sesiji (shell u ovoj sesiji vidi zastarelu kopiju repoa).

Sledeci korak:

- Korisnik radi `git add/commit/push`, Cloudflare Pages build, i manuelno testira ekran "Korisnici i prava" (lista, kreiranje, izmena, reset PIN-a, matrica prava po roli).
- Nakon toga nastaviti sa "Zahtevi za isplatu" (Payment Requests) modulom.

## FAZA 3c - Zahtevi za isplatu i Nalozi za isplatu (2026-07-09/10, Claude/Cowork sesija)

Status: IN PROGRESS

Sta je uradjeno:

- Popravljen `apiGetCashbookFilterOptions` (nedostajao je posle prve runde) - novi `web/functions/api/cashbook/filter-options.js`.
- Novi deljeni moduli: `web/functions/_lib/audit.js` (generic `insertAuditLog`), `web/functions/_lib/paymentRequests.js`, `web/functions/_lib/paymentOrders.js` (core poslovna logika, bez GAS/Sheets "misalignment repair" sloja koji u Postgresu nije potreban).
- Novi Payment Requests endpoint-i: `create`, `submit`, `update`, `list-mine`, `list-for-approval`, `list`, `approve`, `reject`, `return-for-correction` (`web/functions/api/payment-requests/*`).
- Novi Payment Orders endpoint-i: `create-from-request`, `create-direct`, `update-draft`, `issue`, `list`, `timeline`, `approve-and-issue`, `repair-cashbox` (`web/functions/api/payment-orders/*`).
- Adapter (`web/public/cloudflare-apps-script-adapter.js`) povezan na sve gornje, plus `apiGetCashbookFilterOptions`.
- `repair-cashbox` je namerno pojednostavljen (samo prijavljuje naloge sa praznim/`FROM_REQUEST` cashbox_id) jer Postgres ima tipizovane kolone i ne može da ima Sheets-stil "shifted row" korupciju koju je originalna GAS funkcija popravljala.

Sta nije uradjeno:

- `createPaymentOrderFromRequestCore` / `assertNoActiveOrderForRequest` nemaju pravu DB transakciju ni advisory lock (GAS je koristio `LockService`); postoji mali race-condition prozor kod paralelnog kreiranja naloga iz istog zahteva. Prihvatljivo za pilot obim, ali treba SQL RPC funkciju sa transakcijom za pravu zaštitu.
- `markPaymentOrderClosed`, `cancelPaymentOrder`, `cancelPaymentRequest`, `reverseCashEvent`, dokumenti (Documents.gs), Cash Counts (Presek stanja), Daily Closing, Reports (dashboard/cash-sheet/audit-exceptions/itd.), Audit Log nisu migrirani.
- Nije runtime testirano preko Cloudflare Pages okruzenja (samo staticka provera koda protiv postojecih endpoint-a i schema constraint-a).

Sledeci korak:

- Korisnik testira ceo tok: kreiranje zahteva → slanje → (auto-nalog ako je u limitu, ili odobravanje pa nalog) → slanje blagajni → izvršenje.
- Nakon potvrde, nastaviti sa "Presek stanja" (Cash Counts) modulom.

## FAZA 3d - Direktna isplata bez naloga (2026-07-10, Claude/Cowork sesija)

Status: DONE

Kontekst: Zahtev-Nalog-Isplata tok je potvrdjen kao funkcionalan ("sve radi"). Korisnik je eksplicitno trazio da se pored toga otkljuca i direktna isplata (bez naloga), analogno vec postojecim direktnim Uplata/Trezor akcijama za glavnog blagajnika otvorene smene. Ovo je namerna promena poslovnog pravila (ranije je "Isplata" dugme bilo trajno onemoguceno u UI-ju - `hasDisabled`/`showDirectOutflowDisabledMessage_` - jer je originalni GAS dizajn zahtevao da svaka isplata ide kroz Zahtev → Nalog → pending ISPLATA izvrsenje).

Sta je uradjeno:

- Novi endpoint `web/functions/api/cash-events/outflow.js` (POST) - direktan CASH_OUTFLOW cash event, po uzoru na `cash-events/inflow.js` i `cash-events/treasury-handover.js`: zahteva privilegiju `cash_events:create`, otvorenu smenu trenutnog korisnika i da iznos ne prelazi zivi `cashbox_balances` saldo blagajne.
- Adapter (`web/public/cloudflare-apps-script-adapter.js`) - dodat `apiCreateCashOutflow` handler koji zove novi endpoint.
- `scripts.html` - uklonjeno trajno `disabled`/`showDirectOutflowDisabledMessage_` ponasanje za: `d-side-btn-isplata`, `d-qf-type-out`, `d-shift-action-out`, `m-btn-isplata`, `m-shift-action-out`, mobilni "sheet" OUT tip. Sve sada koriste isti gejt kao Uplata/Trezor (`canPostDirectCashEvents_()` - otvorena smena + glavni blagajnik smene) i zovu `apiCreateCashOutflow`. Client-side provera salda (`assertClientSideCashAmount_`) vec je postojala i radi bez izmena.
- `desktop.html` / `mobile.html` - uklonjeni hard-kodirani `disabled`/`title="Direktna isplata bez naloga..."` atributi sa isplata dugmadi i azuriran prateci info tekst (vise ne pominje da isplata ide iskljucivo kroz nalog).
- `desktop-v2.html` / `scripts-v2.html` (alternativni, trenutno ne-podrazumevani UI) namerno NISU dirani - build.mjs i dalje generise `index.html`/`desktop.html` sa view-om `desktop` (klasicni scripts.html), ne `desktop-v2`.

Sta nije uradjeno:

- `desktop-v2.html`/`scripts-v2.html` i dalje imaju staro, onemoguceno "Isplata" dugme - relevantno samo ako se ta alternativna UI ikad ukljuci kao podrazumevana.
- Nije dodata posebna, uza privilegija za direktnu isplatu (npr. `cash_events:create_outflow`) - ponovo je iskoriscena postojeca `cash_events:create` (ista privilegija koja vec pokriva direktnu uplatu), radi konzistentnosti sa `inflow.js`.

Sledeci korak:

- Korisnik testira direktnu isplatu na live sajtu (Knjiga → Isplata, i "Nova isplata" na strani smene) i potvrdjuje da se saldo ispravno umanjuje i da se audit log zapis pravi.
- Nastaviti sa "Presek stanja" (Cash Counts) modulom.

## FAZA 3e - Ispravka prikaza stanja blagajne (2026-07-10, Claude/Cowork sesija)

Status: DONE

Kontekst: Korisnik je slikom prijavio da "Stanje blagajne" (gornji realtime iznos) i kolona "Stanje" u Knjizi uvek pokazuju 0,00, bez obzira na promet, sto je i blokiralo direktnu isplatu (klijentska provera protiv raspolozivog stanja je uvek videla 0).

Sta je uradjeno:

- `web/functions/api/reports/cash-movements.js` - `running_balance` je bio hardkodiran na `null` za svaki red (nikad izracunat). Dodata `fetchRunningBalances()` koja povlaci celu istoriju POSTED/LOCKED dogadjaja za blagajnu+valutu, racuna kumulativni saldo hronoloski i mapira ga nazad na redove u odgovoru. Takodje popravljeno da se `limit` primenjuje POSLE filtriranja po datumu (ranije je mogao da odseče stavke unutar opsega ako blagajna ima vise dogadjaja od `limit`).
- `web/public/cloudflare-apps-script-adapter.js` - `apiCalculateCashboxBalance` je vracao ceo objekat sa servera (`{balance, balanceByCurrency, ...}`) umesto broja, pa je `Number(objekat)` u `scripts.html` uvek davalo `NaN → 0`. Sada vraca `response.balance`.
- Dodat `web/public/_headers` sa `Cache-Control: no-cache, no-store, must-revalidate` za sve fajlove - koreni uzrok zasto se `cloudflare-apps-script-adapter.js` ponasao kao da promene nisu deploy-ovane (HTML se osvezavao, odvojeni `.js` fajl je ostajao keširan u browseru/CDN-u bez cache-busting mehanizma).

Sledeci korak:

- Korisnik potvrdjuje (posle hard refresh-a) da se "Stanje blagajne" i kolona "Stanje" ispravno azuriraju.

## FAZA 3f - Presek stanja / Cash Counts (2026-07-10, Claude/Cowork sesija)

Status: DONE

Sta je uradjeno:

- Procitana legacy logika `src/CashCounts.gs` (`createCashCounts`, `createCashCountRecord_`, `getCashCountsReport`) i postojeca Postgres sema (`cash_counts` tabela, vec definisana u `202607090001_initial_schema.sql`).
- Novi modul `web/functions/_lib/cashCounts.js` (core poslovna logika, bez GAS/Sheets "misalignment repair" sloja):
  - `createCashCountsCore` - grupise apoene po valuti (`include_all_currencies` dodaje sve aktivne valute i za valute bez unetih apoena), zahteva aktivnu smenu za blagajnu (izuzev `SHIFT_OPENING` tipa), snapshot-uje stanje SVIH valuta pre nego sto se bilo koja korekcija proknjizi (kao i legacy `calculateCashboxBalances`), i za svaku valutu: racuna `counted_cash_total`, `difference` (popisano - zivo stanje), i ako je razlika != 0 automatski knjizi CORRECTION cash event (VISAK/MANJAK, isti opis format kao legacy) pre nego sto upise `cash_counts` red sa `adjustment_event_id`.
  - `getCashCountsReportCore` - flat lista cash_counts redova (frontend `groupCashCounts_` u `scripts.html` vec grupise klijentski po vremenu+korisniku+tipu+smeni+napomeni - nije menjano).
- Novi endpoint-i: `web/functions/api/cash-counts/create.js` (POST), `web/functions/api/cash-counts/list.js` (GET) - koriste vec postojecu privilegiju `shifts:count` (vec dodeljena ADMIN/FINANCE/CASHIER_SUPERVISOR/CASHIER u seed.sql, tacno isti skup rola kao legacy `CASH_COUNT_ROLES_`).
- Adapter (`cloudflare-apps-script-adapter.js`) - dodati `apiCreateCashCounts` i `apiGetCashCountsReport` handleri.

Sta nije uradjeno:

- `apiOpenShiftWithOpeningCount` i `apiCloseShiftWithClosingCount` u adapteru i dalje NE kreiraju pravi apoenski `cash_counts` zapis (opening je markiran `countSkipped: true`, closing samo salje `physical_balance_json` bez denominacija) - namerno ostavljeno netaknuto u ovoj rundi da se ne rizikuje vec ispravan tok otvaranja/zatvaranja smene. Sledeci korak (ako se zeli) je da se ove dve funkcije provuku kroz `createCashCountsCore` sa `count_type: 'SHIFT_OPENING'`/`'SHIFT_CLOSING'` PRE nego sto se smena zatvori (mora pre, jer posle zatvaranja vise nema aktivne smene za validaciju).
- Nije runtime testirano preko Cloudflare Pages okruzenja.

Sledeci korak:

- Korisnik push-uje i testira ceo Presek stanja tok: otvaranje dijaloga → unos apoena → cuvanje preseka → provera da se KOREKCIJA cash event pravilno knjizi kad ima razlike i da se lista preseka ispravno prikazuje i grupise po valutama.
- Po potvrdi, razmotriti da se shift open/close takodje poveze na pravi apoenski presek (trenutno "countSkipped").

## FAZA 3g - Izveštaji (Reports) + Audit log (2026-07-10, Claude/Cowork sesija)

Status: DONE (osnovni izveštaji), Blagajnički list i dalje nije migriran

Kontekst: "Izveštaji" meni ima 11 razlicitih tipova izvestaja (`loadReport('apiGetXReport', ...)` pozivi u scripts.html) - od toga je pre ove runde bio migriran samo `apiGetCashboxBalanceReport` i `apiGetCashMovementsReport`. `apiGetAuditLog` je bio trajno stubovan da vraca `[]`.

Sta je uradjeno:

- Procitan ceo `src/Reports.gs` (svih ~11 izvestaja + `getManagementDashboardSummary` + `getCashSheetReport`) radi vernog portovanja filtera/polja.
- Novi modul `web/functions/_lib/reports.js` - jezgro za: `getOpenPaymentRequestsReportCore`, `getRequestsForApprovalReportCore`, `getOrdersWaitingPaymentReportCore`, `getExecutedPaymentsReportCore`, `getDailyClosingReportCore`, `getDifferencesReportCore` (uklucuje i smene sa razlikom iz `difference_json`), `getCorrectionsAndReversalsReportCore`, `getMissingDocumentsReportCore`, `getAuditExceptionsReportCore`, `getAuditLogCore`, `getManagementDashboardSummaryCore`. `scopeCashboxForUser` replicira legacy `normalizeReportFilters_` pravilo da CASHIER moze da vidi izvestaje samo za svoju podrazumevanu blagajnu.
- Novi endpoint-i: `web/functions/api/reports/{open-payment-requests,requests-for-approval,orders-waiting-payment,executed-payments,daily-closing,differences,corrections-reversals,missing-documents,audit-exceptions,management-dashboard-summary}.js` + `web/functions/api/audit-log.js` (van `reports/`, sopstveni resurs).
- Adapter dobio handlere za svih 10 novih izvestaja + pravi `apiGetAuditLog` (vise ne vraca prazan niz).
- Privilegije: iskoriscene POSTOJECE (bez seed migracije) - `payment_requests:view_all`, `payment_orders:view`, `cash_events:view`, `shifts:view`, `documents:view`, `audit:view` - po resursu koji izvestaj cita. Napomena: legacy `REPORT_VIEW_ROLES_` (ADMIN/DIRECTOR/FINANCE/CASHIER_SUPERVISOR/CASHIER) se ne poklapa savrseno ni sa jednom pojedinacnom Postgres privilegijom (npr. DIRECTOR nema `cash_events:view` u seed.sql), pa neki izvestaji mogu biti blazi/strozi po roli nego original za par ivicnih slucajeva - nije dodata nova privilegija da se ne dira seed/rola bez eksplicitnog zahteva.

Sta nije uradjeno:

- `getCashSheetReport` (Blagajnički list) NIJE migriran - najkompleksniji izvestaj (spaja smenu, cash movements, cash counts i "opening/closing balance snapshot" logiku); namerno odlozeno za posebnu rundu.
- ~~`apiCreateDailyClosing` (kreiranje dnevnog zakljucka) nije migrirano - frontend trenutno nema poziv za kreiranje (samo za pregled)~~ **ISPRAVKA (FAZA 3i)**: ova tvrdnja je bila pogresna. `d-daily-close-form`/`m-daily-close-form` STVARNO postoje u `desktop.html`/`mobile.html` i pozivaju `apiCloseDailyCashbox` - implementirano u FAZA 3i.
- Documents.gs (upload/attach dokumenata) i dalje nije migriran - `getMissingDocumentsReportCore` ce raditi ispravno, ali "Nedostajuci dokumenti" ce uvek biti prazno dok ne postoji nacin da se document_status='MISSING' uopste postavi kroz UI.
- Nije runtime testirano preko Cloudflare Pages okruzenja.

Sledeci korak:

- Korisnik push-uje i testira "Izveštaji" meni (svih 10 tabova) i "Audit log" stranicu.
- Sledeci veci moduli za migraciju: Blagajnički list (`getCashSheetReport`), Dnevni zaključak (kreiranje), Documents (upload/attach), cancel/reverse akcije (`cancelPaymentRequest`, `cancelPaymentOrder`, `reverseCashEvent`, `markPaymentOrderClosed`).

## FAZA 3h - Otvaranje/zatvaranje smene (pravi presek) + Storno stavke (2026-07-10, Claude/Cowork sesija)

Status: DONE

Kontekst: Korisnik je eksplicitno trazio da se otvaranje i zatvaranje smene "obavezno" sredi. Analizom je nadjeno da je zatvaranje smene bilo STVARNO POKVARENO za svaki slucaj kad korisnik unosi apoene (a ne jedan rucni total): `apiCloseShiftWithClosingCount` u adapteru nikad nije citao `data.denominations` (samo `data.currency`+`data.counted_cash_total` ili vec gotov `data.physical_balance_json`, od kojih ni jedno standardni closing formular ne salje), pa je `/api/shifts/close` uvek dobijao prazan `physical_balance_json` i odbijao zahtev gresku "Physical balance is missing currency" za svaku aktivnu valutu.

Sta je uradjeno:

- `apiOpenShiftWithOpeningCount` (adapter) - posle uspesnog `/api/shifts/open`, sad zove `apiCreateCashCounts` (postojeci endpoint iz FAZA 3f) sa `count_type: 'SHIFT_OPENING'` da upise pravi presek u `cash_counts`. Best-effort (try/catch) - ako presek ne uspe, smena ostaje otvorena i korisnik moze da radi dalje (moze naknadno da uradi presek preko "Presek stanja").
- `apiCloseShiftWithClosingCount` (adapter) - sad prvo nadje aktivnu smenu, zatim (ako ima apoena) zove `apiCreateCashCounts` sa `count_type: 'SHIFT_CLOSING'` DOK je smena jos otvorena (mora pre zatvaranja jer `createCashCountsCore` zahteva aktivnu smenu za taj tip), pa iz vracenih `counted_total` po valuti sastavi ispravan `physical_balance_json` (pokriva SVE aktivne valute, jer closing formular vec salje `include_all_currencies: true`) i tek onda zove `/api/shifts/close`. Ovo NIJE best-effort - ako presek ne uspe, zatvaranje se prekida (ne sme da se zatvori smena sa netacnim/nedostajucim fizickim stanjem).
- Novi endpoint `web/functions/api/cash-events/reverse.js` - "Storno" akcija (jedina cancel/reverse funkcija koja je STVARNO ozicena na UI - dugme u detalju stavke u Knjizi, desktop i mobile). Port `reverseCashEvent`/`assertCashEventCanBeReversed_` iz `CashEvents.gs`: pravi REVERSAL cash event sa suprotnim smerom (original se ne brise, samo status → REVERSED), koristi postojecu privilegiju `cash_events:reverse`, i dodatno zahteva ADMIN/FINANCE rolu za storno LOCKED stavke (ne samo privilegiju), tacno kao legacy.
- Adapter dobio `apiReverseCashEvent` handler.

Sta nije uradjeno:

- `cancelPaymentRequest`, `cancelPaymentOrder`, `markPaymentOrderClosed` NISU migrirani - proveren ceo `scripts.html` i frontend NIGDE ne poziva ove funkcije (nema dugmadi za njih), pa bi implementacija bila mrtav kod. Ako se doda UI za njih kasnije, logika je vec dokumentovana ovde (iz `PaymentRequests.gs`/`PaymentOrders.gs`) za brzo portovanje.
- Nije runtime testirano preko Cloudflare Pages okruzenja.

Sledeci korak:

- Korisnik push-uje i OBAVEZNO testira: otvaranje smene sa unetim apoenima, zatvaranje smene sa unetim apoenima (i sa i bez razlike), i storno stavke iz Knjige.
- Nastaviti sa: Blagajnički list, Dnevni zaključak (kreiranje), Documents (upload/attach).

## FAZA 3i - Zavrsetak "smene" modula: istorija smena + Dnevni zakljucak (2026-07-10, Claude/Cowork sesija)

Status: DONE

Kontekst: Korisnik je eksplicitno trazio da se do kraja zavrse SVI API pozivi za cetiri prioritetna modula (nalozi za isplatu, zahtevi, smene, presek stanja). Nalozi, zahtevi i presek stanja su vec bili potpuno pokriveni (potvrdjeno diff-om adaptera protiv `scripts.html`). Za smene je audit (grep svakog `callApi('apiXxx', ...)` iz `scripts.html` protiv handlera u adapteru, uz proveru da li odgovarajuci HTML formular/dugme STVARNO postoji u `desktop.html`/`mobile.html`) nasao 2 prava, ziva nedostajuca poziva - ostatak (`apiGetShiftBalance`, `apiAttachDocumentToEntity`, `apiListDocumentsForEntity`, `apiListDailyClosings`, `apiGetMyActiveShifts`) je mrtav kod (nema HTML elementa koji ih poziva), a `apiHandoverShift` je namerno sakrivena funkcija (`m-handover-shift-form` je `hidden` i JS ga force-hide-uje) i nije diran.

Sta je uradjeno:

- Novi endpoint `web/functions/api/shifts/history.js` (GET, privilegija `shifts:view`) - port `apiGetShiftHistory` iz `WebApp.gs`: CASHIER (i ostale ne-elevated role) vidi samo smene koje je otvorio ili na koje je izvrsena primopredaja (`handover_to`), dok ADMIN/DIRECTOR/FINANCE/CASHIER_SUPERVISOR vide sve smene za trazenu blagajnu. Napaja "Smene" listu (`loadMyShiftsTo_` → `d-shifts-list`/`m-shifts-list`), koja se osvezava posle svake akcije nad smenom/preseku.
- Adapter dobio `apiGetShiftHistory` handler.
- Novi modul `web/functions/_lib/dailyClosing.js` - port `DailyClosing.gs` (`prepareDailyClosing`, `closeDailyCashbox`, `buildDailyClosingPreview_`): dnevni zakljucak NE pravi cash movement niti menja iznose - samo racuna opening/calculated balance za dan (iz POSTED/LOCKED dogadjaja pre datuma + POSTED dogadjaja na dan zatvaranja), racuna razliku prema unetom fizickom stanju, upisuje `daily_closing` red i "zakljucava" (LOCKED) ukljucene POSTED cash evente - isto ponasanje kao Storno-ova LOCKED gejta. Role provera je EKSPLICITNA (ne preko privilegije): pregled dozvoljen CASHIER_SUPERVISOR/FINANCE/DIRECTOR/ADMIN/CASHIER, a stvarno zakljucavanje dana SAMO CASHIER_SUPERVISOR/FINANCE/DIRECTOR/ADMIN (ne CASHIER) - namerno se NE koristi postojeca `shifts:close` privilegija jer je nju CASHIER takodje ima (za svoju smenu), sto bi mu pogresno dozvolilo i zakljucavanje dana.
- Novi endpoint-i `web/functions/api/daily-closing/prepare.js` (POST, samo pregled, ne upisuje nista) i `web/functions/api/daily-closing/close.js` (POST, upisuje `daily_closing` red i zakljucava dogadjaje). Zatvaranje dana odbija zahtev ako blagajna ima OTVORENU smenu (mora se prvo zatvoriti smena) i ako vec postoji ne-CANCELLED dnevni zakljucak za tu blagajnu/valutu/datum (unique index `daily_closing_active_unique_idx` je bekap na DB nivou).
- Adapter dobio `apiPrepareDailyClosing`/`apiCloseDailyCashbox` handlere, tacno prema pozicionim potpisima iz `scripts.html` (`[cashbox_id, currency, closing_date]` i `[cashbox_id, currency, closing_date, physical_balance, note]`).
- Ispravljena pogresna tvrdnja iz FAZA 3g (gore) da dnevni zakljucak nema poziv za kreiranje - forme `d-daily-close-form`/`m-daily-close-form` postoje i sad rade.

Sta nije uradjeno:

- Nema `LockService`-ekvivalentnog mehanizma za konkurentnost (Cloudflare Functions su per-request) - jedina zastita od race-a je DB unique index na `(closing_date, cashbox_id, currency)` gde `status <> 'CANCELLED'`, isto kao sto bi dva istovremena zahteva dobila 409 od Postgres-a ako `findDailyClosing` provera ne stigne prva.
- `lockDailyClosing`/`cancelDailyClosing` (administrativno zakljucavanje/otkazivanje vec zatvorenog dana) nisu migrirani - nema UI poziva za njih u `scripts.html`.
- `getCashSheetReport` (Blagajnički list) i dalje nije migriran.
- Documents.gs (upload/attach) i dalje nije migriran.
- Nije runtime testirano preko Cloudflare Pages okruzenja.

Sledeci korak:

- Korisnik push-uje i testira: "Smene" listu (da li se popunjava i filtrira ispravno za CASHIER vs elevated role), pregled dnevnog zakljucka (bez upisa), i stvarno zakljucavanje dana (proveriti da CASHIER dobija 403, da se dogadjaji tog dana zakljucaju/LOCKED, i da drugi pokusaj za isti datum/blagajnu/valutu vraca gresku "vec postoji").
- Sa ovim je "tu završi sve api pozive" zahtev za nalozi/zahtevi/smene/presek stanja zavrsen. Preostali veci moduli: Blagajnički list (`getCashSheetReport`), Documents (upload/attach).

## FAZA 3j - Ispravke iz produkcijskog testiranja: vreme, presek prikaz, deljena smena, mobilni (2026-07-10, Claude/Cowork sesija)

Status: DONE (za sve prijavljene probleme), runtime testiranje na korisniku

Kontekst: Korisnik je testirao live app i prijavio 4 konkretna problema sa slikom ekrana Preseka stanja: (1) vreme transakcija kasni ~3h, (2) "Očekivano" kolona u Apoenima Preseka je lažna/izmišljena, (3) svaki korisnik koji se uloguje pokreće/vidi SVOJU smenu umesto deljene smene po blagajni, (4) mobilni prikaz je "previše krupan" i korisnik dobija "sesija istekla" greške usred rada.

Sta je uradjeno:

1. **Vremenska zona (root cause, ne server bug)**: `formatTimeShort_` u `scripts.html` je regex-om (`text.match(/(\d{1,2}):(\d{2})/)`) izvlacio HH:MM direktno iz sirovog ISO UTC stringa (npr. `2026-07-10T07:42:00.000Z` → "07:42") umesto da prolazi kroz `new Date()` i koristi lokalno vreme pretraživaca (Europe/Belgrade). Ovo je bio uzrok da se u detaljima preseka prikazuje UTC vreme (05:42) dok je lista ispravno prikazivala lokalno vreme (07:42) - isti zapis, dva razlicita prikazana vremena, tacno kao na slici korisnika. Server je oduvek cuvao ispravan UTC `event_date`/`created_at`/`posted_at` - ovo je bio cisto frontend prikaz bug. `formatTimeShort_` sada uvek ide kroz `new Date(value).getHours()/getMinutes()`.
2. **Lažno "Očekivano" po apoenu**: `renderPresekApoeniTab_` je za svaki red apoena prikazivao "Očekivano" = ista vrednost kao "Popisano" (samo kopirano), i "Razlika" hardkodovano na `0,00` - jer ne postoji stvarni podatak o očekivanom broju komada po apoenu (samo ukupan očekivan iznos po valuti). Tabela po apoenu sada prikazuje samo stvarne podatke: Apoen/Komada/Iznos (popisano), bez izmišljenog Očekivano/Razlika po redu. Stvarno Očekivano/Popisano/Razlika (iz `cash_counts` zapisa, realni podaci) se i dalje prikazuje po valuti ispod tabele i u ukupnom zbiru - to nije menjano jer je tacno.
3. **Deljena smena po blagajni**:
   - `web/functions/api/shifts/mine/active.js` je filtrirao `opened_by=<trenutni korisnik>` umesto po blagajni - drugi ulogovani korisnik na istoj blagajni nije video vec otvorenu smenu (dobijao je "nema aktivne smene" iako je kolega vec otvorio smenu na toj kasi). Sada filtrira po `cashbox_id` (sesija/default korisnika, ili `?cashbox_id=` override), sto je ispravno jer DB vec garantuje najviše jednu OPEN smenu po blagajni (`shifts_one_open_per_cashbox_idx`).
   - `web/functions/api/cash-events/inflow.js`, `outflow.js`, `treasury-handover.js` su isto tako zahtevali da JE otvorena smena `opened_by` bas trenutnog korisnika da bi se knjizila Uplata/Isplata/Trezor - drugi korisnik na deljenoj smeni nije mogao ništa da knjiži direktno. Sada svi traze samo da POSTOJI OPEN smena na toj blagajni, bez obzira ko ju je otvorio.
   - Frontend (`scripts.html`) je imao dodatni, jos strozi "vlasnik smene" gejt: dugmad za Uplatu/Isplatu/Trezor su bila `disabled` za svakog ko nije `shift.opened_by`, sa porukom "Ovu smenu je otvorio drugi korisnik...". To je sad ispravljeno da koristi `canPostDirectCashEvents_()` (odrazava deljenu smenu). Presek stanja dugme je isto imalo owner-only proveru koja NE postoji u backend-u (`createCashCountsCore` ne proverava vlasnika) - uklonjeno. Zatvaranje smene OSTAJE ograniceno (vlasnik ILI ADMIN/FINANCE/CASHIER_SUPERVISOR - `canCloseCurrentActiveShift_()`), tacno kao backend `canCloseShift` u `close.js` - to je namerna poslovna pravilo, ne bug.
4. **Mobilni prikaz - previše krupno**: `updateMobileScale_()` je racunao `scale = shortSide/360` ali ga onda FLOOR-ovao na minimum 1.72 i max 2.25 (`Math.max(1.72, Math.min(scale, 2.25))`). Kako CSS (`styles.html`) vec koristi velike bazne velicine fonta pod pretpostavkom da je scale ≈ 1 na normalnom telefonu (npr. `.sheet-amount-input` 44px, `.m-header-balance` 34px), FLOOR od 1.72x je sve multiplikovao za skoro dupliranje - polja su prelazila ekran, dugmad nedostupna. Klampovano na razumniji opseg 0.85-1.25.
5. **"Sesija istekla" usred rada**: `expires_at` na `app_sessions` je bio postavljen SAMO pri loginu i nikad produzavan aktivnoscu - `touchSession()` je azurirao samo `last_seen_at`. Sesija je tvrdo istekla tacno `APP_SESSION_HOURS` (default 12h) posle logina, cak i ako je korisnik non-stop aktivan. Sada `touchSession()` (poziva se iz `verifySession()` na svaki uspesan API poziv) pomera `expires_at` unapred za jos `APP_SESSION_HOURS` - "sliding window" sesija koja se ne gasi dok korisnik radi.

Sta nije uradjeno:

- `getCashSheetReport` (Blagajnički list) i Documents (upload/attach) i dalje nisu migrirani - Blagajnički list je namerno preskocen u ovoj rundi jer je racunski kompleksan (opening/closing balance snapshot, running signed amounts po tipu dogadjaja, `resolveCashSheetScope_`, zavisi od tacnog `display_amount`/`signed_amount`/`display_direction` iz `cash-movements.js` koji jos nije 1:1 portovan) - zasluzuje posebnu, pazljivu rundu jer greske u finansijskom izvestaju nose visok rizik.
- Nije runtime testirano preko Cloudflare Pages okruzenja (kao i uvek do sada - korisnik testira posle push-a).

Sledeci korak:

- Korisnik push-uje i testira sve gore navedeno, narocito: (a) vreme u detaljima transakcija/preseka sada odgovara stvarnom lokalnom vremenu, (b) Apoeni tab u Presek stanja vise ne prikazuje lazno "0,00" razliku, (c) drugi korisnik koji se uloguje na blagajnu sa vec otvorenom smenom vidi tu smenu i moze da knjizi Uplatu/Isplatu/Trezor/Presek (ali NE moze da zatvori smenu ako nije vlasnik ili supervizor/admin/finansije), (d) mobilni prikaz je sada normalne velicine, (e) sesija se vise ne gasi usred aktivnog rada.
- Sledeci veci moduli po planu: Blagajnički list (`getCashSheetReport` - posebna runda), Documents (upload/attach).

## FAZA 3k - Blagajnički list (getCashSheetReport) (2026-07-10, Claude/Cowork sesija)

Status: DONE (Blagajnički list); Documents potvrdjeno mrtav kod, namerno nije implementiran

Kontekst: Korisnik je trazio da se nastavi sa API migracijom po planu. Sledeci veci nemigrirani modul iz plana je bio Blagajnički list (`getCashSheetReport` u `Reports.gs`) - namerno odlozen u prethodnoj rundi jer je racunski najkompleksniji izvestaj u sistemu (opening/closing balance snapshot po opsegu smene ili datuma, signed/display iznosi po tipu dogadjaja, spajanje preseka i knjizenja u jedinstven "list").

Sta je uradjeno:

- Novi modul `web/functions/_lib/cashSheet.js` - port `getCashSheetReport` + `resolveCashSheetScope_`, `calculateBalanceSnapshotForScope_`, `isCashSheetInformationalEvent_`/`isCashCountCorrectionReportEvent_`, `selectCashSheetPhysicalCount_` iz `Reports.gs`, polje-po-polje. Namerno NIJE ponovo koriscen/menjan postojeci `api/reports/cash-movements.js` (koji vec radi i koristi ga Knjiga) - ovaj modul povlaci i oblikuje svoje sopstvene redove dogadjaja da eventualne izmene u slozenijem skoupovanju (opseg smene, flip prikaza za storno, spojeni CASH_COUNT redovi) ne mogu da pokvare vec proveren cashbook izvestaj.
  - Skoupovanje: ako je prosledjen `shift_id`, koristi se vremenski opseg [opened_at, closed_at||handover_at] smene; inace `date_from`/`date_to` (default na `date`/danas) - **tacno kao legacy**, oba filtera (opseg smene I opseg datuma) se primenjuju ZAJEDNO kad je smena prosledjena (legacy kvirk za smene koje traju preko ponoci - namerno NIJE "popravljano", portovano verno).
  - Storno (REVERSAL) dogadjaji se prikazuju sa suprotnim smerom i negativnim iznosom (`display_direction`/`display_amount`), tacno kao original.
  - Presek stanja (`cash_counts`) redovi se spajaju u listu dogadjaja kao informativni redovi (KONTROLNI PRESEK / OTVARANJE SMENE / ZATVARANJE SMENE - POPIS), iskljuceni iz totala (da ne duplira VIŠAK/MANJAK koji se vec vidi u fizickom popisu na dnu lista).
  - `total_surplus`/`total_shortage` polja postoje u odgovoru ali se (kao i u legacy kodu) nikad ne pune - portovano verno kao zatecen legacy nedostatak/nedovrsenost, nije "ispravljano" bez eksplicitnog zahteva.
- Novi endpoint `web/functions/api/reports/cash-sheet.js` (GET, privilegija `shifts:view`) - poziva `getCashSheetReportCore`.
- `scopeCashboxForUser` u `_lib/reports.js` sad je `export`-ovana (bila je privatna) da bi `cashSheet.js` mogao da je ponovo iskoristi umesto duplirane logike.
- Adapter dobio `apiGetCashSheetReport` handler, tacno prema pozivu iz `scripts.html` (`callApi('apiGetCashSheetReport', [filters], ...)` gde `filters = {cashbox_id, currency, date, shift_id}`). Potvrdjeno da je "Blagajnički list" STVARAN, zivi ekran u `desktop.html` (`d-section-blagajnicki-list`, `d-cashsheet-date`, `d-cashsheet-shift`), ne mrtav kod.
- Documents modul (upload/attach): potvrdjeno grep-om da `d-document`/`m-document`/`document-form`/`list-documents-btn` NE postoje NIGDE u `desktop.html`/`mobile.html` - jedine reference su u vec poznatom mrtvom `bindUi()` bloku u `scripts.html`. Namerno NIJE implementiran (nema UI koji bi ga koristio, isti princip kao ranije dead-code odluke za `apiGetShiftBalance`/`apiHandoverShift`/itd).

Sta nije uradjeno:

- Nije runtime testirano preko Cloudflare Pages okruzenja.
- `total_surplus`/`total_shortage` ostaju uvek 0 (zatecena legacy nedovrsenost, ne ispravljano).

Sledeci korak:

- Korisnik push-uje i testira Blagajnički list: otvaranje po datumu (bez smene) i po konkretnoj smeni (dugme "Blagajnički list" u detaljima smene), provera da Očekivano/Fizičko/Razlika i lista dogadjaja odgovaraju stvarnom stanju, i da storno stavke prikazuju suprotan smer u listi.
- Ovim je migracioni plan iz `13_MIGRATION_STATUS.md` u potpunosti zavrsen za sve identifikovane, zive (ne mrtav-kod) module. Preostali rad je iskljucivo runtime testiranje i eventualni novi zahtevi korisnika.

## FAZA 3l - Mobilni prikaz i dalje prevelik nakon FAZA 3j (2026-07-10, Claude/Cowork sesija)

Status: DONE

Kontekst: Korisnik je poslao snimak ekrana (video, pravi telefon 1080x2340) posle FAZA 3j fixa - dugmad i tekst su i dalje bili prevelik. Analizom snimka (ffmpeg izvlacenje frejmova) potvrdjeno: naslov stanja blagajne zauzima ogroman deo ekrana, UPLATA/ISPLATA/TREZOR dugmad su masivna, a naslovi stavki u Knjizi se seku na "17. Kontrolni pr…" jer font ne staje u red.

Root cause OVOG puta NIJE bio isti kao u FAZA 3j (JS `--mobile-scale` floor bug) - taj fix je i dalje na mestu i radi ispravno (scale je blizu 1.0 na ovom telefonu). Problem je bio da su same BAZNE (ne-skalirane, scale=1) CSS velicine u `styles.html` prevelike za normalan telefonski ekran: `.m-header-balance` 34px, `.btn-lg`/`.app-dialog button`/`.m-detail-actions button` min-height 64px, `.m-entry-desc` 24px (sa `white-space:nowrap`+`ellipsis` po dizajnu - kod tako velikog fonta stane jedva 8-10 karaktera pre sečenja), `.m-tab i` 36px, `.sheet-amount-input` 44px, `.app-dialog` naslovi/padding takodje preveliki. Ove vrednosti izgledaju kao da su dizajnirane za POS terminal sa velikim ekranom na daljinu, ne za gust mobilni web UI.

Sta je uradjeno:

- Smanjene bazne (pre-scale) velicine u DVA mesta u `styles.html` koja su se dupli rala (i.e. `html.mobile-view .selector {}` blok oko linije 3396+ I skoro identican `@media (max-width: 768px) { .selector {} }` blok oko linije 4033+ - oba su morala biti azurirana konzistentno jer definisu iste klase):
  - `.m-header-balance`/`.m-header-clock`: 34px → 24px/20px
  - dugmad (`button`, `.btn-lg`, `.m-detail-actions button`, `.app-dialog button`): min-height 42-64px → 44-48px (drzano na platform-standard touch target minimumu 44px, ne ispod), font-size 14-19px → 13-15px
  - `.m-entry-desc`/`.m-entry-meta`/`.m-entry-amt` (redovi u Knjizi): 24px/19px/26px → 15px/12px/16px - ovo direktno resava sečenje naslova, jer sad staje 60%+ vise karaktera po redu pre ellipsis-a
  - `.m-tab i` (ikonice donje navigacije): 36px → 20px
  - `.app-dialog`/`.app-dialog h3`/`.count-entry-form` (popup formulari - otvaranje/zatvaranje smene, presek): padding/naslovi/font smanjeni ~30%
  - `.sheet-amount-input` (veliko polje za unos iznosa): 44px → 32px - namerno OSTAJE najveci element na formi jer je to glavni, jedini unos na tom ekranu
  - `.m-section`/`.m-entry`/`.m-fixed-actions` padding/gap: blago stegnuto (14-16px → 10-14px) za gušci raspored
- JS `updateMobileScale_()` (fix iz FAZA 3j, klampovano 0.85-1.25) NIJE ponovo menjan - taj deo vec radi ispravno, problem je bio iskljucivo u baznim CSS vrednostima koje je taj multiplikator uvecavao.

Sta nije uradjeno:

- Nije runtime testirano na telefonu (korisnik treba da potvrdi da su nove velicine dobre - ovo je subjektivna UX odluka, moze zahtevati jos jedno fino podesavanje).

Sledeci korak:

- Korisnik push-uje i testira mobilni prikaz na telefonu: da li su dugmad/tekst sada normalne velicine, da li se naslovi stavki u Knjizi vise ne seku toliko agresivno.
- Potvrdjeno (ponovnim diff-om `callApi(...)` poziva iz `scripts.html` protiv adapter handlera) da NEMA preostalih pravih (zivih) API rupa - svi nedostajuci pozivi su iskljucivo u poznatom mrtvom `bindUi()`/`bindDesktop()` bloku. API migracija je kompletna; preostali rad je UI/UX poliranje i korisnicko testiranje.

## FAZA 3m - Mobilni: kolaps zaglavlja, kompaktnija dugmad, Nalozi CRUD (2026-07-10, Claude/Cowork sesija)

Status: DONE (implementacija), CEKA runtime test na telefonu

Kontekst: Korisnik je poslao treci snimak ekrana (Screen_Recording_20260710_095357_Brave.mp4) sa jos konkretnijim zahtevima nakon FAZA 3l: (1) UPLATA/ISPLATA/TREZOR dugmad i dalje prevelika, (2) zaglavlje (blagajna/valuta/tema/"sve valute" red) zauzima previse prostora na svakom tabu, treba sakriti unutar opcije, (3) mobilni Nalozi tab nema NIKAKVU funkcionalnost - samo listu i blokirano dugme koje ispisuje poruku da je akcija onemogucena, (4) Smena i Presek tabovi treba bolje organizovani/kompaktniji ekrani.

Sta je uradjeno:

1. **Kolaps zaglavlja** - `mobile.html` header restrukturiran: `.m-header-top` (balans + novo dugme `#m-header-settings-btn` sa ikonicom podesavanja) + `.m-header-chips` (blagajna/valuta/tema/"sve valute"/verzija) sada `hidden` po default-u i otvara se klikom (nova `bindMobileHeaderSettings_()` u `scripts.html`). U `styles.html` dodato `.m-header-chips[hidden] { display: none }` (bez ovoga bi `.m-header-chips { display:flex }` mogao nadjacati `[hidden]` UA-default). Usput otkriven i ispravljen zaostali bug: `.m-header-clock` selektor iz stare markup strukture (uklonjene u ovoj sesiji) je ostao u `@media(max-width:768px)` bloku sa font-size 20px - vise ne pogadja nista postojece, ocisceno.
2. **Dodatno smanjena UPLATA/ISPLATA/TREZOR dugmad** (`.m-fixed-actions button`) i identicna dugmad na Smena tabu (`.shift-work-card .actions button`) - promenjena sa horizontalnog (ikonica+tekst) na vertikalni layout (ikonica iznad kratkog labela), min-height spusten na ~38-40px (sa ranijih 44-48px), font 10px. Primenjeno u OBA dupla CSS bloka (`html.mobile-view` scale-blok i `@media(max-width:768px)` blok) - ustanovljeni obrazac iz FAZA 3j/3l da se moraju menjati zajedno.
3. **Presek tab** - `.count-entry-form` (Apoen/Komada/Upisi red za unos denominacija) je koristio desktop-only `grid-template-columns: minmax(220px,1fr) minmax(160px,1fr) 120px` (min ~500px) sto je na telefonu (360-400px) prelilo ekran i naciniralo "ogromna" dugmad kao vizuelni efekat prelivanja. Prebaceno na `1fr 1fr` sa dugmetom "Upisi" u punoj sirini ispod.
4. **Mobilni Nalozi tab - puna CRUD funkcionalnost** (najveca stavka ove faze): Ranije `loadMobileNalozi_()` je zvao `apiListOrdersWaitingForPayment` i prikazivao dugme "Ceka" koje je SAMO ispisivalo poruku (`executeOrderDirect_` = "blokirano dok se ne uvede ISPLATA zapis") - dakle nikakva prava akcija nije postojala. Zamenjeno potpuno novim tokom koji koristi ISTE, vec proverene desktop API pozive (nijedan nov backend endpoint nije bio potreban - `apiListPaymentOrders`, `apiCreateDirectPaymentOrder`, `apiUpdateDraftPaymentOrder`, `apiIssuePaymentOrder`, `apiRejectPaymentOrderByCashier`, `apiSendPaymentOrderToCashier`, `apiExecutePendingPaymentOrderOutflow` - svi vec postoje i koriste se na desktop `d-section-nalozi` ekranu):
   - `loadMobileNalozi_()`/`renderMobileNalozi_()` - lista SVIH naloga (isto sto i desktop `loadDesktopNalozi_`), status-obojeni chip po redu, tab-badge broji naloge u DRAFT/WAITING_PAYMENT/PARTIALLY_PAID statusu.
   - `openMobileOrderDetail_(order)` - tap na red otvara `.app-dialog-overlay` sa detaljima i dugmadima ciji su uslovi prikazivanja 1:1 preslikani iz desktop `renderPaymentOrderDetail_`/`bindPaymentOrderDetailActions_` (Izmeni nacrt - samo DRAFT, Odobri nalog - samo DRAFT preko `apiIssuePaymentOrder`, Odbij - samo WAITING_PAYMENT preko `apiRejectPaymentOrderByCashier` uz obavezan razlog, Posalji na isplatu - WAITING_PAYMENT/PARTIALLY_PAID bez vec poslatog pending zapisa preko `apiSendPaymentOrderToCashier`, Izvrsi isplatu - kad postoji pending cash event i korisnik ima otvorenu smenu na blagajni, preko `apiExecutePendingPaymentOrderOutflow`).
   - `openMobileNewOrderForm_(existingOrder)` - novi kompaktni mobilni formular (dugme "+ Novi nalog" u `mobile.html`) za kreiranje ILI izmenu nacrta naloga (blagajna/valuta/primalac/iznos/osnov/rok/napomena), sa dva puta: "Sacuvaj nacrt" (`apiCreateDirectPaymentOrder`/`apiUpdateDraftPaymentOrder`) ili "Sacuvaj i izdaj" (cuva pa odmah zove `apiIssuePaymentOrder`) - ista logika kao desktop `saveNewPaymentOrderDraft_`/`issueNewPaymentOrder_`, samo bez draft-attachment/file-upload dela desktop ekrana (nije trazen za mobilni).
   - Dodata kompaktna varijanta `.cash-count-action` stila (`.m-detail-actions .cash-count-action`, min-height 44px umesto desktop 60px) da dugmad u ovim novim mobilnim dijalozima ne budu preglomazna.

Sta nije uradjeno:

- Nije runtime testirano na telefonu (korisnik treba da potvrdi da kolaps zaglavlja, manja dugmad i novi Nalozi tok rade ispravno na stvarnom uredjaju).
- Mobilni Nalozi CRUD NE ukljucuje prilozene dokumente (attachments) - desktop `new-payment-order-form` ima upload polje, mobilni formular namerno ne (van obima zahteva, moze se dodati naknadno ako zatreba).
- Preostale stavke iz istog korisnickog zahteva (valute CRUD, print Blagajnickog lista, Najave/najava uplate feature sa novim rolama ANNOUNCER/ASSISTANT_CASHIER) NISU zapocete u ovoj fazi - planirane su i potvrdjene od strane korisnika, ali su odlozene za sledecu fazu jer ukljucuju SQL migraciju i nove role (visi rizik, zahteva odvojen pregled).

Sledeci korak:

- Korisnik push-uje i testira mobilni prikaz (zaglavlje/dugmad/Nalozi tok) na telefonu.
- Nastaviti sa preostalim odobrenim stavkama: Valute CRUD (API + admin ekran + dinamicki bootstrap umesto hardkodovanih `RSD`/`EUR`), aktivacija print dugmeta za Blagajnicki list (ispravka `openPrintView`/`getBasePrintUrl_` URL rutiranja), i Najave (najava uplate) feature - SQL migracija za nove role, `payment_announcements` tabela, backend match/VISAK-MANJAK logika, frontend (kreiranje najave, prikaz u Knjizi, UPLATA akcija), i ogranicen ekran za Pomocnog blagajnika.

## FAZA 3n - Valute CRUD + ispravka dugmeta Blagajnicki list (2026-07-10, Claude/Cowork sesija)

Status: DONE (implementacija), CEKA runtime test

Sta je uradjeno:

1. **Valute CRUD** (tabela `currencies` je vec postojala u šemi sa `denominations` jsonb kolonom - nije bila potrebna nova SQL migracija, samo nova permisija):
   - `web/functions/_lib/currencies.js` (novo) - `normalizeCurrencyCode`, `isValidCurrencyCode`, `normalizeDenominations` (prima CSV ili niz, vraca ociscen/sortiran niz pozitivnih celih brojeva), `clearOtherDefaultCurrencies` (garantuje tacno 0 ili 1 `is_default` valuta), `findCurrency`.
   - `web/functions/api/currencies/list.js` (novo, GET) - dostupno svakom prijavljenom korisniku (valute su deljena konfiguracija, ne osetljiv podatak).
   - `web/functions/api/currencies/create.js`, `update.js` (novo, POST) - zahtevaju novu privilegiju `currencies:manage`; audit log (`CURRENCIES` entity).
   - `supabase/seed.sql` - dodata permisija `currencies:manage` (kategorija `currencies`) + role_permissions za `ADMIN` i `FINANCE`.
   - `cloudflare-apps-script-adapter.js` - `apiListCurrencies`/`apiCreateCurrency`/`apiUpdateCurrency` handleri; `buildConfig()` vise NE hardkoduje `currencies: ['RSD','EUR']` i `cashDenominations` - `getBootstrap()` sada zove `/api/currencies/list` i prosledjuje stvarne redove; `FALLBACK_CURRENCIES` konstanta cuva iste stare vrednosti kao safety-net ako poziv ikad zakaze (npr. mreza), da app ne postane neupotrebljiv.
   - `desktop.html`/`scripts.html` - nov nav item "Valute" (`d-section-valute`), tabela sa listom valuta (šifra/naziv/status/podrazumevana/apoeni) + dijalog za dodavanje/izmenu (isti `.app-dialog-overlay` pattern kao mobilni Nalozi dijalozi iz FAZA 3m), gated iza `currencies:manage` privilegije (denied/allowed panel isti obrazac kao `d-users-admin-denied`/`d-users-admin-content`). Samo desktop (mobilni admin ekran nije trazen, valute su retka administrativna operacija).

2. **Blagajnicki list print dugme** - istraga je otkrila da problem NIJE bio nedostajuca stranica, vec da dugme "Blagajnicki list" u detalju stavke na Knjiga tabu (`#d-detail-print`) poziva pogresnu funkciju: `openPrintView('print-cash-event', ev.event_id)` - otvara vaucer POJEDINACNE stavke, ne blagajnicki list. Uz to, `openPrintView`/`getBasePrintUrl_` su gradili neispravan URL (`trenutnaStranica.html?view=X&id=Y`umesto pravog Cloudflare flat-fajla) - taj deo je TAKODJE ispravljen (nova `getPrintFileUrl_()` gradi `/print-X.html` direktno), sto koristi bilo koje drugo dugme koje jos zove `openPrintView`.
   - Ispravljeno: `#d-detail-print` sada zove novu `openCashSheetForEvent_(ev)` koja navigira na VEC RADEcI `d-section-blagajnicki-list` ekran (postoji od FAZA 3k - `loadCashSheet_`/`renderCashSheet_`/`window.print()` sa posvecenim `@media print` CSS-om koji sakriva navigaciju), skopiran na DATUM izabrane stavke (cash_events tabela nema `shift_id` kolonu, pa je scope uvek po danu, ne po smeni - isto ponasanje kao default `loadCashSheet_()` bez eksplicitnog shift filtera).
   - VAZNO OTKRICE (nije popravljeno u ovoj fazi, samo dokumentovano): Preostalih 5 print-*.html fajlova (`print-cash-event`, `print-payment-order`, `print-payment-request`, `print-shift-handover`, `print-daily-closing`, `print-report`) i dalje sadrze NEPRENETU GAS server-side scriptlet sintaksu (`<? var data = printData || {}; ?>`, `<?= event.event_id ?>`) iz stare Apps Script HtmlService sablonizacije. `web/build.mjs` (graditelj za Cloudflare Pages) NIKAD nije implementirao evaluaciju ovih scriptlet-a - njegova `rewriteAppsScriptExpressions()` menja samo par specificnih GAS izraza (base target, ScriptApp.getService().getUrl(), href=?view= linkove), ne generalne `<? ... ?>` blokove. To znaci da bi OTVARANJE bilo koje od ovih stranica (npr. print-payment-order.html za nalog) danas prikazalo polomljen HTML sa vidljivim `<?= ... ?>` tekstom umesto podataka - te stranice NIKAD nisu radile posle Cloudflare migracije, cak i kad bi URL rutiranje bilo ispravno. Blagajnicki list ovo zaobilazi jer koristi DRUGACIJI, vec ispravan obrazac (klijentska JS renderovanje u `d-section-blagajnicki-list` + `window.print()`, bez posebnog print-*.html fajla). Popravka preostalih 5 stranica (konverzija u isti klijentski fetch+render obrazac) NIJE uradjena u ovoj sesiji - obiman je posao (svaka stranica treba prepravku iz scriptlet-a u JS render funkciju) i nije bio deo eksplicitnog zahteva ove sesije.

Sta nije uradjeno:

- Runtime test valuta CRUD-a i print dugmeta na produkciji.
- Preostalih 5 print-*.html stranica sa neprenetom GAS scriptlet sintaksom (vidi gore) - i dalje polomljene, treba posebna sesija.
- Mobilni admin ekran za valute (namerno preskocen, desktop-only).

Sledeci korak:

- Korisnik push-uje i testira: Valute ekran (dodavanje/izmena/apoeni), i "Blagajnicki list" dugme u Knjizi (treba da vodi na ispravan izvestaj sa opcijom stampe).
- Odluciti da li i kada popraviti preostalih 5 print-*.html stranica (odvojen posao, nije deo trenutnog zahteva).
- Nastaviti sa Najave (najava uplate) feature-om - poslednja preostala stavka iz odobrenog zahteva.

## FAZA 3o - Najave uplate (payment announcements) - pun feature (2026-07-10, Claude/Cowork sesija)

Status: DONE (implementacija), CEKA SQL primenu na live bazi + runtime test

Kontekst: Poslednja stavka iz korisnikovog velikog potvrdjenog zahteva. Spec (potvrdjen od korisnika): nova rola ANNOUNCER koja SAMO kreira najavu uplate (bez pristupa knjizi/blagajni); glavni CASHIER takodje moze da kreira i dalje postupa sa najavama; nova rola ASSISTANT_CASHIER koja vidi ogranicenu "knjigu" - samo najave i uplate po njima; UPLATA akcija knjizi stvarnu uplatu kao normalan cash_event, a razliku u odnosu na najavu beleze kao poseban VISAK/MANJAK CORRECTION cash_event (eksplicitna instrukcija korisnika, isti pattern kao Presek stanja razlike).

Sta je uradjeno:

1. **Sema** (`supabase/migrations/202607090001_initial_schema.sql`) - dodata `payment_announcements` tabela (status OPEN/MATCHED/CANCELLED, pamti matched_cash_event_id + matched_correction_event_id + matched_amount + difference) i INLINE prosiren `users_role_check` constraint sa ANNOUNCER/ASSISTANT_CASHIER. Posto `users` tabela vec postoji na live bazi, na kraju fajla je DODAT eksplicitan `alter table users drop/add constraint` blok (idempotentan preko `drop constraint if exists`) koji korisnik treba da pokrene protiv Supabase-a - sam CREATE TABLE payment_announcements je bezbedan da se doda direktno.
2. **Permisije** (`supabase/seed.sql`) - nove role ANNOUNCER/ASSISTANT_CASHIER u `roles`; nove permisije `payment_announcements:create/view/match`; grant-ovi: ANNOUNCER samo `create`, ASSISTANT_CASHIER samo `view`, CASHIER sve tri (create+view+match, po specu "glavni blagajnik moze i da postupa sa njom"), CASHIER_SUPERVISOR/FINANCE `view`+`match` (nadzor), ADMIN sve.
3. **Backend jezgro** (`web/functions/_lib/paymentAnnouncements.js`, novo) - `createAnnouncementCore`, `listAnnouncementsCore` (skopiran po cashbox-u za CASHIER/ANNOUNCER/ASSISTANT_CASHIER, isti princip kao `scopeCashboxForUser` u reports.js ali prosiren na sve 3 cashbox-vezane role), `matchAnnouncementCore` (UPLATA akcija - postuje CASH_INFLOW za stvarni iznos + opciono CORRECTION za VISAK/MANJAK razliku, tacno kopirano iz `cashCounts.js buildCorrectionEvent` pattern-a), `cancelAnnouncementCore`.
4. **API rute** (`web/functions/api/payment-announcements/{create,list,match,cancel}.js`, novo) - tanki wrapper-i, isti obrazac kao `daily-closing/prepare.js`. `list.js` namerno NE prihvata `payment_announcements:create` kao dovoljnu privilegiju (samo `view`/`match`) - ANNOUNCER sme da kreira ali ne i da pregleda tudje najave, tacno po specu "moze SAMO da uradi najavu".
5. **Adapter** (`cloudflare-apps-script-adapter.js`) - `apiCreatePaymentAnnouncement`, `apiListPaymentAnnouncements`, `apiMatchPaymentAnnouncement`, `apiCancelPaymentAnnouncement`.
6. **Role wiring** - `_lib/permissions.js USER_ROLES` prosiren (koristi ga `users/create.js` za validaciju role pri kreiranju korisnika); `scripts.html roleLabel_()` mapa + 2 hardkodovana role-array fallback-a azurirani sa novim rolama.
7. **Knjiga integracija (frontend merge, bez diranja cash-movements.js)** - `loadKnjiga_()` po ucitavanju STVARNIH cash_events-a, AKO korisnik ima `payment_announcements:view` ili `:match`, dodatno ucitava najave (`loadKnjigaAnnouncements_`) i re-renderuje. `renderKnjigaTable_()` sad zove `mergeAnnouncementsIntoEvents_()` koja pretvara svaku ne-otkazanu najavu u sintetican "red" (event_type ANNOUNCEMENT, display_direction 'INFO' - namerno ne pogadja IN/OUT totale/balans) i ubacuje ga hronoloski medju prave dogadjaje. `cashEventUserLabel_`/`cashEventReasonLabel_`/`renderKnjigaRow_`/`renderMobileEntry_` prosireni sa ANNOUNCEMENT granom (siva boja, status chip, bez prikaza balansa na tom redu - polje "Zavrsno stanje" bi inace pogresno pokazalo 0 ako je najava najnoviji red po datumu, ISPRAVLJENO u `renderKnjigaTable_` da trazi poslednji STVARNI cash_event za finalBalance). Klik na najavu red (`data-announcement-id`, odvojeno od `data-event-id`) otvara `openAnnouncementDetail_`.
8. **UI akcije** - `openCreateAnnouncementDialog_` (dugme "Najava uplate" u Knjiga toolbar-u, desktop `#d-new-announcement-btn` + mobile `#m-new-announcement-btn`, vidljivo samo sa `payment_announcements:create`), `openAnnouncementDetail_` (detalji + dugmad uslovljena statusom/privilegijom: UPLATA samo OPEN+match, Otkazi OPEN+create-ili-match), `openMatchAnnouncementDialog_` (unos stvarnog iznosa, poziva `apiMatchPaymentAnnouncement`, prikazuje VISAK/MANJAK poruku ako se razlikuje od najave).
9. **Ogranicen ekran za Pomocnog blagajnika** (`d-section-najave`, desktop) - nov nav item "Najave uplate" (`#d-nav-najave`), vidljiv svakom ko ima `payment_announcements:view`/`:match` (ne samo ASSISTANT_CASHIER - CASHIER/nadzor takodje dobijaju prakticnu preglednu tabelu). Koristi ISKLJUCIVO `apiListPaymentAnnouncements` (privilegija koju ASSISTANT_CASHIER ima) - namerno NE zahteva `cash_events:view` (koji ASSISTANT_CASHIER nema, po specu "vidi SAMO najave"), pa je ovo zaista "jos jedna knjiga" nezavisna od prave Knjige. Login bootstrap (`bootstrapShellAfterAppSession_`) automatski navigira ASSISTANT_CASHIER pravo na ovaj ekran (default Knjiga ekran bi im inace vratio 403 jer nemaju cash_events:view).

Sta nije uradjeno:

- SQL nije pusten na live Supabase bazu - korisnik treba da pokrene `alter table users .../create table payment_announcements` blok sa kraja `202607090001_initial_schema.sql`.
- Mobilni ekran za Pomocnog blagajnika NIJE napravljen (samo desktop `d-section-najave`) - mobile.html ima fiksne tabove (Knjiga/Nalozi/Smena/Presek/Zakljucak) pa bi dodavanje novog taba bilo veci zahvat; ASSISTANT_CASHIER trenutno mora da koristi desktop prikaz. Mobilni "Najava uplate" dugme u Knjiga toolbar-u i sam merge u m-knjiga-list RADE (deljen kod sa desktop-om), samo namenski poseban ASSISTANT_CASHIER tab ne postoji na telefonu.
- Runtime test celog toka (kreiranje najave → UPLATA → provera VISAK/MANJAK cash_event-a u Knjizi → ASSISTANT_CASHIER prijava i provera ogranicenog ekrana).
- Nije dodato dugme/tok za "editovanje" OPEN najave (samo kreiranje/otkazivanje/uparivanje) - ako zatreba izmena iznosa/napomene pre uparivanja, trenutno se mora otkazati i kreirati nova.

Sledeci korak:

- Korisnik pokreće SQL blok na Supabase-u (nove role + payment_announcements tabela), zatim push/deploy.
- Kreirati bar jednog test korisnika sa rolom ANNOUNCER i jednog sa ASSISTANT_CASHIER da se potvrdi ceo tok end-to-end.
- Po potrebi, dodati mobilni ekran za Pomocnog blagajnika (van obima ove sesije).

## FAZA 3p - UI relokacija dugmeta Najava uplate + fix bag-a isplate posle smene korisnika (2026-07-10, Claude/Cowork sesija)

Status: DONE (implementacija), CEKA runtime test

Kontekst: Korisnik je potvrdio da je SQL iz FAZA 3o uspesno pusten na live Supabase bazu (test najava se vidi u Knjizi). Ovom sesijom je zatrazio dve stvari na osnovu screenshot-a live app-a: (1) premestanje dugmeta "Najava uplate" iz Knjiga toolbar-a u "Brze akcije" panel pored Uplata/Isplata/Trezor, uz uklanjanje "Nema aktivne smene" upozorenja; (2) bag - isplata naloga ne prolazi ako je aktivna smena na blagajni promenila korisnika (drugi korisnik otvorio smenu) u odnosu na onog koji salje isplatu.

Sta je uradjeno:

1. **UI relokacija** (`desktop.html`, `styles.html`, `scripts.html`):
   - `#d-new-announcement-btn` premesten iz `cashbook-filters` toolbar-a u `quick-action-grid` (isti panel gde su `d-side-btn-uplata`/`-isplata`/`-trezor`), sa novom klasom `quick-action-button--najava` (plava boja, bez lock ikonice - kreiranje najave NE zahteva otvorenu smenu, za razliku od direktnih uplata/isplata/trezora).
   - `.quick-action-grid` promenjen sa `repeat(3, 1fr)` na `repeat(2, 1fr)` (2x2 raspored za 4 dugmeta).
   - Upozorenje "Nema aktivne smene - otvorite smenu za direktan rad" (`<strong>`/`<span>` u `#d-quick-lock-message`) je UKLONJENO - bilo je redundantno sa vec postojecom `#d-direct-permission-card` porukom (`d-direct-permission-text`) koja pokriva isti slucaj. `#d-quick-lock-message` sada sadrzi SAMO dugme "Otvori smenu", i prikazuje se iskljucivo kad NEMA nikakve aktivne smene na blagajni (ranije se prikazivao i kad smena postoji ali je drugi korisnik vlasnik, sa drugim tekstom - taj slucaj sada pokriva iskljucivo permission-card, bez duplirane poruke).
   - `updateDesktopDirectActionsVisibility_()` pojednostavljen: vise ne menja `<strong>`/`<span>` tekst dinamicki, samo prikazuje/sakriva `d-quick-lock-message` na osnovu `hasShift`.
   - `bindAnnouncementButtons_()` nije menjan - vec je nezavisno od stanja smene prikazivao/sakrivao dugme po privilegiji `payment_announcements:create`, sto je tacno ponasanje potrebno na novoj lokaciji.
   - Mobilni prikaz (`mobile.html`, `#m-new-announcement-btn`) NIJE menjan - zahtev se odnosio na desktop Brze akcije panel (screenshot je bio desktop).

2. **Bag fix - isplata posle promene korisnika na smeni** (`web/functions/api/payment-orders/execute-pending.js`):
   - Root cause: lokalna `findOpenShift(env, cashboxId, userEmail)` funkcija u ovom fajlu je JOS UVEK filtrirala po `opened_by=userEmail` (trenutni korisnik koji izvrsava isplatu) - stari, pre-FAZA-3j obrazac vezan za "smena pripada korisniku koji ju je otvorio". Kad je smena na blagajni zatvorena/ponovo otvorena od DRUGOG korisnika (ili je drugi korisnik preuzeo blagajnu), provera nije nalazila OPEN smenu za trenutnog korisnika (jer redom vlasnik nije on) i vracala je gresku 409 "Aktivna smena za ovu blagajnu nije pronadjena za trenutnog korisnika" - iako je smena bila aktivna, samo pod drugim korisnikom.
   - Ovaj fajl je bio JEDINI preostali payment-orders endpoint sa ovim zastarelim obrascem - `create-direct.js` uopste ne proverava vlasnika smene, ostali fajlovi u folderu ne diraju `opened_by`.
   - Fix: `findOpenShift` uskladjen sa vec ustaljenim deljeno-smena obrascem iz `cash-events/inflow.js`/`outflow.js`/`treasury-handover.js` (FAZA 3j) - proverava SAMO da li postoji BILO KOJA OPEN smena na toj blagajni (`select=shift_id&cashbox_id=...&status=eq.OPEN`, bez `opened_by` filtera). Poziv na liniji koja koristi `findOpenShift` azuriran da vise ne prosledjuje `appUser.email`; poruka greske pojednostavljena u "Aktivna smena za ovu blagajnu nije pronadjena." (bez pominjanja "trenutnog korisnika", posto vise nije relevantno ko je vlasnik).

Sta nije uradjeno:

- Runtime test oba fix-a na produkciji (UI relokacija dugmeta + izvrsenje pending isplate sa promenjenim korisnikom na smeni).
- Nije proveravano da li isti "vlasnik smene" obrazac postoji u nekom DRUGOM, van payment-orders foldera lociranom kodu (npr. cash-counts/daily-closing) - van obima ovog izvestaja o bagu jer korisnik je prijavio konkretno isplatu naloga.

Sledeci korak:

- Korisnik push-uje i testira: (1) izgled Brze akcije panela (Uplata/Isplata/Trezor/Najava uplate u 2x2 rasporedu, bez "Nema aktivne smene" teksta), (2) slanje naloga na isplatu pa promenu korisnika na aktivnoj smeni pa izvrsenje isplate - treba da prodje bez 409 greske.
