# Test Cases

## Svrha

Ovaj dokument sadrzi rucne test scenarije za BLAGAJNA WEB.

## Task 02 - Data model i database initialization

1. Otvoriti Apps Script projekat.
2. Povezati projekat sa Google Sheets fajlom ili podesiti `SPREADSHEET_ID` u `Config.gs`.
3. Pokrenuti `initializeDatabase()`.
4. Proveriti da postoje sheetovi USERS, CASHBOXES, CURRENCIES, PAYMENT_REQUESTS, PAYMENT_ORDERS, CASH_EVENTS, DOCUMENTS, SHIFTS, DAILY_CLOSING i AUDIT_LOG.
5. Proveriti da svaki sheet ima header red prema `TABLE_HEADERS`.
6. Proveriti da je prvi red zamrznut u svakom sheetu.
7. Proveriti da su u CURRENCIES dodate valute RSD i EUR.
8. Pokrenuti `runDatabaseSmokeTest()`.
9. Proveriti da je dodat ili azuriran korisnik `USR-SMOKE-TEST` u USERS.
10. Proveriti da je `full_name` test korisnika `Smoke Test User Updated`.
11. Proveriti da je dodat jedan red u AUDIT_LOG za smoke test.

## Task 03 - Payment Request workflow

Pre testiranja dodati aktivnog korisnika u `USERS` sa email adresom korisnika koji pokrece Apps Script i rolom `REQUESTER`, `APPROVER`, `FINANCE`, `DIRECTOR`, `CASHIER_SUPERVISOR` ili `ADMIN`. Za testove odobravanja korisnik mora imati jednu od review rola: `ADMIN`, `DIRECTOR`, `FINANCE`, `CASHIER_SUPERVISOR`, `APPROVER`.

### Test 1: Create draft request

Koraci:

1. Pokrenuti `createPaymentRequest({ requested_for_name: 'Petar Petrovic', amount: 15000, currency: 'RSD', purpose: 'Trosak puta Novi Sad', priority: 'NORMAL' })`.
2. Proveriti sheet `PAYMENT_REQUESTS`.
3. Proveriti sheet `AUDIT_LOG`.
4. Proveriti sheet `CASH_EVENTS`.

Ocekivano:

1. Red je kreiran u `PAYMENT_REQUESTS`.
2. Status je `DRAFT`.
3. Audit log sadrzi `CREATE`.
4. Stanje blagajne je nepromenjeno.
5. Nema novog reda u `CASH_EVENTS`.

### Test 2: Submit request

Koraci:

1. Uzeti `request_id` iz Testa 1.
2. Pokrenuti `submitPaymentRequest(request_id)`.
3. Proveriti `PAYMENT_REQUESTS`.
4. Proveriti `AUDIT_LOG`.

Ocekivano:

1. Status se menja iz `DRAFT` u `SUBMITTED`.
2. `updated_at` je popunjen.
3. Audit log sadrzi `SUBMIT`.

### Test 3: Approve request

Koraci:

1. Kreirati i podneti novi zahtev.
2. Pokrenuti `approvePaymentRequest(request_id)`.
3. Proveriti `PAYMENT_REQUESTS`, `PAYMENT_ORDERS`, `CASH_EVENTS` i `AUDIT_LOG`.

Ocekivano:

1. Status se menja u `APPROVED`.
2. `reviewed_by` je popunjen.
3. `reviewed_at` je popunjen.
4. Audit log sadrzi `APPROVE`.
5. U ovom tasku nije kreiran payment order.
6. Nije kreiran cash event.
7. Stanje blagajne je nepromenjeno.

### Test 4: Reject request

Koraci:

1. Kreirati i podneti novi zahtev.
2. Pokusati `rejectPaymentRequest(request_id, '')`.
3. Pokrenuti `rejectPaymentRequest(request_id, 'Nedostaje obrazlozenje.')`.
4. Proveriti `PAYMENT_REQUESTS` i `AUDIT_LOG`.

Ocekivano:

1. Razlog odbijanja je obavezan.
2. Status se menja u `REJECTED`.
3. `reviewed_by` je popunjen.
4. Audit log sadrzi `REJECT`.
5. Stanje blagajne je nepromenjeno.

### Test 5: Cancel request

Koraci:

1. Kreirati novi zahtev.
2. Pokrenuti `cancelPaymentRequest(request_id, 'Test otkazivanja.')`.
3. Proveriti `PAYMENT_REQUESTS` i `AUDIT_LOG`.

Ocekivano:

1. Status se menja u `CANCELLED`.
2. Red ostaje u sheetu.
3. Audit log sadrzi `CANCEL`.

### Test 6: Invalid amount

Koraci:

1. Pokrenuti `createPaymentRequest({ requested_for_name: 'Petar Petrovic', amount: 0, currency: 'RSD', purpose: 'Test' })`.
2. Proveriti `PAYMENT_REQUESTS`.

Ocekivano:

1. Sistem odbija iznos `<= 0`.
2. Novi red nije kreiran.

### Test 7: Missing purpose

Koraci:

1. Pokrenuti `createPaymentRequest({ requested_for_name: 'Petar Petrovic', amount: 1000, currency: 'RSD' })`.
2. Proveriti `PAYMENT_REQUESTS`.

Ocekivano:

1. Sistem odbija zahtev bez svrhe.
2. Novi red nije kreiran.

### Test 8: Request does not affect balance

Koraci:

