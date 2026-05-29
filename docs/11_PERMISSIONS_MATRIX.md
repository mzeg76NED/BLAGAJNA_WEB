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

## Napomene

`yes-own` znaci da korisnik moze da radi samo nad svojim zapisom ili svojom smenom.

`limited` znaci da korisnik vidi samo sopstvene zahteve ili ogranicen operativni pregled.

Server-side provere su autoritativne. UI je samo pomocni sloj i ne sme da odlucuje o autorizaciji.
