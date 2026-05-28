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
