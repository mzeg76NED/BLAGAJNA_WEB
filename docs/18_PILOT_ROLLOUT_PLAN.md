# Pilot Rollout Plan

## Cilj pilota

Pilot treba da proveri da BLAGAJNA WEB može bezbedno da podrži svakodnevni rad blagajne u ograničenom obimu, pre šire produkcione upotrebe.

Pilot nije puna produkcija. Pilot služi da proveri tokove, prava pristupa, dokumenta, izveštaje i ponašanje korisnika pre šire upotrebe.

## Preporučeni obim

1. Jedna blagajna.
2. Najviše dve valute: RSD i EUR.
3. Tri do pet korisnika.
4. Pet do deset radnih dana.
5. Ručna paralelna kontrola prema starom procesu.

## Uključeno

1. Kreiranje i odobravanje zahteva za isplatu.
2. Kreiranje i izdavanje naloga za isplatu.
3. Izvršenje izdatog naloga kroz blagajnički događaj.
4. Ručni cash inflow za pilot stanje.
5. Upload dokumenata.
6. Otvaranje, primopredaja i zatvaranje smene.
7. Dnevni zaključak.
8. Operativni izveštaji i print prikazi.
9. Backup pre i tokom pilota.

## Isključeno

1. OCR.
2. ERP integracija.
3. Bankarska integracija.
4. Računovodstveno knjiženje.
5. Digitalni potpis.
6. Napredna BI analitika.
7. Nova hijerarhija odobravanja.

## Pilot korisnici

Pilot korisnici moraju biti stvarni Google Workspace nalozi uneti u `USERS` sheet.

Minimalni skup:

1. `ADMIN`
2. `FINANCE`
3. `CASHIER_SUPERVISOR`
4. `CASHIER`
5. `REQUESTER` ili `APPROVER`, po potrebi

## Kriterijumi uspeha

1. Zahtev, nalog i isplata ostaju jasno razdvojeni.
2. Stanje blagajne odgovara paralelnoj ručnoj kontroli.
3. Korisnici ne mogu da rade akcije van svoje role.
4. Dokumenti se uspešno dodaju i kasnije pronalaze.
5. Dnevni zaključak sprečava dupliranje i zaključava uključene događaje.
6. Izveštaji su read-only.
7. Backup postoji za svaki pilot dan.
8. Poznati problemi su zapisani i rangirani.

## Dnevni pregled

Na kraju svakog pilot dana administrator i finansije proveravaju:

1. broj zahteva,
2. broj naloga,
3. broj cash eventa,
4. stanje po blagajni i valuti,
5. dokumenta koja nedostaju,
6. audit log za ključne akcije,
7. razlike u smenama i dnevnim zaključcima,
8. nove prijavljene probleme.

## Prijava problema

Svaki problem se upisuje u `docs/23_KNOWN_ISSUES_REGISTER.md` ili u dogovoreni interni issue tracker.

Obavezno zabeležiti:

1. datum,
2. korisnika,
3. oblast,
4. opis problema,
5. ozbiljnost,
6. privremeno rešenje,
7. vlasnika.

## Rollback plan

Ako pilot mora da se zaustavi:

1. napraviti finalni backup Google Sheet baze,
2. eksportovati ključne sheetove u CSV,
3. zaustaviti korišćenje Web App URL-a,
4. vratiti operativni rad na prethodni ručni proces,
5. sačuvati sve dokumente nastale tokom pilota,
6. napraviti listu korektivnih akcija pre nastavka.
