# ZADATAK ZA CODEX: Knjiga, Zahtevi, UI layout, dugmad i ENTER navigacija

## Naziv zadatka

`2026-06-10_knjiga-zahtevi-ui-enter`

## Kontekst

Ovaj zadatak se odnosi na projekat **BLAGAJNA**.

Pre izvršenja zadatka Codex mora da primeni pravila iz:

```text
docs/CODEX_SYSTEM_RULES.md
```

Ako fajl `docs/CODEX_SYSTEM_RULES.md` ne postoji u projektu, prvo ga treba dodati u projekat iz dostavljenog lokalnog foldera ili zatražiti od korisnika da ga obezbedi.

Ovaj zadatak je fokusiran na:

1. tab **Knjiga**: status aktivne smene i brze akcije
2. tab **Zahtevi**: dopuna funkcionalnosti za postojeće zahteve
3. sve relevantne ekrane: fiksni headeri i komande, skrol samo nad podacima
4. sva dugmad: usklađivanje vizuelnog identiteta sa stranicom **NOVI PRESEK STANJA**
5. sve forme: omogućiti unos preko tastature, posebno ENTER navigaciju

Raditi minimalan patch. Ne raditi kompletan redesign. Ne menjati poslovni tok ako nije neophodno.

---

# 1. TAB KNJIGA: AKTIVNA SMENA I BRZE AKCIJE

## Problem

Na tabu **Knjiga**, u delu brzih akcija, poruka/status **Aktivna smena** ostaje prikazana neusklađeno čak i kada aktivna smena postoji.

Dugme **Otvori smenu** ostaje vidljivo i aktivno i kada je smena već otvorena.

Ako korisnik klikne na **Otvori smenu**, sistem vraća poruku:

```text
SMENA JE VEĆ OTVORENA
```

To znači da backend pravilno zna da smena postoji, ali frontend pogrešno prikazuje dostupnu akciju.

## Zahtev

Popraviti UI logiku na tabu **Knjiga** tako da stanje smene i dostupne akcije odgovaraju stvarnom backend stanju.

### Kada ne postoji aktivna smena

Frontend treba da:

1. prikaže jasno stanje da smena nije otvorena
2. prikaže dugme **Otvori smenu**
3. onemogući ili sakrije akcije koje zahtevaju aktivnu smenu
4. korisniku jasno kaže da prvo mora otvoriti smenu

### Kada postoji aktivna smena

Frontend treba da:

1. prikaže jasno stanje da je smena aktivna
2. sakrije dugme **Otvori smenu** ili ga prikaže kao disabled
3. spreči klik na otvaranje nove smene
4. omogući brze akcije koje zahtevaju aktivnu smenu
5. ukloni konfuznu poruku koja navodi korisnika da treba da otvori smenu
6. ne dozvoli normalnim UI tokom grešku **SMENA JE VEĆ OTVORENA**

## Ograničenja

1. Ne menjati backend pravilo koje sprečava otvaranje druge smene.
2. Popravka treba prvenstveno da bude u frontend state/render logici.
3. Ako frontend koristi pogrešno polje iz backend odgovora, uskladiti ga sa postojećim backend modelom.
4. Nakon otvaranja ili zatvaranja smene, tab **Knjiga** mora osvežiti stanje aktivne smene.
5. Ne uvoditi novi model smene ako postojeći model već postoji.

## Proveriti

Codex mora proveriti:

1. gde se učitava aktivna smena
2. gde se renderuje status smene
3. gde se renderuju brze akcije
4. gde se prikazuje dugme **Otvori smenu**
5. da li postoji frontend keš/state koji se ne osvežava
6. da li se posle otvaranja/zatvaranja smene poziva reload aktivne smene
7. da li se poruka **SMENA JE VEĆ OTVORENA** javlja samo kao zaštitna backend greška, a ne kao normalan korisnički tok

---

# 2. TAB ZAHTEVI: DOPUNA FUNKCIONALNOSTI

## Problem

Na tabu **Zahtevi** nisu dostupne sve planirane funkcionalnosti za rad sa zahtevima.

Potrebno je omogućiti rad nad postojećim zahtevima, posebno:

1. ažuriranje postojećeg zahteva
2. editovanje nacrta
3. odobrenje postojećeg zahteva
4. ostale planirane akcije koje već postoje u backendu ili su predviđene postojećim tokom

## Zahtev

