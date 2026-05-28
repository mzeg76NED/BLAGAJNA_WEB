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
