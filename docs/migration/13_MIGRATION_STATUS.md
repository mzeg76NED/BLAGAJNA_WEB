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
- `apiCreateDailyClosing` (kreiranje dnevnog zakljucka) nije migrirano - frontend trenutno nema poziv za kreiranje (samo za pregled), pa `daily_closing` tabela ostaje prazna dok se taj tok ne doda.
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
