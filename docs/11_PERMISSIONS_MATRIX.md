# Permissions Matrix

Ovaj dokument definise osnovna prava pristupa za BLAGAJNA WEB.

Prava pristupa se ne oslanjaju na frontend. Frontend može da sakrije dugme, ali server mora ponovo da proveri pravo korisnika za svaku akciju.

## Uloge

| Role | Znacenje |
|---|---|
| ADMIN | Administrator sistema |
| DIRECTOR | Direktor / pregled i odobravanje |
| FINANCE | Finansijska kontrola |
| CASHIER_SUPERVISOR | Nadredjeni za blagajnu |
| CASHIER | Blagajnik |
| APPROVER | Ovlasceni odobravalac |
| REQUESTER | Korisnik koji podnosi zahteve |
| VIEWER | Samo pregled |

## Matrica prava

Patch 02 uvodi server-side privilegije u `Users.gs`. Ova tabela opisuje nameru matrice; backend funkcije i dalje rade dodatne provere statusa, vlasnistva i poslovnog toka.

| Action | ADMIN | DIRECTOR | FINANCE | CASHIER_SUPERVISOR | CASHIER | APPROVER | REQUESTER | VIEWER |
|---|---|---|---|---|---|---|---|---|
| View dashboard | yes | yes | yes | yes | yes | yes | limited | yes |
| Create payment request | yes | yes | yes | yes | yes | yes | yes | no |
| Submit own payment request | yes | yes | yes | yes | yes | yes | yes | no |
| Approve payment request | yes | yes | yes | yes | no | yes | no | no |
| Reject payment request | yes | yes | yes | yes | no | yes | no | no |
| Create order from request | yes | yes | yes | yes | no | yes | no | no |
| Create direct payment order | yes | yes | yes | yes | no | no | no | no |
| Issue payment order | yes | yes | yes | yes | no | yes | no | no |
| Reject order as cashier | yes | no | no | yes | yes | no | no | no |
| Execute payment order | yes | no | no | yes | yes | no | no | no |
| Create cash inflow | yes | no | yes | yes | yes | no | no | no |
| Attach document | yes | yes | yes | yes | yes | yes | yes | no |
| Cancel document | yes | yes | yes | yes | no | no | no | no |
| Open shift | yes | no | no | yes | yes | no | no | no |
| Handover shift | yes | no | yes | yes | yes-own | no | no | no |
| Close shift | yes | no | yes | yes | yes-own | no | no | no |
| Daily closing | yes | yes | yes | yes | no | no | no | no |
| View audit log | yes | yes | yes | yes | no | no | no | no |
| Initialize database | yes | no | no | no | no | no | no | no |

## Privilegije po backend modelu

| Privilege | Znacenje |
|---|---|
| `users:create` | Kreiranje korisnika |
| `users:update` | Izmena osnovnih podataka korisnika |
| `users:disable` | Deaktivacija korisnika |
| `users:assign_roles` | Dodela i promena role |
| `payment_requests:create` | Kreiranje zahteva |
| `payment_requests:view_own` | Pregled sopstvenih zahteva |
| `payment_requests:view_all` | Pregled svih zahteva |
| `payment_requests:approve` | Odobravanje zahteva |
| `payment_requests:reject` | Odbijanje zahteva |
| `payment_requests:return_for_correction` | Vracanje zahteva na dopunu |
| `payment_orders:create` | Kreiranje naloga |
| `payment_orders:view` | Pregled naloga |
| `payment_orders:issue` | Izdavanje/slanje naloga |
| `payment_orders:reject` | Odbijanje naloga u blagajni |
| `payment_orders:execute` | Blagajnicko izvrsenje naloga |
| `documents:attach` | Dodavanje priloga |
| `documents:view` | Pregled priloga |
| `documents:cancel` | Otkazivanje/zamena priloga |
| `audit:view` | Pregled audit log-a |

## Mapiranje korisnika i prava

`ADMIN` ima sve privilegije.

`DIRECTOR`, `FINANCE`, `CASHIER_SUPERVISOR` i `APPROVER` imaju prava za pregled i obradu zahteva, kao i kreiranje/izdavanje naloga u skladu sa postojecim tokom.

`CASHIER` ima operativna prava za pregled naloga, odbijanje naloga u blagajni i blagajnicko izvrsenje naloga. `CASHIER` ne kreira korisnike i ne menja prava.

`REQUESTER` kreira i prati sopstvene zahteve. Moze da dodaje i vidi priloge samo kada ima poslovnu vidljivost nad entitetom.

`VIEWER` ima ogranicen pregled i nema operativne akcije.

## Napomene

`yes-own` znaci da korisnik moze da radi samo nad svojim zapisom ili svojom smenom.

`limited` znaci da korisnik vidi samo sopstvene zahteve ili ogranicen operativni pregled.

Server-side provere su autoritativne. UI je samo pomocni sloj i ne sme da odlucuje o autorizaciji.

Korisnicka administracija postoji kao backend/API osnova i desktop UI ekran `Korisnici i prava`.

UI koristi:

- `apiListUsers`,
- `apiCreateUser`,
- `apiUpdateUserPermissions`,
- `apiGetPermissionsMatrix`.

Ekran se prikazuje samo za korisnika sa rolom `ADMIN` ili privilegijom `users:create`, `users:update` ili `users:assign_roles`. Korisnik bez tih prava vidi poruku zabrane i ne dobija listu korisnika.
