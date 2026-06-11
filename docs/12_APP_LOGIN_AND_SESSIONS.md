# Interni aplikativni login i sesije

## Svrha

BLAGAJNA WEB koristi Google Apps Script i Google Workspace resurse, ali operativni korisnik aplikacije nije isto što i Google nalog.

Usvojeni model:

- Google nalog je tehnička sesija, npr. `blagajna@nedeljkovic.co.rs`.
- Aplikativni korisnik je red u `USERS` tabeli.
- Prijava se radi korisničkim kodom i PIN-om.
- Poslovna prava se izvode iz role aplikativnog korisnika.

## USERS model

Za interni login dodaju se kolone:

- `user_code`
- `pin_hash`
- `pin_salt`
- `last_login_at`
- `last_logout_at`
- `failed_login_count`
- `locked_until`
- `last_google_session_email`

`pin_hash` i `pin_salt` su tehnička polja. Ne prikazuju se u UI-ju i ne vraćaju se kroz API.

## APP_SESSIONS

Sesije se beleže u tabeli `APP_SESSIONS`.

Kolone:

- `session_id`
- `app_user_id`
- `user_code`
- `role`
- `google_session_email`
- `cashbox_id`
- `shift_id`
- `created_at`
- `last_seen_at`
- `expires_at`
- `active`
- `logout_at`
- `device_label`

Sesija trenutno traje 12 sati. Logout i istek sesije zatvaraju aktivnu sesiju bez brisanja reda.

## PIN

PIN se ne čuva kao običan tekst.

Backend koristi:

- `generatePinSalt()`
- `hashUserPin(pin, salt)`
- `verifyUserPin(pin, hash, salt)`

Hash se računa preko `Utilities.computeDigest` i čuva se kao hex vrednost.

## Audit

Faza 1 dodaje login audit događaje:

- `APP_USER_LOGIN`
- `APP_USER_LOGOUT`
- `APP_USER_SWITCH`
- `APP_USER_LOGIN_FAILED`
- `APP_SESSION_EXPIRED`

Potpuna integracija aplikativnog identiteta u sve poslovne audit zapise je planirana za posebnu fazu.

## Ograničenja faze 1

Ova faza ne dodaje login ekran i ne zaključava aplikaciju.

Postojeći poslovni tokovi i dalje koriste postojeći `getCurrentUser()` model zasnovan na Google email-u. Prelazak API akcija na aplikativnu sesiju radi se u narednim fazama.

## Faza 2: UI login i aktivna app sesija

Aktivni desktop prikaz ima login/lock ekran koji se prikazuje dok nema validne aplikativne sesije.

Login ekran prikazuje:

- naziv aplikacije,
- tekst `Prijava u blagajnu`,
- polje `Korisnički kod`,
- polje `PIN`,
- dugme `Prijavi se`,
- poruku greške,
- informaciju o Google sesiji kada je dostupna iz backend sesije.

Frontend poziva:

- `apiLoginAppUser`
- `apiGetCurrentAppSession`
- `apiLogoutAppUser`

## Session storage

Desktop UI čuva samo `session_id` u `sessionStorage`.

Ključ:

```text
BLAGAJNA_APP_SESSION_ID
```

Ne čuvaju se:

- PIN,
- `pin_hash`,
- `pin_salt`.

Po učitavanju desktop aplikacije frontend čita `session_id` i poziva `apiGetCurrentAppSession(sessionId)`.

Ako je sesija validna:

- desktop shell se prikazuje,
- aktivni app korisnik se prikazuje u header-u,
- postojeći bootstrap podaci se učitavaju.

Ako sesija nije validna:

- `sessionStorage` se čisti,
- desktop shell ostaje zaključan,
- prikazuje se login ekran.

## Header

Desktop header prikazuje:

- aplikativnog korisnika,
- rolu,
- Google sesiju kao tehnički nalog.

Primer:

```text
Prijavljen
PERA — Petar Petrović · Blagajnik
Google sesija: blagajna@nedeljkovic.co.rs
```

## Odjava i promena korisnika