1. Zabeleziti broj redova u `CASH_EVENTS`.
2. Kreirati zahtev.
3. Podneti zahtev.
4. Odobriti zahtev.
5. Ponovo proveriti `CASH_EVENTS`.

Ocekivano:

1. Nema novog reda u `CASH_EVENTS`.
2. Izracunato stanje blagajne je nepromenjeno.
3. Zahtev je samo zahtev, nije nalog i nije isplata.

## Task 04 - Payment Order workflow

Pre testiranja dodati aktivnog korisnika u `USERS`. Za kreiranje naloga iz zahteva korisnik mora imati rolu `ADMIN`, `DIRECTOR`, `FINANCE`, `CASHIER_SUPERVISOR` ili `APPROVER`. Za direktan nalog korisnik mora imati rolu `ADMIN`, `DIRECTOR`, `FINANCE` ili `CASHIER_SUPERVISOR`. Za odbijanje naloga od strane blagajnika korisnik mora imati rolu `CASHIER`, `CASHIER_SUPERVISOR` ili `ADMIN`.

Takodje dodati aktivnu blagajnu u `CASHBOXES`, na primer `cashbox_id = CB-001`.

### Test 1: Create order from approved request

Koraci:

1. Kreirati zahtev za isplatu.
2. Podneti zahtev.
3. Odobriti zahtev.
4. Pokrenuti `createPaymentOrderFromRequest(request_id, { cashbox_id: 'CB-001' })`.
5. Proveriti `PAYMENT_ORDERS`.
6. Proveriti izvorni red u `PAYMENT_REQUESTS`.
7. Proveriti `AUDIT_LOG` i `CASH_EVENTS`.

Ocekivano:

1. Odobren zahtev postoji.
2. Nalog je kreiran.
3. Nalog ima `order_type = FROM_REQUEST`.
4. `source_request_id` pokazuje na zahtev.
5. Status zahteva postaje `CONVERTED_TO_ORDER`.
6. `linked_order_id` u zahtevu je popunjen.
7. Audit log sadrzi `CREATE` za nalog.
8. Audit log sadrzi `UPDATE` za zahtev.
9. Nije kreiran cash event.
10. Stanje blagajne je nepromenjeno.

### Test 2: Prevent order from unapproved request

Koraci:

1. Kreirati zahtev koji je `DRAFT` ili `SUBMITTED`.
2. Pokrenuti `createPaymentOrderFromRequest(request_id, { cashbox_id: 'CB-001' })`.
3. Proveriti `PAYMENT_ORDERS`.

Ocekivano:

1. Sistem odbija kreiranje naloga.
2. Novi red naloga nije kreiran.

### Test 3: Prevent duplicate order from same request

Koraci:

1. Kreirati nalog iz odobrenog zahteva.
2. Ponovo pokrenuti `createPaymentOrderFromRequest(request_id, { cashbox_id: 'CB-001' })`.

Ocekivano:

1. Zahtev vec ima `linked_order_id`.
2. Sistem odbija drugi nalog.

### Test 4: Create direct order

Koraci:

1. Pokrenuti `createDirectPaymentOrder({ cashbox_id: 'CB-001', pay_to_name: 'Petar Petrovic', amount_ordered: 15000, currency: 'RSD', purpose: 'Direktan nalog za trosak puta' })`.
2. Proveriti `PAYMENT_ORDERS`.
3. Proveriti `AUDIT_LOG`.

Ocekivano:

1. Ovlasceni korisnik kreira direktan nalog.
2. Nalog ima `order_type = DIRECT_ORDER`.
3. `source_request_id` je prazan.
4. Status je `DRAFT`.
5. Audit log sadrzi `CREATE`.
6. Stanje blagajne je nepromenjeno.

### Test 5: Issue payment order

Koraci:

1. Kreirati direktan nalog ili nalog iz zahteva.
2. Pokrenuti `issuePaymentOrder(order_id)`.
3. Proveriti `PAYMENT_ORDERS` i `AUDIT_LOG`.

Ocekivano:

1. Status se menja iz `DRAFT` u `WAITING_PAYMENT`.
2. `issued_by` je popunjen.
3. `issued_at` je popunjen.
4. Audit log sadrzi `SUBMIT`.
5. Stanje blagajne je nepromenjeno.

### Test 6: Cancel payment order

Koraci:

1. Kreirati nalog u statusu `DRAFT` ili `WAITING_PAYMENT`.
2. Pokusati `cancelPaymentOrder(order_id, '')`.
3. Pokrenuti `cancelPaymentOrder(order_id, 'Test otkazivanja naloga.')`.
4. Proveriti `PAYMENT_ORDERS` i `AUDIT_LOG`.

Ocekivano:

1. Razlog otkazivanja je obavezan.
2. Status se menja u `CANCELLED`.
3. Audit log sadrzi `CANCEL`.
4. Nalog ostaje u tabeli.

### Test 7: Cashier rejects order

Koraci:

1. Kreirati i izdati nalog tako da bude `WAITING_PAYMENT`.
2. Pokusati `rejectPaymentOrderByCashier(order_id, '')`.
3. Pokrenuti `rejectPaymentOrderByCashier(order_id, 'Primalac nije prisutan.')`.
4. Proveriti `PAYMENT_ORDERS` i `AUDIT_LOG`.

Ocekivano:

