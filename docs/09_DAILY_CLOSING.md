# Daily Closing

## Svrha

Dnevni zakljucak je formalna kontrola kraja dana za jednu blagajnu i jednu valutu. On poredi sistemski izracunato stanje sa fizicki prebrojanim stanjem.

Dnevni zaključak ne pravi promet i ne menja iznose na blagajničkim događajima. Dnevni zaključak samo evidentira obračunsko stanje, fizičko stanje, razliku i zaključava događaje koji su ušli u zaključak.

## Razlika izmedju smene i dnevnog zakljucka

Smena odredjuje odgovornost nad blagajnom tokom rada. Dnevni zakljucak zatvara poslovni dan za blagajnu i valutu.

Smena ne pravi promet. Dnevni zakljucak takodje ne pravi promet. Stanje blagajne i dalje dolazi samo iz knjizenih blagajnickih dogadjaja.

## DAILY_CLOSING polja

| Field | Required | Notes |
|---|---:|---|
| closing_id | yes | Generated ID |
| closing_date | yes | Business date |
| cashbox_id | yes | Blagajna |
| currency | yes | Valuta |
| opening_balance | yes | Izracunato stanje pre pocetka dana |
| total_in | yes | Ukupan posted priliv na dan zakljucka |
| total_out | yes | Ukupan posted odliv na dan zakljucka |
| calculated_balance | yes | `opening_balance + total_in - total_out` |
| physical_balance | yes | Fizicki prebrojan novac |
| difference | yes | `physical_balance - calculated_balance` |
| status | yes | DRAFT, CLOSED, CLOSED_WITH_DIFFERENCE, LOCKED, CANCELLED |
| closed_by | no | Korisnik koji je zakljucio dan |
| closed_at | no | Vreme zakljucka |
| locked_by | no | Korisnik koji je administrativno zakljucao zakljucak |
| locked_at | no | Vreme administrativnog zakljucavanja |
| note | no | Napomena |
| updated_at | no | Vreme poslednje izmene |

## Statusi

| Status | Znacenje |
|---|---|
| DRAFT | Pripremljen, ali nije formalno zakljucen |
| CLOSED | Zakljucen bez razlike |
| CLOSED_WITH_DIFFERENCE | Zakljucen sa razlikom |
| LOCKED | Administrativno zakljucan |
| CANCELLED | Administrativno otkazan |

## Pravilo obracuna

Opening balance se racuna iz svih `POSTED` i `LOCKED` dogadjaja pre datuma zakljucka.

Za dan zakljucka racunaju se samo `POSTED` dogadjaji za tacan `closing_date`, `cashbox_id` i `currency`.

```text
calculated_balance = opening_balance + total_in - total_out
```

`IN` dogadjaji ulaze u `total_in`. `OUT` dogadjaji ulaze u `total_out`. `NEUTRAL` dogadjaji se ignorisu.

## Fizicko stanje i razlika

Fizicko stanje je obavezno za `closeDailyCashbox()`. Mora biti broj i ne sme biti negativno.

Razlika se racuna kao:

```text
difference = physical_balance - calculated_balance
```

Ako je razlika nula, status je `CLOSED`. Ako razlika nije nula, status je `CLOSED_WITH_DIFFERENCE`.

## Zakljucavanje dogadjaja

Kada se dnevni zakljucak kreira, svi ukljuceni `POSTED` cash events prelaze u `LOCKED`.

Zakljucavanje:

1. ne menja iznos,
2. ne menja tip dogadjaja,
3. ne brise dogadjaj,
4. popunjava `locked_by` i `locked_at`,
5. dodaje audit log `LOCK` kao zbirni zapis.

Vec zakljucani, otkazani ili stornirani dogadjaji se ne zakljucavaju ponovo.

## Sprecavanje duplikata

Sistem odbija drugi nezatvoren odnosno neotkazan zakljucak za istu kombinaciju:

1. `cashbox_id`,
2. `currency`,
3. `closing_date`.

## Sprecavanje zakljucka dok je smena otvorena

`closeDailyCashbox()` odbija zakljucak ako za blagajnu postoji `OPEN` smena. Override nije implementiran u ovom tasku.

## Audit

Svaki dnevni zakljucak dodaje audit log:

1. `CREATE` za kreirani red u `DAILY_CLOSING`,
2. `LOCK` za zakljucane cash events,
3. `LOCK` za administrativno zakljucavanje dnevnog zakljucka ako se pozove `lockDailyClosing()`.

## Funkcije

`prepareDailyClosing(cashboxId, currency, closingDate)` vraca preview i ne upisuje red u `DAILY_CLOSING`.

`closeDailyCashbox(cashboxId, currency, closingDate, physicalBalance, note)` kreira dnevni zakljucak i zakljucava ukljucene posted dogadjaje.

`findDailyClosing(cashboxId, currency, closingDate)` sluzi za sprecavanje duplikata.

`listDailyClosings(filters)` vraca zakljucke po jednostavnim filterima.

`lockDailyClosing(closingId)` administrativno zakljucava vec kreiran zakljucak.

`cancelDailyClosing(closingId, reason)` je bezbedan placeholder i baca gresku, jer otkazivanje zakljucka posle zakljucavanja dogadjaja pripada kasnijem correction workflow-u.

## Ogranicenja

U ovom tasku nisu implementirani PDF izvestaj, apoenska specifikacija, automatsko otkljucavanje dogadjaja, knjigovodstveno knjizenje, ERP integracija i BI dashboard.