Na tabu **Zahtevi** dodati ili aktivirati funkcionalnosti nad postojećim zahtevima.

---

## 2.1 UPDATE postojećeg zahteva

Omogućiti ažuriranje postojećeg zahteva ako status to dozvoljava.

Posebno mora raditi editovanje zahteva u statusu nacrta.

Ako sistem ima status tipa:

```text
DRAFT
NACRT
```

ili drugi postojeći naziv za nacrt, koristiti postojeći naziv iz koda.

Ne uvoditi novi status bez potrebe.

UPDATE mora omogućiti izmenu samo onih polja koja su poslovno dozvoljena za taj status.

Proveriti postojeći model zahteva i ne izmišljati nova polja.

---

## 2.2 Editovanje nacrta

Za zahtev koji je nacrt:

1. korisnik mora moći da otvori formu za izmenu
2. forma mora biti popunjena postojećim podacima
3. snimanje mora ažurirati postojeći zahtev
4. snimanje ne sme kreirati novi zahtev
5. nakon snimanja lista zahteva mora biti osvežena
6. detalj zahteva mora prikazati izmenjene podatke
7. korisnik mora jasno videti da uređuje postojeći zahtev, a ne da kreira novi

---

## 2.3 Odobrenje postojećeg zahteva

Omogućiti odobrenje postojećeg zahteva ako status to dozvoljava.

Odobrenje mora poštovati postojeći poslovni tok:

```text
ZAHTEV ZA ISPLATU
→ NALOG ZA ISPLATU
→ IZVRŠENJE NALOGA
→ CASH_OUTFLOW
```

Zahtev ne sme direktno kreirati `CASH_OUTFLOW`.

Ako je zahtev u okviru limita, sistem treba da kreira ili već ima kreiran nalog u skladu sa postojećom logikom.

Ako je zahtev preko limita, odobrenje više instance treba da kreira nalog u skladu sa postojećom logikom.

Ne uvoditi direktnu isplatu zahteva.

---

## 2.4 Ostale planirane akcije

Proveriti postojeći kod, backend funkcije i UI planirane akcije za zahteve.

Ako već postoje backend funkcije, povezati ih u UI ako nedostaje samo frontend povezivanje.

Moguće akcije koje treba proveriti:

1. otvori detalje zahteva
2. edituj zahtev
3. snimi izmenu
4. pošalji zahtev ako postoji nacrtni tok
5. odobri zahtev
6. odbij zahtev
7. otkaži zahtev
8. kreiraj nalog iz zahteva ako je to postojeći tok
9. prikaži povezani nalog
10. osveži listu zahteva nakon akcije

Ne dodavati akciju ako backend i poslovna logika ne postoje. U tom slučaju dokumentuj šta nedostaje.

## Ograničenja za Zahteve

1. Ne menjati tok tako da zahtev direktno pravi `CASH_OUTFLOW`.
2. Ne uvoditi nove statuse bez potrebe.
3. Ne menjati model podataka ako nije neophodno.
4. Ne kreirati novi zahtev kada se radi update postojećeg.
5. Ne omogućiti editovanje zahteva u statusima gde to poslovno nije dozvoljeno.
6. Akcije u UI-ju moraju zavisiti od statusa zahteva.
7. Ako backend funkcija ne postoji, ne simulirati uspeh u frontend-u.

---

# 3. SVI VISUALI / EKRANI: FIKSNI HEADERI I KOMANDE

## Problem

Na ekranima se skroluju komande, headeri i informativni delovi ekrana.

To nije dobro za rad u aplikaciji. Korisnik mora uvek videti kontekst i komande, dok se skroluje samo deo sa podacima.

## Zahtev

Na svim relevantnim ekranima popraviti layout tako da:

1. gornji header ekrana ostaje fiksan u okviru stranice
2. informativni deo ekrana ostaje vidljiv
3. komandni deo sa dugmadima ostaje vidljiv
4. skroluje se samo data deo:
   - tabela
   - lista
   - redovi dokumenata
   - stavke
   - detaljni data panel ako je dug
5. ne sme se skrolovati cela aplikacija tako da komande nestanu van vidljivog dela
6. na desktop ekranima koristiti stabilan layout koji odgovara postojećem admin UI pristupu
7. ne menjati globalnu strukturu aplikacije ako je dovoljan lokalni CSS/layout patch

## Ekrani koje posebno treba proveriti