`Odjava` poziva `apiLogoutAppUser(sessionId)`, briše lokalni `sessionStorage` i vraća korisnika na login ekran.

`Promeni korisnika` koristi isti stabilni tok kao odjava: zatvara trenutnu aplikativnu sesiju i vraća login ekran za sledećeg operatera.

Google nalog se ne menja.

## Šta još nije završeno

Faza 2 ne menja server-side autorizaciju poslovnih API poziva.

Planirano za naredne faze:

- Faza 3: administracija `user_code` i PIN-a u ekranu `Korisnici i prava`.
- Faza 4: audit kontekst za sve poslovne akcije sa `app_user_id`, `app_user_name`, `role`, `google_session_email`, `cashbox_id`, `shift_id`.

## Faza 3: administracija aplikativnih korisnika

Ekran `Korisnici i prava` podržava pripremu korisnika za aplikativni login.

Administrator unosi:

- `user_code`,
- ime i prezime,
- email kao kompatibilno/informativno polje,
- rolu,
- početni PIN i potvrdu PIN-a,
- status,
- podrazumevanu blagajnu.

`user_code` je glavni login identifikator. Email ostaje u modelu zbog kompatibilnosti sa postojećim Google-email tokovima.

## PIN set/reset

Kod kreiranja korisnika početni PIN je obavezan.

Kod izmene korisnika PIN se ne prikazuje. Ako je potrebno, koristi se posebna sekcija `Reset PIN-a`.

Pravila:

- PIN mora imati najmanje 4 cifre,
- PIN se nikada ne čuva kao plain text,
- frontend ne dobija PIN, `pin_hash` ili `pin_salt`,
- audit ne sme sadržati PIN, hash ili salt.

## Privilegije po rolama

Privilegije su read-only na korisniku.

Za promenu privilegija korisnika menja se rola korisnika. Sistem ne podržava pojedinačno čekiranje privilegija po korisniku.

Tab `Privilegije` prikazuje:

- trenutnu rolu,
- privilegije te role,
- matricu prava po rolama,
- tekst: `Privilegije su izvedene iz role. Za promenu privilegija korisnika promenite rolu korisnika.`

## Priprema za pilot

Pre pilot deploy-a administrator treba da proveri korisnike kroz helper:

```text
prepareUsersForAppLogin()
```

Helper je izveštajni i ne postavlja PIN automatski.

Potrebno je:

1. popuniti `user_code` za svakog aplikativnog korisnika,
2. ručno postaviti početni PIN,
3. proveriti rolu,
4. proveriti status korisnika,
5. proveriti podrazumevanu blagajnu ako je koristi.

## Faza 4: server-side app session gating

Frontend zaključavanje nije jedina zaštita. Backend write API pozivi sada dobijaju `session_id` i proveravaju aplikativnu sesiju kroz centralni helper:

```text
requireAppSession(sessionId, requiredPrivileges)
```

Helper proverava:

- da sesija postoji,
- da je aktivna,
- da nije istekla,
- da aplikativni korisnik postoji i da je aktivan,
- da se privilegije izvode iz role aplikativnog korisnika,
- da korisnik ima traženo pravo.

Ako sesija nije validna, backend vraća:

```text
Sesija je istekla. Prijavite se ponovo.
```

Ako korisnik nema pravo:

```text
Nemate ovlašćenje za ovu akciju.
```

## Audit context

Audit log je proširen kompatibilnim kolonama:

- `app_user_id`
- `app_user_name`
- `user_code`
- `role`
- `google_session_email`
- `cashbox_id`
- `shift_id`

Postojeća polja audit log-a nisu uklonjena.

Centralni `writeAuditLog` popunjava ova polja iz aktivnog app session konteksta kada je API poziv zaštićen sesijom.

## Frontend session prosleđivanje

Centralni frontend helper `callApi` dodaje `session_id` kao poslednji argument API pozivima.

Ako backend vrati istek sesije:

- `sessionStorage` se čisti,
- desktop shell se zaključava,
- prikazuje se login ekran.

Greška nedostatka prava prikazuje se korisniku bez logout-a.

## Bootstrap ograničenje

