# User Roles

## Svrha

Ovaj dokument opisuje minimalni korisnicki model za BLAGAJNA WEB.

Patch 02 ne uvodi paralelni sistem korisnika. Koristi se postojeca tabela `USERS`, postojece role i server-side matrica privilegija u `Users.gs`.

## Korisnicki model

Tabela `USERS` ostaje osnovni izvor korisnika:

| Field | Znacenje |
|---|---|
| user_id | Interni ID korisnika |
| email | Google Workspace email korisnika |
| full_name | Ime i prezime |
| role | Jedna od podrzanih rola |
| active | Da li korisnik sme da koristi aplikaciju |
| default_cashbox_id | Podrazumevana blagajna / osnovno ogranicenje blagajne |
| created_at | Vreme kreiranja |
| updated_at | Vreme poslednje izmene |

U ovom patch-u se ne dodaje posebna tabela privilegija. Privilegije se izvode iz role.

## Role

| Role | Znacenje |
|---|---|
| ADMIN | Administracija sistema, korisnika i prava |
| DIRECTOR | Direktor / visi pregled i odobravanje |
| FINANCE | Finansijska kontrola |
| CASHIER_SUPERVISOR | Supervizor blagajne |
| CASHIER | Blagajnik koji izvrsava isplate kroz naloge |
| APPROVER | Ovlasteno lice za odobravanje zahteva |
| REQUESTER | Korisnik koji podnosi zahteve |
| VIEWER | Ograniceni pregled |

Semantika `AUTHORIZED_PERSON` iz zadatka mapira se na postojece role `APPROVER`, `FINANCE`, `DIRECTOR` i `CASHIER_SUPERVISOR`, zavisno od akcije.

## Privilegije

Minimalna matrica privilegija postoji u `USER_PRIVILEGES`:

```text
users:create
users:update
users:disable
users:assign_roles
payment_requests:create
payment_requests:view_own
payment_requests:view_all
payment_requests:approve
payment_requests:reject
payment_requests:return_for_correction
payment_orders:create
payment_orders:view
payment_orders:issue
payment_orders:reject
payment_orders:execute
documents:attach
documents:view
documents:cancel
audit:view
```

Server-side provere su autoritativne. Frontend sme da sakrije dugmad, ali ne sme da bude jedini sloj zastite.

## Administracija korisnika

Dodate backend funkcije:

| Funkcija | Svrha |
|---|---|
| `listUsers(filters)` | Lista korisnike za ovlascene administratore |
| `createUser(userData)` | Kreira korisnika u `USERS` |
| `updateUserPermissions(userId, permissionsData)` | Menja rolu, aktivnost, ime ili podrazumevanu blagajnu |
| `getPermissionsMatrix()` | Vraca matricu rola i privilegija |

API wrapper-i:

| API | Backend |
|---|---|
| `apiListUsers(filters)` | `listUsers` |
| `apiCreateUser(userData)` | `createUser` |
| `apiUpdateUserPermissions(userId, permissionsData)` | `updateUserPermissions` |
| `apiGetPermissionsMatrix()` | `getPermissionsMatrix` |

## Audit log

Kreiranje i izmene korisnika pisu `AUDIT_LOG`:

| Akcija | Audit action | Komentar |
|---|---|---|
| Kreiranje korisnika | CREATE | `USER_CREATED` |
| Izmena imena | UPDATE | `USER_UPDATED` |
| Izmena role | UPDATE | `USER_ROLE_CHANGED` |
| Deaktivacija | UPDATE | `USER_DISABLED` |
| Izmena blagajne | UPDATE | `USER_CASHBOX_ACCESS_CHANGED` |

Sistem ne dozvoljava deaktivaciju ili skidanje role poslednjem aktivnom `ADMIN` korisniku.

## UI

Patch 03 dodaje desktop ekran `Korisnici i prava`.

Ekran je dostupan kroz aktivni desktop meni u sekciji `Upravljanje`.

Ekran vidi samo korisnik koji ima rolu `ADMIN` ili bar jedno od prava:

```text
users:create
users:update
users:assign_roles
```

Ako korisnik nema pravo, ekran prikazuje:

```text
Nemate ovlašćenje za administraciju korisnika i prava.
```

## Administracija korisnika kroz UI

Ekran podrzava:

- pregled korisnika iz `apiListUsers`,
- pregled matrice prava iz `apiGetPermissionsMatrix`,
- KPI kartice za ukupan broj korisnika, aktivne, neaktivne, admine, blagajnike i role,
- filtere po pretrazi, roli, statusu i podrazumevanoj blagajni,
- tabelu korisnika sa selekcijom reda,
- desni panel sa osnovnim podacima i privilegijama,
- modal `Dodaj korisnika`,
- modal `Izmeni korisnika`,
- aktivaciju i deaktivaciju korisnika kroz `apiUpdateUserPermissions`.

UI ne upisuje direktno u Sheet. Sve izmene idu kroz backend API, a audit log ostaje na backend funkcijama.

UI validira email, ime i rolu pre slanja, ali backend i dalje ostaje autoritativan za poslednju proveru prava i pravilo poslednjeg aktivnog `ADMIN` korisnika.
