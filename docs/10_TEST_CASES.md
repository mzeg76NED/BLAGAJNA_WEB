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
