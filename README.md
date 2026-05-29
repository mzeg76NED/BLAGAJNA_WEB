# BLAGAJNA WEB

Interna web aplikacija za upravljanje blagajnom, namenjena radu u Google Workspace okruženju.

## Platforma

- Google Apps Script
- Google Sheets
- Google Drive
- HTML
- CSS
- JavaScript

## Google Drive

Zajednički Google Drive folder za projekat:

https://drive.google.com/drive/folders/13lviWTTEL1R5Y28TMvQhrEepRnRX1vss

## Osnovno pravilo

Stanje blagajne se ne unosi ručno. Stanje se računa iz poslovnih događaja.

Payment Request nije isplata.
Payment Order nije isplata.
Samo izvršen i knjižen Cash Payment Event menja stanje blagajne.

## Struktura

- `docs/` - poslovna i tehnička dokumentacija
- `src/` - Google Apps Script kod
- `src/html/` - HTML, CSS i JavaScript delovi web aplikacije
- `src/Validation.gs` - osnovne validacije za obavezna polja, iznose, valute i blagajne

## Prvi korak razvoja

Ovaj skeleton sadrži početne module, dokumentacione stubove i placeholder funkcije. Kompletna poslovna logika se dodaje postepeno, uz dokumentaciju i ručne test scenarije.

## Manualni test za Task 02

1. Otvori Google Apps Script projekat.
2. Povezi projekat sa Google Sheets fajlom ili upisi spreadsheet ID u `SPREADSHEET_ID` u `src/Config.gs`.
3. Pokreni `initializeDatabase()`.
4. Potvrdi da su kreirani sheetovi: USERS, CASHBOXES, CURRENCIES, PAYMENT_REQUESTS, PAYMENT_ORDERS, CASH_EVENTS, DOCUMENTS, SHIFTS, DAILY_CLOSING i AUDIT_LOG.
5. Potvrdi da svaki sheet ima header red.
6. Potvrdi da je prvi red zamrznut.
7. Pokreni `runDatabaseSmokeTest()`.
8. Potvrdi da je u USERS dodat ili azuriran red sa `user_id` vrednoscu `USR-SMOKE-TEST`.
9. Potvrdi da `findRecordById()` pronalazi test korisnika.
10. Potvrdi da `updateRecordById()` menja `full_name` u `Smoke Test User Updated`.
11. Potvrdi da `writeAuditLog()` dodaje red u AUDIT_LOG.

## Manualni test za Task 03

1. U `USERS` dodaj aktivnog korisnika sa email adresom koja pokrece Apps Script.
2. Za kreiranje zahteva dodeli rolu `REQUESTER` ili visu dozvoljenu rolu.
3. Za odobravanje/odbijanje dodeli rolu `APPROVER`, `FINANCE`, `DIRECTOR`, `CASHIER_SUPERVISOR` ili `ADMIN`.
4. Pokreni `createPaymentRequest()` sa primaocem, pozitivnim iznosom, aktivnom valutom i svrhom.
5. Potvrdi da je status `DRAFT` i da `AUDIT_LOG` ima `CREATE`.
6. Pokreni `submitPaymentRequest(request_id)` i potvrdi status `SUBMITTED`.
7. Pokreni `approvePaymentRequest(request_id)` ili `rejectPaymentRequest(request_id, reason)`.
8. Potvrdi da nema novog reda u `PAYMENT_ORDERS` i `CASH_EVENTS`.
9. Potvrdi da zahtev ne menja stanje blagajne.

## Manualni test za Task 04

1. U `USERS` dodaj aktivnog korisnika sa odgovarajucom rolom za naloge.
2. U `CASHBOXES` dodaj aktivnu blagajnu, na primer `CB-001`.
3. Za nalog iz zahteva: kreiraj, podnesi i odobri Payment Request.
4. Pokreni `createPaymentOrderFromRequest(request_id, { cashbox_id: 'CB-001' })`.
5. Potvrdi da je kreiran `PAYMENT_ORDERS` red sa `order_type = FROM_REQUEST`.
6. Potvrdi da je zahtev azuriran na `CONVERTED_TO_ORDER` i da ima `linked_order_id`.
7. Pokreni `createDirectPaymentOrder()` za direktan nalog i potvrdi `order_type = DIRECT_ORDER`.
8. Pokreni `issuePaymentOrder(order_id)` i potvrdi status `WAITING_PAYMENT`.
9. Pokreni `cancelPaymentOrder(order_id, reason)` ili `rejectPaymentOrderByCashier(order_id, reason)` nad odgovarajucim statusom.
10. Potvrdi da nema novog reda u `CASH_EVENTS` i da nalog ne menja stanje blagajne.

## Manualni test za Task 05