1. `WAITING_PAYMENT` nalog moze da odbije blagajnik sa obaveznim razlogom.
2. Status se menja u `REJECTED_BY_CASHIER`.
3. `cashier_rejection_reason` je popunjen.
4. Audit log sadrzi `REJECT`.
5. Stanje blagajne je nepromenjeno.

### Test 8: Payment Order does not affect balance

Koraci:

1. Zabeleziti broj redova u `CASH_EVENTS`.
2. Kreirati direktan nalog.
3. Izdati nalog.
4. Ponovo proveriti `CASH_EVENTS`.

Ocekivano:

1. Nema novog reda u `CASH_EVENTS`.
2. Nije kreiran `CASH_OUTFLOW`.
3. Izracunato stanje blagajne je nepromenjeno.

## Task 05 - Cash payment execution

Pre testiranja mora postojati aktivan korisnik u `USERS`. Za `executePaymentOrder()` korisnik mora imati rolu `CASHIER`, `CASHIER_SUPERVISOR` ili `ADMIN`. Za `createCashInflow()` korisnik mora imati rolu `CASHIER`, `CASHIER_SUPERVISOR`, `FINANCE` ili `ADMIN`.

### Test 1: Create cash inflow for test balance

Koraci:

1. Proveriti da postoji aktivna blagajna `CB-001`.
2. Pokrenuti `createCashInflow({ cashbox_id: 'CB-001', currency: 'RSD', amount: 50000, description: 'Test priliv' })`.
3. Pokrenuti `calculateCashboxBalance('CB-001', 'RSD')`.
4. Proveriti `AUDIT_LOG`.

Ocekivano:

1. `createCashInflow()` kreira `CASH_INFLOW`.
2. Status je `POSTED`.
3. Direction je `IN`.
4. Audit log sadrzi `POST`.
5. Izracunato stanje se povecava.

### Test 2: Execute payment order fully

Priprema:

1. Kreirati odobren zahtev.
2. Kreirati nalog iz zahteva.
3. Izdati nalog.
4. Kreirati dovoljan cash inflow.

Koraci:

1. Pokrenuti `executePaymentOrder(order_id, {})`.
2. Proveriti `CASH_EVENTS`.
3. Proveriti `PAYMENT_ORDERS`.
4. Proveriti `AUDIT_LOG`.
5. Pokrenuti `calculateCashboxBalance(cashbox_id, currency)`.

Ocekivano:

1. `executePaymentOrder()` kreira `CASH_OUTFLOW`.
2. Cash event status je `POSTED`.
3. Cash event direction je `OUT`.
4. Payment order status postaje `PAID`.
5. `amount_paid` je jednak `amount_ordered`.
6. Audit log sadrzi cash event `POST`.
7. Audit log sadrzi order `UPDATE`.
8. Izracunato stanje se smanjuje za iznos isplate.

### Test 3: Prevent payment if balance is insufficient

Koraci:

1. Kreirati i izdati nalog ciji je iznos veci od trenutnog stanja.
2. Pokrenuti `executePaymentOrder(order_id, {})`.
3. Proveriti `CASH_EVENTS`.
4. Proveriti `PAYMENT_ORDERS`.

Ocekivano:

1. Nalog postoji i ceka isplatu.
2. Stanje blagajne je manje od iznosa naloga.
3. Sistem baca jasnu gresku.
4. Ne kreira se `CASH_OUTFLOW`.
5. `amount_paid` ostaje nepromenjen.
6. Status naloga ostaje nepromenjen.

### Test 4: Prevent payment from cancelled order

Koraci:

1. Kreirati i otkazati nalog.
2. Pokrenuti `executePaymentOrder(order_id, {})`.
3. Proveriti `CASH_EVENTS`.

Ocekivano:

1. Otkazan nalog postoji.
2. Izvrsenje je odbijeno.
3. Nije kreiran cash event.

### Test 5: Prevent payment from draft order

Koraci:

1. Kreirati nalog u statusu `DRAFT`.
2. Pokrenuti `executePaymentOrder(order_id, {})`.
3. Proveriti `CASH_EVENTS`.

Ocekivano:

1. Draft nalog postoji.
2. Izvrsenje je odbijeno.
3. Nije kreiran cash event.

### Test 6: Partial payment

Koraci:

1. Kreirati i izdati nalog.
2. Obezbediti dovoljno stanje.
3. Pokrenuti `executePaymentOrder(order_id, { amount: 5000 })` gde je 5000 manje od preostalog iznosa.
4. Proveriti `CASH_EVENTS`, `PAYMENT_ORDERS` i stanje.

Ocekivano:

1. Iznos isplate je manji od preostalog iznosa naloga.
2. `CASH_OUTFLOW` je kreiran.
3. Status naloga postaje `PARTIALLY_PAID`.
4. `amount_paid` je azuriran.
5. Stanje se smanjuje samo za placeni iznos.

### Test 7: Prevent overpayment

Koraci:

1. Kreirati i izdati nalog.
2. Pokrenuti `executePaymentOrder(order_id, { amount: amount_ordered + 1 })`.
3. Proveriti `CASH_EVENTS`.

Ocekivano:

1. Iznos isplate je veci od preostalog iznosa naloga.
2. Sistem odbija izvrsenje.
3. Nije kreiran cash event.

### Test 8: Payment Request and Payment Order do not affect balance

Koraci:

1. Izmeriti stanje blagajne.
2. Kreirati payment request.
3. Odobriti request.
4. Kreirati payment order.
5. Izdati payment order.
6. Ponovo izmeriti stanje.
7. Tek onda pokrenuti `executePaymentOrder(order_id, {})`.

