# Deployment Checklist

Ova lista se proverava pre sireg testiranja ili produkcionog pustanja.

Deployment mode and user identity behavior must be tested in the actual Google Workspace environment, because Session.getActiveUser().getEmail() behavior can depend on deployment settings and domain context.

## Checklist

1. Apps Script project created.
2. Google Sheet database connected.
3. `initializeDatabase()` run.
4. Root Drive folder configured.
5. Real users added to `USERS`.
6. Test users removed or disabled.
7. Deployment mode selected.
8. Access permissions checked.
9. Web App URL tested.
10. Mobile UI tested.
11. Desktop UI tested.
12. Audit log checked.
13. Backup/export plan defined.
14. Known limitations reviewed.

## Dodatne provere

1. `SPREADSHEET_ID` je popunjen ako projekat nije bound script.
2. `DOCUMENT_ROOT_FOLDER_ID` je popunjen za produkcioni Drive folder ili je potvrđeno automatsko kreiranje foldera.
3. `APP_CONFIG.DEVELOPMENT_MODE` je `false` u produkciji.
4. `APP_CONFIG.DEBUG_MODE` je `false` u produkciji.
5. Regularni korisnici nemaju direktan edit pristup Google Sheets bazi.
6. Web App je testiran kao svaki tip korisnika iz matrice prava.
7. Smoke testovi su pokrenuti u test spreadsheet-u.
8. Rucni E2E scenario je zavrsen bez direktne izmene sheetova.