1. U `USERS` dodaj aktivnog korisnika sa rolom `CASHIER`, `CASHIER_SUPERVISOR` ili `ADMIN`.
2. U `CASHBOXES` dodaj aktivnu blagajnu, na primer `CB-001`.
3. Pokreni `createCashInflow({ cashbox_id: 'CB-001', currency: 'RSD', amount: 50000, description: 'Test priliv' })`.
4. Potvrdi da `calculateCashboxBalance('CB-001', 'RSD')` pokazuje uvecano stanje.
5. Kreiraj i izdaj Payment Order u status `WAITING_PAYMENT`.
6. Pokreni `executePaymentOrder(order_id, {})`.
7. Potvrdi da je kreiran `CASH_OUTFLOW` sa statusom `POSTED`.
8. Potvrdi da je nalog `PAID` ili `PARTIALLY_PAID`.
9. Potvrdi da se stanje smanjilo samo kroz `CASH_EVENTS`.

## Manualni test za Task 06

1. U `USERS` dodaj aktivnog korisnika sa rolom koja sme da dodaje dokumente.
2. Kreiraj Payment Request, Payment Order ili Cash Event.
3. Pokreni `attachDocumentToEntity(entityType, entityId, filePayload, note)`.
4. Potvrdi da je fajl kreiran u Google Drive folderu `BLAGAJNA_WEB_DOCUMENTS`.
5. Potvrdi da je red dodat u `DOCUMENTS`.
6. Potvrdi da povezani entitet ima `document_status = ATTACHED` ako podrzava tu kolonu.
7. Pokreni `listDocumentsForEntity(entityType, entityId)`.
8. Pokreni `cancelDocument(document_id, reason)` i potvrdi da Drive fajl nije obrisan.

## Manualni test za Task 07

1. Pokreni `initializeDatabase()` da se `SHIFTS` header dopuni novim kolonama.
2. U `USERS` dodaj aktivnog korisnika sa rolom `CASHIER`, `CASHIER_SUPERVISOR` ili `ADMIN`.
3. U `CASHBOXES` dodaj aktivnu blagajnu, na primer `CB-001`.
4. Pokreni `openShift('CB-001', 'Pocetak smene')`.
5. Potvrdi da je u `SHIFTS` kreiran red sa statusom `OPEN` i popunjenim `opening_balance_json`.
6. Pokreni `getActiveShiftForCashbox('CB-001')` i `getShiftBalance(shift_id)`.
7. Pokusaj drugi `openShift('CB-001', 'Duplikat')` i potvrdi da sistem odbija duplu otvorenu smenu.
8. Zatvori smenu kroz `closeShift(shift_id, balanceByCurrency, 'Zatvaranje')` ili je predaj kroz `handoverShift(shift_id, receiverEmail, balanceByCurrency, 'Primopredaja')`.
9. Potvrdi da audit log belezi `CREATE`, `UPDATE`, `LOCK` ili `CANCEL` prema akciji.

## Manualni test za Task 08

1. Pokreni `initializeDatabase()` da se `DAILY_CLOSING` header dopuni kolonama za administrativno zakljucavanje.
2. U `USERS` dodaj aktivnog korisnika sa rolom `CASHIER_SUPERVISOR`, `FINANCE`, `DIRECTOR` ili `ADMIN`.
3. U `CASHBOXES` dodaj aktivnu blagajnu, na primer `CB-001`.
4. Kreiraj posted cash events za datum zakljucka kroz `createCashInflow()` i/ili `executePaymentOrder()`.
5. Pokreni `prepareDailyClosing('CB-001', 'RSD', '2026-05-28')` i potvrdi da nema novog reda u `DAILY_CLOSING`.
6. Zatvori sve otvorene smene za blagajnu.
7. Pokreni `closeDailyCashbox('CB-001', 'RSD', '2026-05-28', physicalBalance, 'Dnevni zakljucak')`.
8. Potvrdi da je kreiran red u `DAILY_CLOSING`, da su ukljuceni `CASH_EVENTS` prebaceni iz `POSTED` u `LOCKED`, i da iznosi na dogadjajima nisu promenjeni.
9. Ponovi zakljucak za isti cashbox, valutu i datum i potvrdi da sistem odbija duplikat.

## Manualni test za Task 09

1. Deploy Apps Script kao Web App.
2. Otvori osnovni Web App URL i potvrdi da se prikazuje mobilni UI.
3. Otvori `?view=desktop` i potvrdi da se prikazuje desktop dashboard.
4. Na mobilnom prikazu kreiraj Payment Request i proveri `PAYMENT_REQUESTS`.
5. Ucitaj `Moji zahtevi`, `Zahtevi za odobrenje` i `Nalozi za isplatu`.
6. Izvrsi nalog kroz UI i proveri da je nastao `CASH_OUTFLOW`.
7. Dodaj dokument kroz file input i proveri `DOCUMENTS`.
8. Otvori i zatvori smenu kroz UI.
9. Pripremi i kreiraj dnevni zakljucak kroz UI.