Ocekivano:

1. Zahtev ne menja stanje.
2. Odobrenje zahteva ne menja stanje.
3. Kreiranje naloga ne menja stanje.
4. Izdavanje naloga ne menja stanje.
5. Stanje se menja tek posle `executePaymentOrder()`.

## Task 06 - Document metadata and upload workflow

Pre testiranja mora postojati aktivan korisnik u `USERS`. Za dodavanje dokumenata korisnik mora imati jednu od rola: `ADMIN`, `DIRECTOR`, `FINANCE`, `CASHIER_SUPERVISOR`, `CASHIER`, `APPROVER`, `REQUESTER`. Za otkazivanje ili zamenu dokumenata potrebna je rola `ADMIN`, `DIRECTOR`, `FINANCE` ili `CASHIER_SUPERVISOR`.

Za test `filePayload.base64Data` moze biti kratak tekst enkodovan u base64.

### Test 1: Attach document to Payment Request

Koraci:

1. Kreirati Payment Request.
2. Pokrenuti `attachDocumentToEntity('PAYMENT_REQUEST', request_id, { fileName: 'zahtev.txt', mimeType: 'text/plain', base64Data: 'VGVzdA==' }, 'Test dokument')`.
3. Proveriti Google Drive folder.
4. Proveriti `DOCUMENTS`.
5. Proveriti red zahteva u `PAYMENT_REQUESTS`.
6. Proveriti `AUDIT_LOG`.

Ocekivano:

1. Fajl je kreiran u Google Drive-u.
2. Red je kreiran u `DOCUMENTS`.
3. `entity_type` je `PAYMENT_REQUEST`.
4. `entity_id` je ID zahteva.
5. Status dokumenta je `ACTIVE`.
6. Payment request `document_status` postaje `ATTACHED`.
7. Audit log sadrzi `CREATE`.

### Test 2: Attach document to Payment Order

Koraci:

1. Kreirati Payment Order.
2. Pokrenuti `attachDocumentToEntity('PAYMENT_ORDER', order_id, filePayload, 'Dokument naloga')`.
3. Proveriti `DOCUMENTS` i `PAYMENT_ORDERS`.

Ocekivano:

1. Red dokumenta je kreiran.
2. Payment order `document_status` postaje `ATTACHED`.
3. Audit log sadrzi `CREATE`.

### Test 3: Attach document to Cash Event

Koraci:

1. Kreirati Cash Event kroz `createCashInflow()` ili `executePaymentOrder()`.
2. Pokrenuti `attachDocumentToEntity('CASH_EVENT', event_id, filePayload, 'Dokaz dogadjaja')`.
3. Proveriti `DOCUMENTS` i `CASH_EVENTS`.

Ocekivano:

1. Red dokumenta je kreiran.
2. Cash event `document_status` postaje `ATTACHED`.
3. Audit log sadrzi `CREATE`.

### Test 4: List documents for entity

Koraci:

1. Dodati najmanje jedan dokument na entitet.
2. Otkazati ili zameniti jedan dokument ako je potrebno.
3. Pokrenuti `listDocumentsForEntity(entityType, entityId)`.

Ocekivano:

1. Vraca sve povezane dokumente.
2. Aktivni i neaktivni dokumenti su vidljivi.

### Test 5: List active documents only

Koraci:

1. Dodati najmanje jedan dokument.
2. Otkazati jedan dokument.
3. Pokrenuti `listActiveDocumentsForEntity(entityType, entityId)`.

Ocekivano:

1. Vraca samo dokumente sa `status = ACTIVE`.

### Test 6: Cancel document

Koraci:

1. Dodati dokument.
2. Pokrenuti `cancelDocument(document_id, 'Test otkazivanja dokumenta')`.
3. Proveriti `DOCUMENTS`, Google Drive i `AUDIT_LOG`.

Ocekivano:

1. Status dokumenta postaje `CANCELLED`.
2. Red ostaje u `DOCUMENTS`.
3. Drive fajl nije obrisan.
4. Audit log sadrzi `CANCEL`.

### Test 7: Invalid entity type

Koraci:

1. Pokrenuti `attachDocumentToEntity('INVALID', '123', filePayload, 'Test')`.
2. Proveriti Google Drive i `DOCUMENTS`.

Ocekivano:

1. Sistem odbija nepodrzan entity type.
2. Drive fajl nije kreiran.
3. Red dokumenta nije kreiran.

### Test 8: Invalid file payload

Koraci:

1. Pokrenuti `attachDocumentToEntity('PAYMENT_REQUEST', request_id, { fileName: 'x.txt' }, 'Test')`.
2. Proveriti Google Drive i `DOCUMENTS`.

Ocekivano:

1. Sistem odbija payload bez `base64Data`.
2. Drive fajl nije kreiran.
3. Red dokumenta nije kreiran.

## Task 07 - Shift opening and handover workflow

Pre testiranja mora postojati aktivan korisnik u `USERS`. Za otvaranje smene korisnik mora imati rolu `CASHIER`, `CASHIER_SUPERVISOR` ili `ADMIN`. Za zatvaranje i primopredaju korisnik mora biti korisnik koji je otvorio smenu ili imati rolu `CASHIER_SUPERVISOR`, `ADMIN` ili `FINANCE`.

Pre prvog testiranja posle ovog update-a pokrenuti `initializeDatabase()` da se `SHIFTS` header dopuni kolonama za balans, primopredaju i razliku.

