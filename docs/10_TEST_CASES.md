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
