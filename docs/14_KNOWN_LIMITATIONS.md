# Known Limitations

Ovaj dokument navodi poznata ograničenja trenutne pilot verzije sistema.

## Platforma

1. Google Apps Script quotas mogu ograničiti intenzivnu upotrebu.
2. Google Sheets nije puna transakciona baza podataka.
3. Concurrent writes moraju se pažljivo testirati tokom pilota.
4. User identity zavisi od Apps Script deployment podešavanja.
5. Offline rad nije podržan.

## Integracije

1. OCR nije podržan.
2. ERP integracija nije podržana.
3. Bankarska integracija nije podržana.
4. Računovodstveno knjiženje nije podržano.
5. Digitalni potpis nije podržan.

## Poslovna ograničenja

1. Payment order reopening after reversed cash outflow nije automatizovan.
2. Advanced correction after closing needs process.
3. Post-closing korekcije se evidentiraju kroz storno/korektivne događaje, ali prethodni dnevni zaključak se ne otključava automatski.
4. Emergency payment bez naloga nije implementiran.
5. Napredna hijerarhija odobravanja nije implementirana.

## Dokumenti, izveštaji i PDF

1. PDF generisanje se oslanja na browser `Print` / `Save as PDF`.
2. Server-side PDF generisanje nije implementirano.
3. Upload dokumenata mora se posebno testirati na mobilnim uređajima.
4. Napredni BI dashboard nije implementiran.

## Operativna ograničenja

1. Test korisnici koriste placeholder email adrese dok se ne zamene realnim Google Workspace nalozima.
2. Smoke testovi ne impersoniraju role i zavise od aktivnog korisnika u Apps Script okruženju.
3. `clearTestData()` nije implementiran zbog zaštite produkcionih podataka.
4. Backup must be operationally enforced.
5. Pre svake veće izmene treba napraviti svežu kopiju Google Sheet baze.
6. Poznati problemi iz pilota moraju se voditi u `docs/23_KNOWN_ISSUES_REGISTER.md`.
