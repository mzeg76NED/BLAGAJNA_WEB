# Reports and Dashboard

Ovaj dokument opisuje operativne izvestaje i jednostavan management dashboard za BLAGAJNA WEB.

Izveštaji ne smeju da menjaju podatke. Izveštaj samo čita postojeće poslovne događaje i prikazuje stanje, otvorene stavke, razlike i izuzetke.

## Svrha

Izvestaji sluze da management, finansije i nadredjeni za blagajnu brzo vide operativno stanje bez direktnog rada u Google Sheets bazi.

## Lista izvestaja

1. Management dashboard summary.
2. Presek stanja blagajni.
3. Otvoreni zahtevi.
4. Zahtevi za odobrenje.
5. Nalozi koji cekaju isplatu.
6. Izvrsene isplate.
7. Nedostajuca dokumenta.
8. Dnevni zakljucci.
9. Razlike.
10. Korekcije i storno.
11. Izuzeci za kontrolu.

## Ko moze da vidi izvestaje

Izvestaje mogu da vide aktivni korisnici sa rolama:

- ADMIN
- DIRECTOR
- FINANCE
- CASHIER_SUPERVISOR
- CASHIER

Za `CASHIER` rolu, ako korisnik ima `default_cashbox_id`, izvestaji su ograniceni na tu blagajnu.

## Dashboard kartice

| Kartica | Znacenje |
|---|---|
| Stanje blagajne | Kratak prikaz obracunatog stanja |
| Zahtevi za odobrenje | Broj zahteva u statusu `SUBMITTED` ili `IN_REVIEW` |
| Nalozi za isplatu | Broj naloga u statusu `WAITING_PAYMENT` ili `PARTIALLY_PAID` |
| Nedostaju dokumenta | Broj entiteta sa `document_status = MISSING` |
| Otvorene smene | Broj smena sa statusom `OPEN` |
| Dnevni zakljucci | Broj zakljucaka za danasnji datum |
| Razlike | Broj dnevnih zakljucaka ili smena sa razlikom |
| Korekcije/storno | Broj danasnjih korekcija i storno zapisa |

## Izvori podataka

Izvestaji citaju postojece sheetove:

1. `CASHBOXES`
2. `CURRENCIES`
3. `PAYMENT_REQUESTS`
4. `PAYMENT_ORDERS`
5. `CASH_EVENTS`
6. `DOCUMENTS`
7. `SHIFTS`
8. `DAILY_CLOSING`

Stanje blagajne se racuna preko postojece funkcije `calculateCashboxBalance(cashboxId, currency)`.

## Filteri

Osnovni filteri su:

1. `cashbox_id`
2. `currency`
3. `date_from`
4. `date_to`
5. `status`

Filteri su namerno jednostavni. Napredni filteri, pretraga po svim kolonama i sacuvani pogledi pripadaju kasnijem UI/reporting unapredjenju.

## Ogranicenja

1. Nema PDF exporta.
2. Nema Excel exporta.
3. Nema eksternih chart biblioteka.
4. Nema Looker Studio integracije.
5. Izvestaji ne upisuju audit log jer su read-only.
6. Dashboard je operativni pregled, ne formalni finansijski izvestaj.
7. Post-closing korekcije se vide kroz korekcije/storno izvestaj, ali ne menjaju prethodno zakljucene dnevne izvestaje.
