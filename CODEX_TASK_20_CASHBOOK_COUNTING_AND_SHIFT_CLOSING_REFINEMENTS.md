# CODEX_TASK_20_CASHBOOK_COUNTING_AND_SHIFT_CLOSING_REFINEMENTS

## Cilj

Uskladiti blagajničku knjigu, redne brojeve, presek smene, popis apoena, zatvaranje smene i predaju u trezor sa operativnim blagajničkim pravilima.

## Pravila

1. Redni brojevi stavki se posmatraju u izabranom prikazu.
2. Ako se gleda jedan dan, redni brojevi važe za taj dan.
3. Ako se gleda više dana, redni brojevi važe za ceo izabrani period.
4. Blagajna se operativno posmatra od preseka do preseka i kroz smene.
5. Kada presek utvrdi višak ili manjak, u blagajničkoj knjizi mora biti vidljiva korekcija.
6. Presek/korekcija mora biti jasno vizuelno označen žutom nijansom u light i dark režimu.
7. Zatvaranje smene podrazumeva obavezan popis blagajne.
8. Predaja u trezor je poseban operativni događaj koji smanjuje blagajnu, ali nije isplata korisniku.
9. Svi brojevi se prikazuju sa separatorom hiljada i dve decimale.

## Implementacija po koracima

1. [x] Sakriti desktop dugmad `Uplata`, `Isplata` i `Predaja u trezor` van taba `Knjiga`.
2. [x] Obeležiti korekcije/preseke žutom nijansom.
3. [x] Srediti redne brojeve u blagajničkoj knjizi za aktivni prikaz.
4. [x] Srediti prikaz stanja u odnosu na presek/korekciju kroz automatsku korekciju.
5. [x] Napraviti jednostavan popisni dijalog: valuta, apoen, komada, upiši.
6. [x] Prikazati unete apoene u tabeli po valutama i apoenima.
7. [x] Omogućiti zatvaranje smene samo kroz poslednji sačuvani popis.
8. [x] Dodati događaj `PREDAJA_U_TREZOR`.
9. [x] Dodati UI akciju za predaju u trezor.
10. [ ] Testirati uplatu, isplatu, storno, presek, zatvaranje smene i predaju u trezor na deploymentu.

## Napomena o propisima

Blagajnički dnevnik treba da sadrži datum, redni broj, opis promene, uplaćen/isplaćen iznos, dnevne zbirove i stanje. To je u skladu sa uobičajenim pravilima blagajničkog poslovanja. Ovaj task ne zamenjuje pravnu proveru internog pravilnika.
