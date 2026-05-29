# Known Limitations

Ovaj dokument navodi poznata ogranicenja trenutne verzije sistema.

1. Google Apps Script quotas may limit heavy usage.
2. Google Sheets is not a full transactional database.
3. Concurrent writes must be handled carefully.
4. User identity depends on deployment settings.
5. Offline mode is not implemented.
6. OCR is not implemented.
7. ERP integration is not implemented.
8. Accounting posting is not implemented.
9. Reversal/correction workflow may need a dedicated later task.
10. PDF report generation is not implemented unless already built.
11. Document digital signature is not implemented.
12. Advanced reporting/dashboard is not implemented.

## Dodatne napomene

1. Test korisnici koriste placeholder email adrese dok se ne zamene realnim Google Workspace nalozima.
2. Smoke testovi ne impersoniraju role i zavise od aktivnog korisnika u Apps Script okruzenju.
3. `clearTestData()` nije implementiran zbog zastite produkcionih podataka.
4. UI je osnovni operativni sloj i nema napredne filtere, grafikone ni izvestaje.
5. Dnevni zakljucak zakljucava ukljucene cash evente, ali korekcije posle zakljucka pripadaju posebnom buducem workflow-u.
