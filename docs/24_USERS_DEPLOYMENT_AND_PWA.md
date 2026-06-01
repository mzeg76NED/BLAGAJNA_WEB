# Korisnici, role, javni deployment i PWA

## Korisnici i role

Korisnici se definišu u Google Sheet tabeli `USERS`.

Obavezna polja:

| Polje | Značenje |
|---|---|
| `user_id` | Interni ID korisnika, npr. `USR-001` |
| `email` | Google nalog korisnika |
| `full_name` | Ime i prezime |
| `role` | Rola korisnika |
| `active` | `TRUE` za aktivnog korisnika |
| `default_cashbox_id` | Podrazumevana blagajna, npr. `CB_MAIN` |
| `created_at` | Datum kreiranja |
| `updated_at` | Datum izmene |

Role su definisane u `src/00_Config.gs` u konstanti `USER_ROLES`.

Podržane role:

```text
ADMIN
DIRECTOR
FINANCE
CASHIER_SUPERVISOR
CASHIER
APPROVER
REQUESTER
VIEWER
```

## Kako dodati korisnika

1. Otvoriti Google Sheet bazu aplikacije.
2. Otvoriti tab `USERS`.
3. Dodati novi red.
4. Upisati email korisnika tačno kako se prijavljuje na Google.
5. Dodeliti rolu u koloni `role`.
6. Postaviti `active` na `TRUE`.
7. Po potrebi postaviti `default_cashbox_id`, najčešće `CB_MAIN`.

Primer:

```text
USR-010 | pera.petrovic@example.com | Pera Petrović | CASHIER | TRUE | CB_MAIN | 2026-06-01 | 
```

## Javni deployment

Da aplikaciju koriste korisnici van domena, Apps Script deployment mora biti podešen u Google Apps Script konzoli:

```text
Deploy > Manage deployments > Edit
Execute as: User accessing the web app
Who has access: Anyone
```

Ako je izabrano `Only myself` ili `Anyone within domain`, korisnici van domena neće moći da koriste aplikaciju.

Važno: i kada je web app javno dostupan, korisnik i dalje mora postojati u `USERS` i mora imati aktivnu rolu. Javni link ne znači da nepoznat korisnik dobija prava u aplikaciji.

## PWA / instalacija na mobilni

Aplikacija ima PWA osnovu:

1. `manifest` ruta kroz `?view=manifest`,
2. service worker ruta kroz `?view=sw`,
3. `manifest` link u desktop i mobile HTML-u.

Na telefonu korisnik treba da otvori mobile link u browseru i izabere:

```text
Add to Home screen / Install app
```

PWA instalacija zavisi od browsera, HTTPS okruženja i Google Apps Script ograničenja. Ako browser ne ponudi instalaciju odmah, aplikacija i dalje radi kao web aplikacija.
