# CODEX_TASK_19_SHIFT_AND_CASH_COUNT_SEMANTICS

## Cilj

Uskladiti aplikaciju sa stvarnim poslovnim značenjem smene i preseka blagajne.

## Poslovna pravila

1. Smena je operativni period blagajne koji grupiše glavnog blagajnika, ostale blagajnike i sve događaje nastale u toku smene.
2. U jednom trenutku za jednu blagajnu može postojati samo jedna aktivna smena.
3. Korisnik koji otvori smenu smatra se glavnim blagajnikom smene.
4. U toku aktivne smene više korisnika može raditi u sistemu.
5. Direktno knjiženje gotovinskih događaja dozvoljeno je samo glavnom blagajniku smene.
6. Ostali korisnici u toku smene koriste zahteve za uplatu ili isplatu.
7. U toku jedne smene može postojati više preseka blagajne.
8. Presek blagajne je fizički popis sredstava po valutama. Čekovi se, ako se koriste, vode kroz `CURRENCIES` kao posebna valuta/instrument, bez posebnih polja za čekove.
9. Ako presek utvrdi razliku u odnosu na obračunato stanje, sistem mora evidentirati razliku.
10. Posle preseka, blagajna nastavlja od fizički utvrđenog stanja.
11. U event-based modelu to se radi kroz automatski korektivni cash event, a ne ručnim menjanjem salda.
12. Kraj smene podrazumeva završni presek/kontrolu i zatvaranje smene.

## Implementacija

1. Dokumentovati da je `opened_by` glavni blagajnik smene.
2. Ne uvoditi novu tabelu za članove smene u ovom koraku.
3. Zadržati postojeću jednu aktivnu smenu po blagajni.
4. Zadržati pravilo da direktno knjiženje radi samo korisnik koji je otvorio smenu.
5. Promeniti tekstove u UI da govore "glavni blagajnik", a ne samo "korisnik koji je otvorio smenu".
6. Presek blagajne (`CASH_COUNTS`) mora ostati evidencija fizičkog popisa.
7. Ako `difference != 0`, `createCashCount()` mora napraviti povezani `CORRECTION` cash event:
   - pozitivna razlika: `direction = IN`,
   - negativna razlika: `direction = OUT`,
   - iznos je apsolutna vrednost razlike,
   - opis mora sadržati ID preseka.
8. `CASH_COUNTS` treba da čuva ID korektivnog događaja radi sledljivosti.
9. Audit log mora zabeležiti i presek i automatsku korekciju.

## Ne raditi sada

1. Ne praviti pun modul za članove smene.
2. Ne menjati workflow Zahtev -> Odobrenje -> Nalog -> Isplata.
3. Ne menjati postojeće storno ponašanje.
4. Ne menjati ručno stare podatke u Google Sheet-u.

## Test

1. Otvoriti smenu.
2. Uraditi uplatu.
3. Uraditi presek sa istim fizičkim stanjem kao obračunato.
4. Proveriti da nije nastao korektivni cash event.
5. Uraditi presek sa većim fizičkim stanjem.
6. Proveriti da je nastao `CORRECTION IN`.
7. Uraditi presek sa manjim fizičkim stanjem.
8. Proveriti da je nastao `CORRECTION OUT`.
9. Proveriti da stanje blagajne posle preseka odgovara fizički utvrđenom stanju.
10. Proveriti `AUDIT_LOG`.