Ako nema nijednog aktivnog app korisnika sa `user_code` i PIN-om, potreban je administrativni korak inicijalizacije kroz Apps Script/helper ili poseban bootstrap tok.

Faza 4 ne uvodi automatsko kreiranje admin korisnika i ne generiše default PIN.

## Database readiness / bootstrap pre deploy-a

Pre deploy-a app login modela mora se proveriti realna struktura Google Sheets baze, ne samo lokalni `TABLE_HEADERS` u kodu.

`USERS` tabela mora imati osnovne kolone:

- `user_id`
- `email`
- `full_name`
- `role`
- `active`
- `default_cashbox_id`
- `created_at`
- `updated_at`

Za aplikativni login `USERS` mora dodatno imati:

- `user_code`
- `pin_hash`
- `pin_salt`
- `last_login_at`
- `last_logout_at`
- `failed_login_count`
- `locked_until`
- `last_google_session_email`

Helper `ensureUsersAppLoginColumns()` dodaje nedostajuće kolone na kraj header-a. Ne briše podatke, ne menja postojeći redosled kolona, ne postavlja PIN i ne menja `user_id`.

`APP_SESSIONS` mora postojati kao poseban sheet sa kolonama:

- `session_id`
- `app_user_id`
- `user_code`
- `role`
- `google_session_email`
- `cashbox_id`
- `shift_id`
- `created_at`
- `last_seen_at`
- `expires_at`
- `active`
- `logout_at`
- `device_label`

Helper `ensureAppSessionsSheet()` kreira sheet ako ne postoji i dodaje nedostajuće kolone. Ne briše stare sesije i ne zatvara aktivne sesije.

`AUDIT_LOG` mora moći da primi app audit context:

- `app_user_id`
- `app_user_name`
- `user_code`
- `role`
- `google_session_email`
- `cashbox_id`
- `shift_id`

Helper `ensureAuditAppContextColumns()` dodaje nedostajuće kolone kompatibilno na kraj header-a. Stari audit zapisi se ne menjaju.

Za proveru spremnosti koristi se:

```text
reportAppLoginDatabaseReadiness()
```

Rezultat sadrži `ok_for_deploy`, sekcije za `USERS`, `APP_SESSIONS`, `AUDIT_LOG`, listu `blockers` i listu `warnings`.

`ok_for_deploy` sme biti `true` samo ako:

- `USERS` ima potrebne app login kolone,
- `APP_SESSIONS` postoji i ima očekivan header,
- `AUDIT_LOG` može da primi app audit context,
- postoji najmanje jedan aktivan `ADMIN` korisnik sa `user_code`, `pin_hash` i `pin_salt`,
- nema dupliranih `user_id` vrednosti,
- nema kritičnih konfiguracionih grešaka.

Za inicijalizaciju prvog admina pripremljen je helper:

```text
initializeFirstAppAdmin(options)
```

PIN se prosleđuje samo pri eksplicitnom ručnom pozivu helpera. PIN se ne hardkoduje, ne zapisuje u dokumentaciju, ne loguje u audit i ne vraća kroz API. Sistem ne koristi default PIN jer bi to otvorilo rizik da svi operateri imaju isti poznati pristup.

Preporučeni glavni admin za pilot:

```text
user_id: USR_ADMIN_MILANKO
user_code: MILANKO
full_name: Milanko Zegarac
role: ADMIN
active: TRUE
default_cashbox_id: CB_MAIN
email: Milanko.Zegarac@nedeljkovic.co.rs
```

PIN nije deo dokumentacije i mora biti unet ručno tek posle eksplicitne potvrde.

Duplirani `user_id` se ne rešava automatski. Za izveštaj se koristi:

```text
reportDuplicateUsers()
```

Ako treba ispraviti konkretan dupliran red, postoji eksplicitni helper:

```text
fixDuplicateUserId(oldUserId, rowSelector, newUserId)
```

Za poznati slučaj `USR_ADMIN_MILANKO`, red sa emailom `mzeg76@google.com` ne treba menjati bez potvrde. Bezbedne opcije su promena tog reda na `USR_ADMIN_MILANKO_GOOGLE` ili deaktivacija ako taj red nije potreban.