### Test 1: Open shift

Koraci:

1. Proveriti da postoji aktivna blagajna `CB-001`.
2. Pokrenuti `openShift('CB-001', 'Test otvaranja smene')`.
3. Proveriti `SHIFTS`.
4. Proveriti `AUDIT_LOG`.

Ocekivano:

1. Kreirana je otvorena smena.
2. Status je `OPEN`.
3. `opening_balance_json` je popunjen.
4. Audit log sadrzi `CREATE`.

### Test 2: Prevent two open shifts for same cashbox

Koraci:

1. Ostaviti prvu smenu otvorenom.
2. Ponovo pokrenuti `openShift('CB-001', 'Dupla smena')`.
3. Proveriti `SHIFTS`.

Ocekivano:

1. Prva smena je otvorena.
2. Drugi pokusaj za istu blagajnu ne uspeva.
3. Nije kreirana dupla otvorena smena.

### Test 3: Get active shift

Koraci:

1. Pokrenuti `getActiveShiftForCashbox('CB-001')` dok postoji otvorena smena.
2. Zatvoriti ili otkazati smenu.
3. Ponovo pokrenuti `getActiveShiftForCashbox('CB-001')`.

Ocekivano:

1. Aktivna smena za blagajnu se vraca.
2. Kada nema otvorene smene, funkcija vraca `null`.

### Test 4: Shift balance

Koraci:

1. Otvoriti smenu.
2. Kreirati cash inflow ili izvrsiti cash outflow kroz postojece funkcije.
3. Pokrenuti `getShiftBalance(shift_id)`.

Ocekivano:

1. Postoji cash inflow/outflow.
2. Presek smene odrazava izracunato stanje blagajne.
3. Stanje nije rucno uneto, vec izracunato iz `CASH_EVENTS`.

### Test 5: Close shift without difference

Koraci:

1. Dobiti trenutno stanje kroz `getShiftBalance(shift_id)`.
2. Pokrenuti `closeShift(shift_id, balanceByCurrency, 'Zatvaranje bez razlike')`.
3. Proveriti `SHIFTS` i `AUDIT_LOG`.

Ocekivano:

1. Fizicko stanje je jednako izracunatom.
2. Status postaje `CLOSED`.
3. `closing_balance_json` je popunjen.
4. `physical_balance_json` je popunjen.
5. `difference_json` je nula po valutama.
6. Audit log sadrzi `LOCK`.

### Test 6: Close shift with difference

Koraci:

1. Otvoriti novu smenu.
2. Pokrenuti `closeShift(shift_id, { RSD: 1, EUR: 0 }, 'Test razlike')` uz vrednosti koje se razlikuju od izracunatog stanja.
3. Proveriti `SHIFTS` i `AUDIT_LOG`.

Ocekivano:

1. Fizicko stanje se razlikuje od izracunatog.
2. Status postaje `CLOSED_WITH_DIFFERENCE`.
3. `difference_json` prikazuje razliku.
4. Audit log belezi akciju.

### Test 7: Handover shift

Koraci:

1. Otvoriti smenu.
2. Obezbediti aktivnog korisnika primaoca sa rolom `CASHIER`, `CASHIER_SUPERVISOR` ili `ADMIN`.
3. Pokrenuti `handoverShift(shift_id, 'primalac@example.com', balanceByCurrency, 'Primopredaja')`.
4. Proveriti `SHIFTS` i `AUDIT_LOG`.

Ocekivano:

1. Otvorena smena je predata.
2. `handover_to` je popunjen.
3. `handover_at` je popunjen.
4. Status postaje `HANDED_OVER` ako nema razlike, odnosno `CLOSED_WITH_DIFFERENCE` ako postoji razlika.
5. Audit log belezi primopredaju.

### Test 8: Cancel shift

Koraci:

1. Otvoriti smenu.
2. Pokusati `cancelShift(shift_id, '')`.
3. Pokrenuti `cancelShift(shift_id, 'Administrativno otkazivanje')`.
4. Proveriti `SHIFTS` i `AUDIT_LOG`.

Ocekivano:

1. Ovlasceni korisnik otkazuje nezatvorenu smenu.
2. Razlog je obavezan.
3. Status postaje `CANCELLED`.
4. Audit log sadrzi `CANCEL`.

## Task 08 - Daily closing workflow

Pre testiranja mora postojati aktivan korisnik u `USERS`. Za `prepareDailyClosing()` korisnik mora imati rolu `CASHIER_SUPERVISOR`, `FINANCE`, `DIRECTOR`, `ADMIN` ili `CASHIER`. Za `closeDailyCashbox()` korisnik mora imati rolu `CASHIER_SUPERVISOR`, `FINANCE`, `DIRECTOR` ili `ADMIN`.

Pre prvog testiranja posle ovog update-a pokrenuti `initializeDatabase()` da se `DAILY_CLOSING` header dopuni kolonama `locked_by`, `locked_at` i `updated_at`.

### Test 1: Prepare daily closing

Koraci:

1. Obezbediti aktivnu blagajnu `CB-001` i valutu `RSD`.
2. Kreirati posted cash events za dan zakljucka.
3. Pokrenuti `prepareDailyClosing('CB-001', 'RSD', '2026-05-28')`.
4. Proveriti `DAILY_CLOSING`.

Ocekivano:

1. Preview je vracen.
2. `opening_balance` je izracunat.
3. `total_in` je izracunat.
4. `total_out` je izracunat.
5. `calculated_balance` je tacan.
6. Nije kreiran red u `DAILY_CLOSING`.

### Test 2: Close day without difference

Koraci:

1. Pokrenuti `prepareDailyClosing()` i procitati `calculated_balance`.
2. Zatvoriti sve otvorene smene za blagajnu.
3. Pokrenuti `closeDailyCashbox('CB-001', 'RSD', '2026-05-28', calculated_balance, 'Zakljucak bez razlike')`.
4. Proveriti `DAILY_CLOSING`, `CASH_EVENTS` i `AUDIT_LOG`.

Ocekivano:

1. Fizicko stanje je jednako izracunatom.
2. Red je kreiran u `DAILY_CLOSING`.
3. Status je `CLOSED`.
4. `difference` je 0.
5. Ukljuceni cash events postaju `LOCKED`.
6. Audit log sadrzi `CREATE` i `LOCK`.

### Test 3: Close day with difference

Koraci:

1. Pripremiti posted cash events za drugi datum.
2. Pokrenuti `closeDailyCashbox()` sa fizickim stanjem koje se razlikuje od izracunatog.
3. Proveriti `DAILY_CLOSING`, `CASH_EVENTS` i `AUDIT_LOG`.

Ocekivano:

1. Fizicko stanje se razlikuje od izracunatog.
2. Status je `CLOSED_WITH_DIFFERENCE`.
3. Razlika je evidentirana.
4. Ukljuceni cash events postaju `LOCKED`.
5. Audit log belezi zakljucak.

### Test 4: Prevent duplicate closing

Koraci:

1. Kreirati dnevni zakljucak za blagajnu, valutu i datum.
2. Ponovo pokrenuti `closeDailyCashbox()` za istu kombinaciju.

Ocekivano:

1. Zakljucak vec postoji za istu blagajnu, valutu i datum.
2. Drugi pokusaj zakljucka je odbijen.

### Test 5: Prevent closing with open shift

Koraci:

1. Otvoriti smenu za blagajnu.
2. Pokrenuti `closeDailyCashbox()` za istu blagajnu.
3. Proveriti `DAILY_CLOSING`.

Ocekivano:

1. Postoji otvorena smena za blagajnu.
2. Pokusaj dnevnog zakljucka je odbijen.
3. Nije kreiran red u `DAILY_CLOSING`.

### Test 6: Locked events remain unchanged in amount

Koraci:

1. Zabeleziti `amount` posted cash eventa pre zakljucka.
2. Pokrenuti `closeDailyCashbox()`.
3. Proveriti isti cash event.

Ocekivano:

1. Iznos cash eventa pre zakljucka je zabelezen.
2. Status eventa postaje `LOCKED`.
3. `amount` ostaje nepromenjen.

### Test 7: Payment Request and Payment Order do not appear in daily totals

Koraci:

1. Kreirati Payment Request.
2. Kreirati Payment Order, ali ne izvrsiti isplatu.
3. Pokrenuti `prepareDailyClosing()`.

Ocekivano:

1. Zahtev i nalog nisu cash events.
2. Totali ih ne ukljucuju.
3. Stanje je nepromenjeno dok se nalog ne izvrsi.

### Test 8: Executed payment appears in daily totals

Koraci:

1. Izvrsiti payment order kroz `executePaymentOrder()`.
2. Pokrenuti `prepareDailyClosing()` za isti datum, blagajnu i valutu.

Ocekivano:

1. `CASH_OUTFLOW` je posted.
2. `total_out` ukljucuje iznos izvrsene isplate.

## Task 09 - Basic mobile and desktop UI

Pre testiranja deploy-ovati Apps Script kao Web App i pokrenuti `initializeDatabase()`.

### Test 1: Open mobile UI

Ocekivano:

1. Web App se otvara bez query parametra.
2. Mobilni layout je citljiv.
3. Glavni tasteri su vidljivi.

### Test 2: Create payment request from mobile UI

Ocekivano:

1. Korisnik popunjava formu za novi zahtev.
2. Zahtev je kreiran.
3. Prikazuje se poruka o uspehu.
4. Red postoji u `PAYMENT_REQUESTS`.

### Test 3: List my requests

Ocekivano:

1. Korisnik otvara `Moji zahtevi`.
2. Lista zahteva se prikazuje.

### Test 4: Approve request from UI

Ocekivano:

1. Odobravalac otvara `Zahtevi za odobrenje`.
2. Odobrava zahtev.
3. Status zahteva se menja u `APPROVED`.

### Test 5: List orders waiting for payment

Ocekivano:

1. Blagajnik otvara sekciju naloga.
2. Nalozi koji cekaju isplatu su prikazani.

### Test 6: Execute payment from UI

Ocekivano:

1. Blagajnik izvrsava nalog.
2. Kreira se `CASH_OUTFLOW`.
3. Status naloga se azurira.
4. Stanje blagajne se smanjuje kroz cash event.

### Test 7: Attach document from UI

Ocekivano:

1. Korisnik bira entitet i fajl.
2. Fajl se uploaduje u Drive.
3. Kreira se red u `DOCUMENTS`.
4. Povezani entitet dobija `document_status = ATTACHED` ako podrzava tu kolonu.

### Test 8: Open and close shift from UI

Ocekivano:

1. Blagajnik otvara smenu.
2. Aktivna smena se prikazuje.
3. Zatvaranje smene sa fizickim stanjem radi.

