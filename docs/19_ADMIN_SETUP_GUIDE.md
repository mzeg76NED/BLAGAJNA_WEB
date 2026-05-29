# Admin Setup Guide

## Svrha

Ovaj vodič opisuje minimalne korake za pripremu pilot okruženja.

## Koraci

1. Kreirati Google Sheet bazu za pilot.
2. Povezati Google Apps Script projekat sa bazom ili upisati ID baze u `DATABASE_SPREADSHEET_ID` u `src/Config.gs`.
3. Proveriti da je `ENVIRONMENT = 'PILOT'`.
4. Proveriti da je `DEBUG_MODE = false`.
5. Pokrenuti `initializeDatabase()`.
6. Proveriti ili kreirati Drive folder za dokumente.
7. Po mogućnosti upisati `DOCUMENT_ROOT_FOLDER_ID` u `Config.gs`.
8. Dodati realne korisnike u `USERS`.
9. Dodeliti role: `ADMIN`, `FINANCE`, `CASHIER_SUPERVISOR`, `CASHIER`, `APPROVER`, `REQUESTER`.
10. Dodati pilot blagajnu u `CASHBOXES`.
11. Proveriti valute u `CURRENCIES`.
12. Pokrenuti `validateSystemSetup()`.
13. Pokrenuti `validateNoDangerousDefaults()`.
14. Deploy Apps Script kao Web App.
15. Testirati mobilni URL bez query parametra.
16. Testirati desktop URL sa `?view=desktop`.
17. Pokrenuti `runAllSmokeTests()`.
18. Napraviti backup kroz `createDatabaseBackupCopy()`.
19. Sačuvati link backup fajla.
20. Pokrenuti pilot.

## Funkcije za administratora

```text
initializeDatabase()
getSystemStatus()
validateSystemSetup()
validateNoDangerousDefaults()
runAllSmokeTests()
createDatabaseBackupCopy()
exportSheetAsCsv('USERS')
exportAllCoreSheetsAsCsv()
```

## Napomene

1. Placeholder korisnici kao `admin@example.com` ne smeju ostati aktivni u pilotu.
2. Test podaci moraju biti jasno označeni sa `TEST`.
3. Redovni korisnici ne treba direktno da menjaju Google Sheet bazu.
4. Pre svake veće promene treba napraviti backup.
