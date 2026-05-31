# Shifts

## Svrha

Smena predstavlja kontrolisani operativni period rada jedne blagajne.

Smena grupiše glavnog blagajnika, ostale korisnike koji rade u toku smene i sve događaje nastale u tom periodu.

Smena sama ne menja stanje blagajne. Stanje blagajne se računa iz knjiženih blagajničkih događaja. Kada se u toku smene uradi presek/popisana razlika, sistem razliku evidentira kroz korektivni blagajnički događaj.

## Poslovno znacenje

Smena mora da odgovori ko je glavni blagajnik, kada je smena počela, koje je izračunato stanje postojalo na otvaranju, koji događaji su nastali u toku smene, kome je blagajna predata i da li postoji razlika između izračunatog i fizički prebrojanog stanja.

U toku jedne smene više korisnika može raditi u aplikaciji. Direktno knjiženje gotovinskih događaja može raditi samo glavni blagajnik smene. Ostali korisnici koriste zahteve za uplatu ili isplatu.

## Statusi

Koriste se sledeci statusi:

| Status | Znacenje |
|---|---|
| OPEN | Smena je aktivna |
| HANDED_OVER | Smena je predata drugom korisniku |
| CLOSED | Smena je zatvorena bez razlike |
| CLOSED_WITH_DIFFERENCE | Smena je zatvorena ili predata sa razlikom |
| CANCELLED | Smena je administrativno otkazana |

## SHIFTS polja

| Field | Required | Notes |
|---|---:|---|
| shift_id | yes | Generated ID |
| cashbox_id | yes | Blagajna |
| opened_by | yes | Glavni blagajnik smene, odnosno korisnik koji je otvorio smenu |
| opened_at | yes | Vreme otvaranja |
| opening_note | no | Napomena pri otvaranju |
| opening_balance_json | no | Izracunato stanje po valutama pri otvaranju |
| closed_by | no | Korisnik koji je zatvorio smenu |
| closed_at | no | Vreme zatvaranja |
| handover_to | no | Korisnik koji prima blagajnu |
| handover_at | no | Vreme primopredaje |
| closing_balance_json | no | Izracunato stanje po valutama pri zatvaranju ili predaji |
| physical_balance_json | no | Fizicki prebrojano stanje po valutama |
| difference_json | no | Razlika po valutama |
| status | yes | OPEN, HANDED_OVER, CLOSED, CLOSED_WITH_DIFFERENCE, CANCELLED |
| note | no | Napomena |
| updated_at | no | Vreme poslednje izmene |

## Otvaranje smene

`openShift(cashboxId, openingNote)` otvara smenu samo za aktivnu blagajnu i samo ako za tu blagajnu ne postoji druga `OPEN` smena. Sistem racuna pocetno stanje po podrzanim valutama kroz `calculateCashboxBalance(cashboxId, currency)` i cuva ga u `opening_balance_json`.

Dozvoljene role za otvaranje su `CASHIER`, `CASHIER_SUPERVISOR` i `ADMIN`.

Korisnik koji otvori smenu postaje glavni blagajnik te smene. Za jednu blagajnu može postojati samo jedna aktivna smena.

## Pregled aktivne smene i stanja

`getActiveShiftForCashbox(cashboxId)` vraca jednu otvorenu smenu ili `null`. Ako postoje dve otvorene smene za istu blagajnu, baca se greska integriteta podataka.

`getMyActiveShifts()` vraca otvorene smene trenutnog korisnika.

`getShiftBalance(shiftId)` vraca smenu i trenutno izracunato stanje po valutama. Stanje se ne cita iz rucno unetog polja, vec iz `CASH_EVENTS` sa statusom `POSTED` ili `LOCKED`.

## Presek blagajne u toku smene

U toku smene može se uraditi jedan ili više preseka blagajne. Presek je fizički popis gotovine i čekova po valuti.

Ako je fizički popis jednak obračunatom stanju, presek se evidentira samo u `CASH_COUNTS`.

Ako postoji razlika, sistem:

1. evidentira presek u `CASH_COUNTS`,
2. kreira automatski korektivni `CASH_EVENTS` događaj tipa `CORRECTION`,
3. za višak knjiži korekciju `IN`,
4. za manjak knjiži korekciju `OUT`,
5. čuva vezu prema korektivnom događaju u `CASH_COUNTS.adjustment_event_id`.

Na taj način blagajna posle preseka nastavlja od fizički utvrđenog stanja, bez ručnog menjanja salda.

## Primopredaja

`handoverShift(shiftId, handoverToUserEmail, physicalBalanceByCurrency, note)` zatvara odgovornost trenutnog blagajnika i belezi korisnika koji prima blagajnu.

Primopredaju moze uraditi korisnik koji je otvorio smenu ili korisnik sa rolom `CASHIER_SUPERVISOR`, `ADMIN` ili `FINANCE`.

Korisnik koji prima smenu mora postojati, biti aktivan i imati rolu `CASHIER`, `CASHIER_SUPERVISOR` ili `ADMIN`.

Ako je fizicko stanje prosledjeno, sistem racuna razliku kao:

```text
fizicko stanje - izracunato stanje
```

Ako nema razlike, status postaje `HANDED_OVER`. Ako postoji razlika, status postaje `CLOSED_WITH_DIFFERENCE`.

Ogranicenje: sistem u ovom tasku ne otvara automatski novu smenu za korisnika koji prima blagajnu, jer bez sigurne impersonacije ne treba kreirati smenu u ime drugog korisnika.

## Zatvaranje smene

`closeShift(shiftId, physicalBalanceByCurrency, note)` zatvara otvorenu smenu. Fizicko stanje je obavezno u ovom tasku.

Ako nema razlike, status postaje `CLOSED`. Ako postoji razlika, status postaje `CLOSED_WITH_DIFFERENCE`.

## Otkazivanje smene

`cancelShift(shiftId, reason)` je administrativna akcija. Razlog je obavezan. Zatvorene smene ne mogu se otkazati.

Dozvoljene role za otkazivanje su `ADMIN`, `FINANCE` i `CASHIER_SUPERVISOR`.

## Aktivna smena kao validacija

`assertCashboxHasOpenShift(cashboxId)` proverava da blagajna ima otvorenu smenu.

Direktne uplate i isplate sme da knjiži samo glavni blagajnik aktivne smene. Ostali korisnici u aktivnoj smeni koriste zahteve.

## Audit

Svaka vazna akcija dodaje red u `AUDIT_LOG`:

1. otvaranje smene: `CREATE`,
2. primopredaja: `UPDATE`,
3. zatvaranje bez razlike: `LOCK`,
4. zatvaranje sa razlikom: `UPDATE`,
5. otkazivanje: `CANCEL`.