1. Knjiga
2. Zahtevi
3. Nalozi za isplatu
4. Novi nalog za isplatu
5. Novi zahtev za isplatu
6. Novi presek stanja
7. Pregled preseka
8. Smene
9. Trezor ako postoji kao poseban ekran
10. Svi tabovi koji imaju tabelu, listu ili desni panel detalja

Ako neki ekran nije trenutno implementiran ili nije deo postojećeg koda, ne izmišljati ga. Samo navesti da nije pronađen.

---

# 4. VIZUELNI IDENTITET DUGMADI

## Zahtev

Sva dugmad u aplikaciji moraju biti usklađena sa vizuelnim identitetom dugmadi na stranici:

```text
NOVI PRESEK STANJA
```

## Pravila

Codex treba da:

1. pronađe stil dugmadi koji se koristi na ekranu **NOVI PRESEK STANJA**
2. identifikuje CSS klase, strukturu i vizuelni obrazac
3. primeni isti vizuelni identitet na ostala dugmad gde je potrebno
4. ne pravi novi paralelni stil dugmadi ako već postoji postojeći usvojeni stil
5. ne menja funkcionalnost dugmadi
6. vizuelno razlikuje:
   - primarne akcije
   - sekundarne akcije
   - opasne akcije
   - disabled stanje

## Dugmad moraju biti konzistentna po

1. visini
2. radiusu
3. fontu
4. razmaku
5. hover stanju
6. focus stanju
7. disabled stanju
8. vizuelnoj hijerarhiji

## Posebno proveriti dugmad na ekranima

1. Knjiga
2. Zahtevi
3. Nalozi
4. Novi nalog
5. Novi zahtev
6. Preseci
7. Smene
8. Trezor

---

# 5. FORME I ENTER NAVIGACIJA

## Problem

Sve forme moraju omogućiti brz unos preko tastature.

Korisnik mora moći da unosi podatke bez prekidanja ritma rada, bez stalnog kliktanja mišem.

## Zahtev

Sve forme u aplikaciji moraju podržati rad preko tastature.

Posebno:

1. ENTER u input polju treba da prebaci fokus na sledeće logično polje
2. ENTER ne sme slučajno submitovati formu pre vremena ako korisnik nije na poslednjem koraku ili eksplicitnoj potvrdi
3. kada je korisnik na poslednjem relevantnom polju, ENTER može:
   - preći na dugme za potvrdu
   - ili izvršiti potvrdu ako je to postojeći obrazac rada tog ekrana
4. select, textarea i posebna polja moraju se ponašati logično:
   - textarea ne sme gubiti mogućnost novog reda ako je to potrebno
   - select mora dozvoliti izbor bez konflikta
5. fokus mora biti vidljiv
6. posle dodavanja reda, fokus treba da ide na sledeće očekivano polje
7. posle validacione greške, fokus treba da ide na prvo neispravno ili obavezno polje
8. ne sme biti duplog submitovanja forme
9. mora raditi unos samo tastaturom za glavne forme

## Forme koje proveriti

1. Novi presek stanja
2. Novi zahtev za isplatu
3. Edit zahteva za isplatu
4. Novi nalog za isplatu
5. Edit naloga ako postoji
6. Otvaranje smene
7. Zatvaranje smene
8. Uplata
9. Isplata
10. Trezor
11. Sve forme koje postoje u trenutnom kodu

Ako neka forma već radi ispravno, ne menjati je bez potrebe. Samo navesti da je proverena.

---

# 6. OPŠTA OGRANIČENJA

1. Minimalan patch.
2. Ne raditi kompletan redesign.
3. Ne menjati poslovni tok zahteva i naloga.
4. Ne uvoditi direktnu isplatu zahteva.
5. Ne menjati model podataka bez potrebe.
6. Ne uvoditi nove biblioteke.
7. Ne menjati globalni CSS ako može lokalno ili kroz postojeće klase.
8. Ne menjati sve fajlove formatiranjem.
9. Ne uklanjati postojeću funkcionalnost.
10. Ne sakrivati greške.
11. Ne tvrditi da je testirano ako nije testirano.
12. Ako nešto nije moguće završiti bez većeg refactora, dokumentovati problem i predložiti sledeći mali patch.

---

# 7. OBAVEZNE PROVERE PRE IZMENE

Pre izmene Codex mora proveriti:

1. gde se nalazi render taba **Knjiga**
2. gde se učitava aktivna smena
3. gde se renderuje dugme **Otvori smenu**
4. gde se renderuju brze akcije
5. gde se nalazi render taba **Zahtevi**
6. koje backend funkcije postoje za zahteve
7. koji statusi zahteva postoje
8. koje akcije su dozvoljene po statusu
9. koji CSS stil koriste dugmad na **NOVI PRESEK STANJA**
10. koji layout pattern treba koristiti za fiksne headere i skrol data zone
11. koje forme postoje i kako trenutno rade na ENTER

---

# 8. TEST KORACI

Nakon izmene obavezno ručno proveriti ili navesti kao obavezne test korake.

## 8.1 Knjiga / aktivna smena

1. Otvori aplikaciju bez aktivne smene.
2. Otvori tab **Knjiga**.
3. Proveri da je dugme **Otvori smenu** vidljivo.
4. Otvori smenu.
5. Proveri da se stanje taba osvežilo.
6. Proveri da dugme **Otvori smenu** više nije aktivno ili nije vidljivo.
7. Proveri da se ne pojavljuje poruka **SMENA JE VEĆ OTVORENA** kroz normalan UI tok.
8. Proveri da su brze akcije dostupne kada postoji aktivna smena.

## 8.2 Zahtevi

1. Otvori tab **Zahtevi**.
2. Otvori postojeći zahtev.
3. Proveri da se akcije prikazuju u skladu sa statusom.
4. Za zahtev u nacrtu proveri editovanje.
5. Snimi izmenu postojećeg zahteva.
6. Proveri da nije kreiran duplikat zahteva.
7. Proveri da se lista osvežila.
8. Proveri odobrenje zahteva ako status to dozvoljava.
9. Proveri da odobrenje ne kreira direktno `CASH_OUTFLOW`.
10. Proveri da se nalog kreira ili povezuje u skladu sa postojećom backend logikom.

## 8.3 Layout

1. Otvori svaki relevantan ekran.
2. Proveri da header i komande ostaju vidljivi.
3. Proveri da se skroluje samo deo sa podacima.
4. Proveri da desni panel detalja ostaje upotrebljiv.
5. Proveri da nema horizontalnog pucanja layouta.

## 8.4 Dugmad

1. Uporedi dugmad sa ekranom **NOVI PRESEK STANJA**.
2. Proveri primarna dugmad.
3. Proveri sekundarna dugmad.
4. Proveri opasne akcije.
5. Proveri disabled stanje.
6. Proveri hover/focus stanje ako postoji.

## 8.5 ENTER / tastatura

1. Otvori svaku glavnu formu.
2. Proveri prelazak fokusom preko ENTER.
3. Proveri da ENTER ne radi prerani submit.
4. Proveri da validaciona greška fokusira prvo problematično polje.
5. Proveri da se posle dodavanja reda fokus vraća na sledeći logičan unos.
6. Proveri da se forma može popuniti bez miša.

---

# 9. OČEKIVANI REZULTAT

Codex mora da vrati:

1. listu izmenjenih fajlova
2. kratak opis šta je popravljeno
3. posebno navesti šta je urađeno za:
   - Knjiga / aktivna smena
   - Zahtevi
   - fiksni headeri i skrol data zone
   - dugmad
   - ENTER navigacija
4. navesti šta nije menjano
5. navesti ručne test korake
6. navesti ako nešto nije moglo biti završeno
7. navesti rizike
8. navesti da li je urađeno runtime testiranje ili samo statička provera

Ne završavati odgovor generički. Mora biti jasno šta je tačno urađeno u kodu.

---

# 10. NAPOMENA ZA CODEX

Ovaj zadatak je namerno širok, ali patch mora ostati kontrolisan.

Ako se tokom analize pokaže da je potrebno menjati previše oblasti odjednom, uradi sledeće:

1. popravi prvo kritičan bug na tabu **Knjiga** u vezi sa aktivnom smenom
2. zatim dodaj dostupne akcije za **Zahteve** samo ako backend već postoji
3. zatim uradi zajedničke UI helper/CSS izmene za dugmad i skrol data zona
4. zatim ENTER navigaciju uvedi kroz zajednički helper ako je moguće bez velikog refactora
5. ako nešto traži veći zahvat, dokumentuj kao sledeći zadatak

Prioritet je stabilnost aplikacije, a ne veliki redesign.
