# Shifts

## Svrha

Smena predstavlja kontrolisani period odgovornosti blagajnika za jednu blagajnu.

Smena ne menja stanje blagajne. Smena određuje odgovornost nad blagajnom, dok se stanje blagajne računa iz knjiženih blagajničkih događaja.

## Poslovno znacenje

Smena mora da odgovori ko je odgovoran za blagajnu, kada je odgovornost pocela, koje je izracunato stanje postojalo na otvaranju, kome je blagajna predata i da li postoji razlika izmedju izracunatog i fizicki prebrojanog stanja.

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
| opened_by | yes | Korisnik koji je otvorio smenu |
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

## Pregled aktivne smene i stanja

`getActiveShiftForCashbox(cashboxId)` vraca jednu otvorenu smenu ili `null`. Ako postoje dve otvorene smene za istu blagajnu, baca se greska integriteta podataka.

`getMyActiveShifts()` vraca otvorene smene trenutnog korisnika.

`getShiftBalance(shiftId)` vraca smenu i trenutno izracunato stanje po valutama. Stanje se ne cita iz rucno unetog polja, vec iz `CASH_EVENTS` sa statusom `POSTED` ili `LOCKED`.

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

`assertCashboxHasOpenShift(cashboxId)` proverava da blagajna ima otvorenu smenu. U ovom tasku helper je implementiran, ali se jos ne forsira globalno nad uplatama, isplatama i transferima. Kasnije ga treba koristiti za cash inflow, cash outflow, transfer, primopredaju i dnevni zakljucak.

## Audit

Svaka vazna akcija dodaje red u `AUDIT_LOG`:

1. otvaranje smene: `CREATE`,
2. primopredaja: `UPDATE`,
3. zatvaranje bez razlike: `LOCK`,
4. zatvaranje sa razlikom: `UPDATE`,
5. otkazivanje: `CANCEL`.
