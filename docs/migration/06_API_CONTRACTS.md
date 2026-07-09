# FAZA 2 - API Contracts Draft

Datum: 2026-07-09  
Status: DRAFT  
Izvor: `src/WebApp.gs`, `docs/migration/01_GOOGLE_SCRIPT_RUN_MAP.md`

## 1. Response envelope

Postojeci Apps Script API koristi `apiWrap_`. Novi API treba privremeno da zadrzi kompatibilnu semantiku:

```json
{
  "success": true,
  "data": {}
}
```

Za greske:

```json
{
  "success": false,
  "error": "Jasna poslovna poruka"
}
```

Ne vracati stack trace, SQL detalje ili tajne vrednosti.

## 2. Health endpoint

Pocetni endpoint:

```text
GET /api/health
```

Svrha:

- proverava da Cloudflare Pages Functions sloj radi,
- ne cita bazu,
- ne zahteva sesiju.

## 3. App session header

Predlog za novi API:

```text
Authorization: Bearer <session_id>
```

Privremeno, zbog kompatibilnosti sa legacy frontendom, adapter moze slati `session_id` kao poslednji argument dok se UI ne prebaci na REST client.

## 4. Modul po modul

Prvi funkcionalni modul za implementaciju mora biti auth/session:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `POST /api/auth/check`
- `POST /api/auth/switch-user`

Slede:

1. cashboxes,
2. shifts,
3. cash events / cashbook,
4. payment orders,
5. payment requests,
6. users and permissions,
7. documents,
8. reports.

## 5. Implementirani migracioni endpoints

### Auth/session

Trenutno postoje:

- `GET /api/health`
- `GET /api/status`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `POST /api/auth/check`
- `POST /api/auth/switch-user`

Auth endpoint-i su migraciona osnova i cekaju runtime proveru nad realnim bootstrap korisnikom.

### Cashboxes

Prvi read-only poslovni endpoint:

```text
GET /api/cashboxes
```

Zahteva aplikativnu sesiju:

```text
Authorization: Bearer <session_id>
```

Response:

```json
{
  "success": true,
  "data": {
    "cashboxes": [
      {
        "cashbox_id": "CB_MAIN",
        "name": "Glavna blagajna",
        "location": "",
        "active": true
      }
    ],
    "count": 1
  }
}
```

Access pravilo:

- `CASHIER` sa `default_cashbox_id` vidi samo svoju blagajnu,
- ostale role vide aktivne blagajne,
- endpoint je read-only i ne pise audit.

### Shifts

Prvi read-only endpoint za smene:

```text
GET /api/shifts/mine/active
```

Zahteva aplikativnu sesiju:

```text
Authorization: Bearer <session_id>
```

ili:

```text
X-App-Session-Id: <session_id>
```

Response:

```json
{
  "success": true,
  "data": {
    "shifts": [
      {
        "shift_id": "SHF-...",
        "cashbox_id": "CB_MAIN",
        "opened_by": "user@example.com",
        "opened_at": "...",
        "opening_note": "",
        "status": "OPEN"
      }
    ],
    "count": 1
  }
}
```

Endpoint cita samo `OPEN` smene gde je `opened_by` jednak email-u aplikativnog korisnika. Ne otvara, ne zatvara i ne menja smenu.

Prvi write endpoint za smene:

```text
POST /api/shifts/open
```

Zahteva aplikativnu sesiju i privilegiju:

```text
shifts:open
```

Body:

```json
{
  "cashbox_id": "CB_MAIN",
  "opening_note": "Početak rada"
}
```

Ako `cashbox_id` nije poslat, koristi se blagajna iz aktivne sesije ili `default_cashbox_id` aplikativnog korisnika.

Validacije:

- sesija postoji i aktivna je,
- korisnik ima `shifts:open`,
- blagajna postoji i aktivna je,
- `CASHIER` sa `default_cashbox_id` moze otvoriti samo svoju blagajnu,
- blagajna nema vec otvorenu smenu.

Efekti:

- upisuje red u `shifts` sa statusom `OPEN`,
- racuna `opening_balance_json` iz `cashbox_balances` za aktivne valute,
- upisuje `CREATE` u `audit_log`,
- vezuje `shift_id` na aktivnu `app_sessions` sesiju.

Ovaj endpoint ne menja stanje blagajne. Stanje i dalje proizlazi samo iz `cash_events`.

Prvi write endpoint za zatvaranje smene:

```text
POST /api/shifts/close
```

Zahteva aplikativnu sesiju i privilegiju:

```text
shifts:close
```

Body:

```json
{
  "shift_id": "SHF-...",
  "physical_balance_json": {
    "RSD": 0,
    "EUR": 0
  },
  "note": "Kraj rada"
}
```

Validacije:

- sesija postoji i aktivna je,
- korisnik ima `shifts:close`,
- smena postoji i ima status `OPEN`,
- korisnik je otvorio smenu ili ima rolu `ADMIN`, `FINANCE` ili `CASHIER_SUPERVISOR`,
- `physical_balance_json` sadrzi sve aktivne valute i numericke vrednosti.

Efekti:

- racuna `closing_balance_json` iz `cashbox_balances`,
- racuna `difference_json` kao fizicko stanje minus izracunato stanje,
- postavlja status `CLOSED` ako nema razlike ili `CLOSED_WITH_DIFFERENCE` ako postoji razlika,
- upisuje audit akciju `LOCK` bez razlike ili `UPDATE` sa razlikom,
- skida `shift_id` sa aktivnih sesija vezanih za zatvorenu smenu.

Ovaj endpoint ne menja stanje blagajne i ne kreira korektivne `cash_events`. Korekcije kroz preseke smene ostaju poseban migracioni korak.

## 6. Otvoreno pre implementacije

Za svaku legacy funkciju jos treba dopuniti:

- tacne parametre,
- tacan response shape,
- tabele koje cita,
- tabele koje menja,
- audit dogadjaje,
- rollback uslove,
- test ekvivalentnosti.
