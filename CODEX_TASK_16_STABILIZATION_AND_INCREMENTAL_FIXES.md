# CODEX_TASK_16_STABILIZATION_AND_INCREMENTAL_FIXES

## Cilj

Stabilizovati postojeći radni tok blagajne pre dodavanja većih proširenja.

Direktna uplata i direktna isplata ostaju standardna funkcionalnost blagajne. Zahtev i nalog su dodatni kontrolni tok za situacije gde isplata mora da prođe odobrenje.

Ne menjati ono što već radi dobro u prikazu blagajničke knjige. Dodavati funkcionalnosti oko postojećeg prikaza.

## Faza 1: male popravke postojećeg

1. Popraviti STORNO iz detalja stavke blagajničke knjige.
   - UI ne sme da se zamrzne.
   - Backend mora imati jasan API wrapper.
   - Posle storna osvežiti knjigu i stanje.

2. Popraviti štampu blagajničkog lista.
   - Print view treba da se otvara u novom tabu.
   - Format treba da bude A4.
   - Na jednom A4 listu treba da budu dva A5 primerka: arhiva/potpis i korisnik.
   - Ne menjati poslovni status iz print prikaza.

3. Popraviti mobilno skaliranje.
   - Mobilni prikaz mora ostati krupan i čitljiv na različitim rezolucijama.
   - Dugmad, tekst, bottom navigation i bottom sheet skalirati relativno prema realnom ekranu.
   - Ne smanjivati fontove ispod standardnog mobilnog minimuma.

4. Dodati osnovni dark mode.
   - Desktop i mobile moraju imati isti izbor teme.
   - Tema se pamti lokalno u browseru.
   - Print prikazi ostaju svetli.

5. Prikazati vreme i korisnika na kretanjima blagajne.
   - U blagajničkoj knjizi i detalju stavke prikazati vreme i korisnika koji je evidentirao stavku.
   - Sačuvati postojeći izgled knjige.

## Faza 2: performanse i glađi workflow

1. Smanjiti broj API poziva pri knjiženju i osvežavanju.
2. Zadržati optimistički prikaz knjiženja, ali završno osvežavanje učiniti manje agresivnim.
3. Keširati bootstrap podatke za UI u okviru sesije.
4. Preurediti izveštaj "Kretanja blagajne" tako da koristi isti vizuelni model kao blagajnička knjiga.

## Faza 3: veća proširenja

1. Dodati aplikaciono logovanje i jasnu aktivnu sesiju korisnika.
2. Definisati smene: naziv, vreme od, vreme do, dozvoljene uloge i status.
3. Uvesti izbor ili proveru aktivne smene pre knjiženja.
4. Doraditi workflow za Zahtev i Nalog:
   - Zahtev znači: korisnik traži da se nešto isplati.
   - Nalog znači: ovlašćeno lice nalaže blagajniku da isplati.
   - Samo izvršen cash event menja stanje blagajne.
5. Doraditi izveštaje i dashboard bez promene osnovnih poslovnih pravila.

## Ograničenja

1. Ne brisati poslovne zapise fizički.
2. Ne menjati zaključane događaje direktno.
3. Ne menjati postojeću arhitekturu cashbox/currency ako nije neophodno.
4. Korisnik ne treba da bira blagajnu u rutinskim dijalozima; sistem koristi podrazumevanu blagajnu.
5. Ne slati na GitHub dok korisnik ne potvrdi da deploy radi.
