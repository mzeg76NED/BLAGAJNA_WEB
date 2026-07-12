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

## Current project status

Zavrseni su osnovni moduli za:

1. data model,
2. payment requests,
3. payment orders,
4. cash execution,
5. documents,
6. shifts,
7. daily closing,
8. basic UI,
9. hardening/testing,
10. corrections and reversals,
11. operational reports and management dashboard,
12. printable reports and document templates,
13. pilot readiness, admin validation, backup/export and rollout documentation.

Trenutni status je pilot paket. Sistem je spreman za kontrolisanu probu uz realne korisnike, eksplicitnu konfiguraciju, dnevni backup i paralelnu ručnu kontrolu.

## How to test

1. Pokreni `initializeDatabase()`.
2. Pokreni `createMinimalTestSetup()` u odvojenom test spreadsheet-u ili rucno unesi realne test korisnike.
3. Zameni placeholder email adrese realnim Google Workspace nalozima.
4. Deploy Apps Script kao Web App.
5. Pokreni smoke testove iz Apps Script editora:
   - `smokeTestDatabaseInitialization()`
   - `smokeTestPaymentRequestFlow()`
   - `smokeTestPaymentOrderFlow()`
   - `smokeTestCashPaymentFlow()`
   - `smokeTestDailyClosingPreview()`
6. Izvrsi rucni E2E test iz `docs/12_E2E_TEST_PLAN.md`.
7. Proveri deployment checklist u `docs/13_DEPLOYMENT_CHECKLIST.md`.
8. Pregledaj poznata ogranicenja u `docs/14_KNOWN_LIMITATIONS.md`.
9. Testiraj storno i korekcije prema `docs/15_CORRECTIONS_AND_REVERSALS.md`.
10. Testiraj izvestaje i dashboard prema `docs/16_REPORTS_AND_DASHBOARD.md`.
11. Testiraj print prikaze i browser `Save as PDF` prema `docs/17_PRINTABLE_REPORTS_AND_TEMPLATES.md`.
12. Pripremi pilot prema `docs/18_PILOT_ROLLOUT_PLAN.md`.
13. Prođi admin setup iz `docs/19_ADMIN_SETUP_GUIDE.md`.
14. Prođi go-live listu iz `docs/22_GO_LIVE_CHECKLIST.md`.

## Pilot setup

1. U `src/Config.gs` proveri `ENVIRONMENT`, `DATABASE_SPREADSHEET_ID`, `DOCUMENT_ROOT_FOLDER_ID` i `DEBUG_MODE`.
2. Pokreni `initializeDatabase()`.
3. Dodaj realne korisnike u `USERS`.
4. Dodaj pilot blagajne u `CASHBOXES`.
5. Pokreni `validateSystemSetup()`.
6. Pokreni `validateNoDangerousDefaults()`.
7. Deploy Apps Script kao Web App.
8. Pokreni `runAllSmokeTests()`.
9. Napravi backup kroz `createDatabaseBackupCopy()`.

## Backup

Backup funkcije su:

```text
createDatabaseBackupCopy()
exportSheetAsCsv('CASH_EVENTS')
exportAllCoreSheetsAsCsv()
```

Backup smeju da pokrenu samo `ADMIN` i `FINANCE`.

## Known limitations

Poznata ograničenja su u `docs/14_KNOWN_LIMITATIONS.md`, a pilot problemi se vode u `docs/23_KNOWN_ISSUES_REGISTER.md`.

## Next recommended task

Sledeći zadatak posle realnog pilota:

```text
Task 15 — Pilot feedback fixes and production stabilization
```

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

## Manualni test za Task 11

1. U `USERS` obezbedi aktivnog korisnika sa rolom `ADMIN`, `FINANCE` ili `CASHIER_SUPERVISOR`.
2. Kreiraj `CASH_INFLOW`, zatim pokreni `reverseCashEvent(event_id, reason)`.
3. Potvrdi da originalni event dobija status `REVERSED`.
4. Potvrdi da je kreiran novi `REVERSAL` event sa suprotnim smerom.
5. Pokreni `createCorrectionEvent()` za smer `IN` i `OUT`.
6. Potvrdi da se stanje racuna samo iz `POSTED` i `LOCKED` dogadjaja.
7. Potvrdi da `AUDIT_LOG` belezi `REVERSE` i `POST`.
8. Ne menjaj iznose na posted ili locked eventima direktno.

## Manualni test za Task 12

1. Deploy Apps Script kao Web App.
2. Otvori desktop prikaz sa `?view=desktop`.
3. Klikni `Osveži dashboard` i proveri kartice.
4. Otvori `Reports`.
5. Pokreni presek stanja blagajni.
6. Pokreni otvorene zahteve, naloge koji cekaju isplatu i nedostajuca dokumenta.
7. Pokreni dnevne zakljucke, razlike i korekcije/storno.
8. Potvrdi da report pozivi ne menjaju poslovne tabele i ne dodaju audit redove.

## Manualni test za Task 13

1. Deploy Apps Script kao Web App.
2. Otvori print rutu za zahtev: `?view=print-payment-request&id=REQ-...`.
3. Otvori print rutu za nalog: `?view=print-payment-order&id=ORD-...`.
4. Otvori print rutu za cash event: `?view=print-cash-event&id=CEV-...`.
5. Otvori print rutu za primopredaju smene: `?view=print-shift-handover&id=SHF-...`.
6. Otvori print rutu za dnevni zakljucak: `?view=print-daily-closing&id=CLS-...`.
7. Otvori print rute za izvestaje: `?view=print-report&type=missing-documents` i `?view=print-report&type=cashbox-balance`.
8. Iz browser dijaloga sacuvaj dokument kao PDF.
9. Potvrdi da print prikazi ne menjaju statuse, ne kreiraju isplate i ne dodaju audit redove.

## Manualni test za Task 14

1. Pokreni `getSystemStatus()` i proveri konfiguraciju, korisnike, blagajne, valute i Drive folder.
2. Pokreni `validateSystemSetup()` i reši sve greške pre pilota.
3. Pokreni `validateNoDangerousDefaults()` i ukloni aktivne placeholder korisnike.
4. Pokreni `createDatabaseBackupCopy()` kao `ADMIN` ili `FINANCE`.
5. Pokreni `exportSheetAsCsv('USERS')` i proveri header red.
6. Pokreni `runAllSmokeTests()` i proveri `PASS`, `FAIL` i `SKIPPED` rezultate.
7. Prođi `docs/22_GO_LIVE_CHECKLIST.md`.
8. Korisnicima podeli `docs/20_USER_SOP.md`.