## Faza 4.6: izvršenje readiness-a i bootstrap admin

Faza 4.6 služi da se helperi iz Faze 4.5 izvrše nad realnom Google Sheets bazom pre web deploy-a.

Readiness se proverava funkcijom:

```text
reportAppLoginDatabaseReadiness()
```

U ovoj fazi helper sme da:

- doda nedostajuće `USERS` app login kolone,
- kreira ili dopuni `APP_SESSIONS`,
- dopuni `AUDIT_LOG` app context kolone,
- prijavi duplirane `user_id` i `user_code`,
- prijavi aktivne korisnike bez `user_code` ili PIN-a.

Helper ne sme da:

- briše podatke,
- menja `user_id`,
- postavlja PIN,
- kreira korisnike.

Poznati duplirani `user_id` rešava se eksplicitnim pozivom:

```text
fixDuplicateUserId('USR_ADMIN_MILANKO', { email: 'mzeg76@google.com' }, 'USR_ADMIN_MILANKO_GOOGLE')
```

Ovaj poziv menja samo red koji ima stari `user_id` i navedeni email. Ne menja rolu, status, PIN niti ostala poslovna polja.

Primarni app ADMIN za pilot je:

```text
user_id: USR_ADMIN_MILANKO
user_code: MILANKO
role: ADMIN
active: TRUE
```

PIN se bezbedno postavlja preko Script Properties bootstrap toka:

1. U Apps Script Project Settings ručno se upiše Script Property `BOOTSTRAP_ADMIN_PIN`.
2. Pokrene se helper `initializeFirstAppAdminFromScriptProperty()`.
3. Helper pročita PIN, odmah briše Script Property, hashira PIN i upisuje samo `pin_hash` i `pin_salt`.
4. Helper vraća sanitized korisnika bez PIN-a, `pin_hash` i `pin_salt`.

PIN ne sme biti u kodu, promptu, dokumentaciji, audit payload-u ili izveštaju.

`ok_for_deploy = true` znači da su struktura baze, app session sheet, audit kolone, duplikati i primarni aktivni ADMIN sa PIN-om spremni za Fazu 5 deploy/runtime QA.

## Faza 4.7: privremeni web bootstrap

Pošto `clasp run` u trenutnom okruženju ne može da izvrši helper funkcije, dodat je privremeni web bootstrap ekran:

```text
?bootstrap=app-login&token=<TOKEN>
```

Ekran omogućava:

- readiness proveru,
- dopunu `USERS` app login kolona,
- kreiranje/dopunu `APP_SESSIONS`,
- dopunu `AUDIT_LOG` app audit kolona,
- kontrolisano rešavanje poznatog dupliranog `USR_ADMIN_MILANKO` reda sa emailom `mzeg76@google.com`,
- unos PIN-a za primarnog app ADMIN korisnika `MILANKO`,
- ponovni readiness report.

PIN se unosi kroz HTML formu i ne ide kroz URL. Backend ga koristi samo za generisanje `pin_hash` i `pin_salt`. PIN, `pin_hash` i `pin_salt` se ne vraćaju u response.

Ako je podešen Script Property `APP_LOGIN_BOOTSTRAP_TOKEN`, forma mora poslati isti token. Pošto `clasp run` trenutno ne dozvoljava pouzdano postavljanje Script Properties-a, Faza 4.7 koristi jednu privremenu hardcoded token konstantu `TEMP_APP_LOGIN_BOOTSTRAP_TOKEN`. Token mora biti uklonjen u cleanup patch-u.

Ovaj endpoint je privremen. Posle uspešnog bootstrap-a i potvrde `ok_for_deploy = true`, obavezan je cleanup patch koji uklanja ili trajno zaključava:

- `?bootstrap=app-login`,
- `TEMP_APP_LOGIN_BOOTSTRAP_TOKEN`,
- `apiGetAppLoginBootstrapReadiness`,
- `apiRunAppLoginBootstrap`,
- web bootstrap HTML stranicu.
