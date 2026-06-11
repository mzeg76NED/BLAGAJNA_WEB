# Known Limitations

Ovaj dokument navodi poznata ograničenja trenutne pilot verzije sistema.

## Platforma

1. Google Apps Script quotas mogu ograničiti intenzivnu upotrebu.
2. Google Sheets nije puna transakciona baza podataka.
3. Concurrent writes moraju se pažljivo testirati tokom pilota.
4. User identity zavisi od Apps Script deployment podešavanja.
5. Offline rad nije podržan.
6. Apps Script pozivi mogu biti spori, posebno kada backend čita više Google Sheets tabela.
7. Apps Script iframe može ograničiti automatsko UI testiranje kroz DOM.

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
7. Dnevni zaključak zaključava uključene događaje i ne treba ga rutinski izvršavati nad pilot podacima bez odobrenja.
8. Ako sistem nema nijednog aktivnog aplikativnog ADMIN korisnika sa `user_code` i PIN-om, potreban je ručni administrativni/bootstrap korak kroz Apps Script/helper. Automatsko kreiranje admin korisnika i default PIN nisu implementirani.
9. Mobile UI još nema poseban app login ekran; server-side write akcije sada zahtevaju validan app session i zato mobilni write tok mora dobiti login podršku pre pilot upotrebe.
10. App login deploy ne treba raditi dok `reportAppLoginDatabaseReadiness()` ne vrati `ok_for_deploy: true`.
11. Duplirani `user_id` u `USERS` tabeli blokira spremnost za app login deploy jer sesije i audit moraju jednoznačno vezati akciju za aplikativnog korisnika.
12. Faza 5 runtime QA ne sme početi ako Faza 4.6 nije izvršena nad realnom bazom ili ako readiness report i dalje ima blockers.
13. Privremeni web bootstrap iz Faze 4.7 je u Fazi 4.8 zaključan. Readiness helperi ostaju, ali web unos PIN-a kroz bootstrap endpoint više nije aktivan.
14. Mobile UI i dalje mora dobiti poseban app login/session patch pre oslanjanja na mobilne write tokove.