### Test 9: Prepare daily closing from UI

Ocekivano:

1. Preview dnevnog zakljucka se prikazuje.
2. Izracunato stanje je vidljivo.
3. Zakljucivanje dana kreira red u `DAILY_CLOSING`.

### Test 10: Desktop UI opens

Ocekivano:

1. Desktop prikaz se otvara sa `?view=desktop`.
2. Dashboard sekcije su vidljive.

## Hardening and permission tests

Pre testiranja pokrenuti `initializeDatabase()` i obezbediti realne korisnike u `USERS` za svaku rolu. Testirati kroz Web App ili Apps Script funkcije, ali bez direktnog menjanja poslovnih sheetova.

### Test 1: Unauthorized user cannot approve request

Koraci:

1. Korisnik sa rolom `REQUESTER` pokusava da pokrene `approvePaymentRequest(request_id)`.
2. Proveriti status zahteva.
3. Proveriti `AUDIT_LOG`.

Ocekivano:

1. Server odbija akciju.
2. Status zahteva ostaje nepromenjen.
3. Audit log ne belezi lazno odobrenje.

### Test 2: Cashier cannot create direct order

Koraci:

1. Korisnik sa rolom `CASHIER` pokusava `createDirectPaymentOrder(orderData)`.
2. Proveriti `PAYMENT_ORDERS`.

Ocekivano:

1. Server odbija akciju.
2. Novi direktan nalog nije kreiran.

### Test 3: Cashier can execute waiting order

Koraci:

1. Pripremiti nalog u statusu `WAITING_PAYMENT`.
2. Obezbediti dovoljno stanje kroz `CASH_INFLOW`.
3. Korisnik sa rolom `CASHIER` pokrece `executePaymentOrder(order_id, {})`.

Ocekivano:

1. `CASH_OUTFLOW` je kreiran.
2. Nalog je `PAID` ili `PARTIALLY_PAID`.
3. Stanje blagajne se menja samo kroz cash event.

### Test 4: Viewer cannot modify data

Koraci:

1. Korisnik sa rolom `VIEWER` pokusava da kreira zahtev ili nalog.
2. Proveriti relevantne tabele.

Ocekivano:

1. Server odbija akciju.
2. Nema novog poslovnog zapisa.

### Test 5: Frontend hidden button is not enough

Koraci:

1. Sakriti ili prikazati dugme u UI po potrebi.
2. Pokusati direktan API poziv bez odgovarajuce role.

Ocekivano:

1. Server ponovo proverava rolu.
2. Poziv bez dozvole ne uspeva.

### Test 6: Inactive user is blocked

Koraci:

1. Postaviti `active = FALSE` za test korisnika.
2. Pokusati bilo koju poslovnu akciju.

Ocekivano:

1. Server odbija akciju.
2. Poruka jasno navodi da korisnik nije aktivan.

### Test 7: API response format is consistent

Koraci:

1. Pozvati jedan uspesan API wrapper.
2. Pozvati jedan API wrapper koji proizvodi poslovnu gresku.

Ocekivano:

1. Uspesan odgovor koristi `{ ok: true, data }`.
2. Greska koristi `{ ok: false, error: { message } }`.
3. Stack trace se ne prikazuje ako `DEBUG_MODE` nije ukljucen.

### Test 8: Audit log is append-only

Koraci:

1. Izvrsiti nekoliko poslovnih akcija.
2. Proveriti broj redova u `AUDIT_LOG`.
3. Proveriti stare audit redove.

Ocekivano:

1. Poslovne akcije dodaju nove audit redove.
2. Stari audit redovi se ne menjaju kroz normalne poslovne funkcije.

## Task 11 - Corrections and reversals

Pre testiranja obezbediti aktivnog korisnika sa rolom `ADMIN`, `FINANCE` ili `CASHIER_SUPERVISOR`. Za storno `LOCKED` dogadjaja koristiti `ADMIN` ili `FINANCE`.

### Test 1: Reverse posted CASH_INFLOW

Koraci:

1. Kreirati `CASH_INFLOW` kroz `createCashInflow()`.
2. Pokrenuti `reverseCashEvent(event_id, 'Test storna priliva')`.
3. Proveriti originalni i storno red u `CASH_EVENTS`.
4. Proveriti stanje i `AUDIT_LOG`.

Ocekivano:

1. Originalni `CASH_INFLOW` postoji sa statusom `POSTED`.
2. `reverseCashEvent` kreira `REVERSAL` event.
3. Storno smer je `OUT`.
4. Originalni status postaje `REVERSED`.
5. Obracun stanja koristi samo balance-affecting evente.
6. Audit log sadrzi `REVERSE` i `POST`.

### Test 2: Reverse posted CASH_OUTFLOW

Koraci:

1. Kreirati i izvrsiti payment order da nastane `CASH_OUTFLOW`.
2. Pokrenuti `reverseCashEvent(event_id, 'Test storna isplate')`.
3. Proveriti `CASH_EVENTS` i `AUDIT_LOG`.

Ocekivano:

1. Originalni `CASH_OUTFLOW` postoji sa statusom `POSTED`.
2. Kreira se `REVERSAL` event.
3. Storno smer je `IN`.
4. Originalni status postaje `REVERSED`.
5. Stanje se racuna prema statusima `POSTED` i `LOCKED`.
6. Audit log belezi storno.

### Test 3: Prevent duplicate reversal

Koraci:

