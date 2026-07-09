# FAZA 3 - Auth and Session Model

Datum: 2026-07-09  
Status: DRAFT / MIGRATION FOUNDATION  
Source of truth: legacy Google Apps Script dok se ne odobri cutover.

## 1. Princip

Migracioni auth model prenosi postojeci aplikativni login iz Google Apps Script sistema:

- Google nalog je tehnicka sesija.
- Aplikativni korisnik je red u `users`.
- Aplikativna sesija je red u `app_sessions`.
- Poslovna prava se izvode iz role i `role_permissions`.
- PIN, `pin_hash` i `pin_salt` se ne vracaju kroz API.

Novi Cloudflare/Supabase sloj je trenutno adapter osnova. Ne zamenjuje legacy Apps Script source of truth.

## 2. Tabele

### `users`

Relevantna polja:

- `user_id`
- `email`
- `full_name`
- `role`
- `active`
- `default_cashbox_id`
- `user_code`
- `pin_hash`
- `pin_salt`
- `last_login_at`
- `last_logout_at`
- `failed_login_count`
- `locked_until`
- `last_google_session_email`

`pin_hash` i `pin_salt` su server-side polja. Ne smeju biti deo frontend response-a.

### `app_sessions`

Relevantna polja:

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

Sesija je validna samo ako:

- postoji,
- `active = true`,
- `expires_at` je u buducnosti,
- povezani `users` red postoji i aktivan je.

### `roles`, `permissions`, `role_permissions`

`role_permissions` se puni iz postojece legacy fallback matrice `ROLE_PRIVILEGES` iz `src/Users.gs`.

`ADMIN` se u legacy kodu tretira kao wildcard rola. U seed modelu se zbog jasnije SQL osnove ipak upisuju sva poznata prava za `ADMIN`.

Potvrdjeno stanje posle rucnog SQL Editor seed-a:

```text
role_permissions = 122
```

## 3. API adapter endpoints

### `GET /api/health`

Lagani endpoint bez pristupa bazi.

Namena:

- potvrda da Cloudflare Pages Functions sloj radi,
- prikaz `BACKEND_MODE`, `APP_ENV`, `APP_VERSION`.

### `GET /api/status`

Status migracionog API sloja.

Namena:

- prikaz source-of-truth stanja,
- potvrda da li su Supabase env vrednosti dostupne,
- opcioni DB ping samo kada je `STATUS_DB_CHECK=true`.

Bez `STATUS_DB_CHECK=true`, endpoint ne cita bazu.

### `POST /api/auth/login`

Prijavljuje aplikativnog korisnika preko `user_code` + PIN.

Body:

```json
{
  "user_code": "MILANKO",
  "pin": "****",
  "cashbox_id": "CB_MAIN",
  "device_label": "Desktop"
}
```

PIN se proverava istim hash modelom kao u legacy Apps Script kodu:

```text
SHA-256(pin + ":" + pin_salt) -> hex
```

Endpoint:

- ne vraca PIN,
- ne vraca `pin_hash`,
- ne vraca `pin_salt`,
- resetuje `failed_login_count` posle uspesne prijave,
- upisuje `APP_USER_LOGIN` u `audit_log`,
- upisuje `APP_USER_LOGIN_FAILED` za neuspele pokusaje.

Posle 5 neuspelih PIN pokusaja korisnik se privremeno zakljucava na 15 minuta.

### `GET /api/auth/session`

Cita session id iz:

- `Authorization: Bearer <session_id>`,
- `x-session-id` header-a.

Ako Supabase nije konfigurisan, vraca neaktivnu sesiju bez greske da bi migracioni shell mogao da radi bez tajni.

Ako je sesija validna, vraca sanitized model:

```json
{
  "success": true,
  "data": {
    "active": true,
    "session_id": "SES-...",
    "session_expires_at": "...",
    "google_session_email": "...",
    "cashbox_id": "...",
    "shift_id": "",
    "app_user": {
      "app_user_id": "...",
      "user_code": "...",
      "email": "...",
      "full_name": "...",
      "role": "CASHIER",
      "active": true,
      "default_cashbox_id": "...",
      "privileges": []
    }
  }
}
```

### `POST /api/auth/check`

Proverava sesiju i trazene privilegije.

Body:

```json
{
  "session_id": "SES-...",
  "required_permissions": ["payment_orders:execute"]
}
```

### `POST /api/auth/logout`

Zatvara aplikativnu sesiju.

Session id cita iz:

- `Authorization: Bearer <session_id>`,
- `x-session-id`,
- `session_id` u JSON body-ju.

Endpoint zatvara `app_sessions` red bez brisanja i upisuje `APP_USER_LOGOUT` u `audit_log`.

### `POST /api/auth/switch-user`

Zatvara prethodnu sesiju ako je prosledjena i otvara novu sesiju kroz isti login tok.

Endpoint upisuje:

- `APP_USER_LOGIN`,
- `APP_USER_SWITCH`.

Moze koristiti i `Authorization: Bearer <session_id>`.

Ako sesija nije validna:

```json
{
  "success": false,
  "error": "Sesija je istekla. Prijavite se ponovo."
}
```

Ako korisnik nema pravo:

```json
{
  "success": false,
  "error": "Nemate ovlašćenje za ovu akciju."
}
```

## 4. Namerno odlozeno

Nije jos implementirano:

- RLS politike,
- migracija realnih korisnika i cashbox-a,
- automatski bootstrap prvog admina.

## 5. Bootstrap korisnici i blagajne

`seed.sql` ne kreira korisnike i blagajne automatski.

Razlog:

- trenutni Supabase broj redova je `users = 0` i `cashboxes = 0`,
- dokumentacija pominje `USR_ADMIN_MILANKO`, `MILANKO` i `CB_MAIN`,
- ali realni email, naziv/lokacija blagajne i PIN hash/salt moraju biti potvrdeni pre upisa.

Za rucni SQL Editor bootstrap dodat je template:

```text
supabase/templates/bootstrap_auth_cashbox_template.sql
```

Template se ne sme pokrenuti neizmenjen.

## 6. Security napomene

- `SUPABASE_SERVICE_ROLE_KEY` sme postojati samo u server env-u Cloudflare Functions-a.
- Frontend sme koristiti samo javne vrednosti, nikada service role key.
- `pin_hash`, `pin_salt` i PIN se ne loguju i ne vracaju u response-u.
- Svaki buduci login/logout/switch-user endpoint mora pisati `audit_log`.

## 7. Sledeci korak

Sledeca implementaciona faza:

1. potvrditi bootstrap podatke za `CB_MAIN` i prvog `ADMIN` korisnika,
2. rucno upisati prvog korisnika sa generisanim `pin_hash` i `pin_salt`,
3. runtime testirati `/api/auth/login`, `/api/auth/session`, `/api/auth/check` i `/api/auth/logout`,
4. posle runtime provere nastaviti sa prvim poslovnim read-only API modulom.