1. Stornirati jedan posted event.
2. Ponovo pokrenuti `reverseCashEvent()` za isti originalni event.

Ocekivano:

1. Event je vec `REVERSED`.
2. Drugi pokusaj je odbijen.
3. Ne kreira se novi storno event.

### Test 4: Prevent reversal without reason

Koraci:

1. Pokrenuti `reverseCashEvent(event_id, '')`.
2. Proveriti `CASH_EVENTS`.

Ocekivano:

1. Razlog je prazan.
2. Sistem odbija storno.
3. Nema promene podataka.

### Test 5: Create correction IN

Koraci:

1. Pokrenuti `createCorrectionEvent({ cashbox_id, currency, direction: 'IN', amount, description, reason })`.
2. Proveriti `CASH_EVENTS`, stanje i `AUDIT_LOG`.

Ocekivano:

1. Kreiran je `CORRECTION` event sa smerom `IN`.
2. Status je `POSTED`.
3. Stanje se uvecava.
4. Audit log sadrzi `POST`.

### Test 6: Create correction OUT

Koraci:

1. Pokrenuti `createCorrectionEvent({ cashbox_id, currency, direction: 'OUT', amount, description, reason })`.
2. Proveriti `CASH_EVENTS`, stanje i `AUDIT_LOG`.

Ocekivano:

1. Kreiran je `CORRECTION` event sa smerom `OUT`.
2. Status je `POSTED`.
3. Stanje se smanjuje.
4. Audit log sadrzi `POST`.

### Test 7: Locked event reversal requires elevated role

Koraci:

1. Zakljuciti dan tako da event postane `LOCKED`.
2. Pokusati storno sa rolom `CASHIER_SUPERVISOR`.
3. Pokusati storno sa rolom `ADMIN` ili `FINANCE`.

Ocekivano:

1. Event je `LOCKED`.
2. Korisnik bez elevated role ne moze da stornira.
3. `ADMIN` ili `FINANCE` mogu da storniraju.
4. Audit log belezi akciju.

### Test 8: Balance excludes REVERSED original event

Koraci:

1. Stornirati posted event.
2. Pokrenuti `calculateCashboxBalance(cashbox_id, currency)`.
3. Proveriti originalni i storno event.

Ocekivano:

1. Originalni event je `REVERSED`.
2. Obracun stanja iskljucuje originalni `REVERSED` event.
3. `REVERSAL` event utice na stanje prema svom smeru.

## Task 12 - Operational reports and dashboard

Pre testiranja obezbediti aktivnog korisnika sa rolom koja sme da vidi izvestaje: `ADMIN`, `DIRECTOR`, `FINANCE`, `CASHIER_SUPERVISOR` ili `CASHIER`.

### Test 1: Dashboard summary

Ocekivano:

1. Dashboard API vraca summary.
2. Brojaci odgovaraju trenutnim sheetovima.
3. Nijedan poslovni red se ne menja.

### Test 2: Cashbox balance report

Ocekivano:

1. Izvestaj prikazuje aktivne blagajne.
2. Stanje odgovara funkciji `calculateCashboxBalance`.

### Test 3: Requests for approval report

Ocekivano:

1. Zahtevi `SUBMITTED` i `IN_REVIEW` se prikazuju.
2. `REJECTED` i `CANCELLED` zahtevi se ne prikazuju.

### Test 4: Orders waiting payment report

Ocekivano:

1. `WAITING_PAYMENT` i `PARTIALLY_PAID` nalozi se prikazuju.
2. `PAID` i `CANCELLED` nalozi se ne prikazuju.

### Test 5: Missing documents report

Ocekivano:

1. Entiteti sa `document_status = MISSING` se prikazuju.
2. Entiteti sa `ATTACHED` se ne prikazuju.

### Test 6: Daily closing report

Ocekivano:

1. Dnevni zakljucci se prikazuju.
2. Filteri po datumu, blagajni i valuti rade ako su uneti.

### Test 7: Differences report

Ocekivano:

1. Zakljucci sa nenultom razlikom se prikazuju.
2. Zakljucci bez razlike se ne prikazuju.

### Test 8: Corrections and reversals report

Ocekivano:

1. Korektivni dogadjaji se prikazuju.
2. Storno dogadjaji se prikazuju.
3. Originalni `REVERSED` dogadjaji se prikazuju prema dokumentovanoj strategiji.

### Test 9: Reports are read-only

Ocekivano:

1. Pokretanje report funkcija ne kreira, ne azurira i ne brise poslovne redove.
2. Audit log se ne puni read-only report pozivima.

### Test 10: Desktop dashboard opens

Ocekivano:

1. Desktop dashboard se ucitava.
2. Kartice su vidljive.
3. Report tabele mogu da se osveze.

## Pocetni poslovni scenariji za kasnije

- Kreiranje zahteva za isplatu
- Odobravanje zahteva za isplatu
- Odbijanje zahteva za isplatu
- Kreiranje naloga iz odobrenog zahteva
- Kreiranje direktnog naloga za isplatu
- Izvrsenje naloga za isplatu
- Sprecavanje isplate bez validnog naloga
- Sprecavanje isplate ako nema dovoljno stanja
- Upload dokumenta
- Otvaranje smene
- Primopredaja smene
- Dnevni zakljucak
- Provera audit log-a

## Napomena

Task 02 ne implementira poslovne tokove. Testira samo model podataka, inicijalizaciju Google Sheets baze, osnovne database helper funkcije, validacije i audit log osnovu.
