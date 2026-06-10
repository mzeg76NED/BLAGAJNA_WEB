# CODEX_SYSTEM_RULES.md

## Svrha fajla

Ovaj fajl definiše stalna pravila rada za Codex u projektu **BLAGAJNA**.

Codex mora da primenjuje ova pravila pre svake izmene koda, dokumentacije, UI-ja ili poslovne logike u ovom projektu.

Cilj je da se izbegne ponavljanje istih instrukcija u svakom promptu i da svaki zadatak bude urađen kao kontrolisana, minimalna, proverljiva izmena.

---

## 1. Uloga Codex-a

Radiš kao tehnički agent za projekat **BLAGAJNA**.

Projekat je web aplikacija za blagajničko poslovanje u okviru firme, razvijena u Google Apps Script okruženju.

Sistem obuhvata:

- blagajničku knjigu
- smene
- preseke stanja
- uplate
- isplate
- trezor
- zahteve za isplatu
- naloge za isplatu
- valute
- apoene
- događaje
- statuse
- korisnike i role
- dokumente i povezane dokumente

Aplikacija ima backend u Google Apps Script fajlovima i frontend u HTML/CSS/JS fajlovima.

Tvoj zadatak je da radiš precizne, minimalne i kontrolisane izmene postojećeg sistema, bez nepotrebnog refaktorisanja i bez menjanja arhitekture ako to nije izričito traženo.

---

## 2. Osnovna pravila rada

1. Radi minimalan patch.
2. Ne radi veliki refactor ako nije izričito tražen.
3. Ne menjaj arhitekturu sistema bez posebnog zahteva.
4. Ne uvodi nove tokove ako postojeći tok može da se popravi.
5. Ne uklanjaj postojeću funkcionalnost ako nije jasno označena kao višak.
6. Pre izmene proveri postojeće funkcije, pozive i zavisnosti.
7. Ako postoje dve slične ili duplirane funkcije, prvo utvrdi koja se stvarno koristi.
8. Ne pretpostavljaj značenje statusa, rola, valuta, smena ili dokumenata. Proveri u postojećem kodu.
9. Ne menjaj nazive statusa bez jasnog razloga.
10. Ne menjaj tekstove u UI-ju ako zadatak nije vezan za tekstove.
11. Ne menjaj globalni CSS ako je dovoljan lokalni patch.
12. Ne uvodi novu biblioteku.
13. Ne koristi mock podatke kao trajno rešenje.
14. Ne ostavljaj TODO komentare kao zamenu za završenu funkcionalnost.
15. Ne briši kod ako nisi proverio da nema aktivnih poziva.
16. Ne formatiraj ceo fajl ako menjaš mali deo.
17. Ne mešaj više različitih tema u isti patch.
18. Ne tvrdi da je nešto testirano ako nije stvarno provereno.
19. Ako ne možeš da proveriš kroz izvršavanje, napiši jasno da je urađena samo statička provera.
20. Ako postoji rizik, navedi ga direktno.

---

## 3. Stil izmena

Izmene moraju biti:

- male
- proverljive
- lokalizovane
- čitljive
- kompatibilne sa postojećim kodom
- bez nepotrebnog preimenovanja
- bez nepotrebnog pomeranja koda
- bez automatskog preformatiranja celog fajla
- bez menjanja nepovezanih modula
- bez dodavanja novih zavisnosti

Ako zadatak zahteva veću izmenu, podeli je u manje logične korake i jasno napiši šta je urađeno u tom koraku.

---

## 4. Obavezan postupak pre izmene

Pre svake izmene moraš da uradiš sledeće:

1. Pronađi relevantne fajlove.
2. Pronađi postojeće funkcije koje se odnose na zadatak.
3. Proveri sve pozive tih funkcija.
4. Proveri postojeće statuse, konstante i helper funkcije.
5. Proveri da li već postoji slična funkcionalnost.
6. Proveri da li promena može pokvariti povezane ekrane.
7. Kratko zabeleži šta je pronađeno.
8. Tek nakon toga menjaj kod.

Ako je zadatak vezan za UI, proveri i:

- HTML strukturu
- CSS klase
- JavaScript state
- event listenere
- inicijalizaciju ekrana
- render funkcije
- prazna stanja
- greške
- akcije iz dugmadi
- povratak na prethodni ekran
- osvežavanje liste nakon snimanja ili promene statusa

Ako je zadatak vezan za backend, proveri i:

- server funkcije
- API wrapper funkcije
- validacije
- upis u Sheet
- generisanje ID-ja ili broja dokumenta
- audit/event logiku
- statusne prelaze
- povezane dokumente
- smoke testove

---

## 5. Obavezan postupak posle izmene

Posle svake izmene obavezno navedi:

1. Izmenjene fajlove.
2. Kratak opis šta je promenjeno.
3. Šta nije menjano.
4. Kako je provereno.
5. Koji su test koraci.
6. Da li postoje rizici ili nedovršeni delovi.

Ako nije bilo izmene koda, jasno napiši:

```text
Nije urađena izmena koda.
```

Ako nešto nije moglo biti provereno, jasno napiši:

```text
Nije izvršeno runtime testiranje. Urađena je statička provera koda.
```

---

## 6. Format odgovora Codex-a

Odgovor uvek strukturiraj ovako:

```text
URAĐENO

[kratak opis]

IZMENJENI FAJLOVI

- putanja/fajl
- putanja/fajl

ŠTA JE PROMENJENO

- ...
- ...

ŠTA NIJE MENJANO

- ...
- ...

PROVERE

- ...
- ...

TEST KORACI

1. ...
2. ...
3. ...

NAPOMENE / RIZICI

- ...
```

Ako je zadatak samo analiza, koristi format:

```text
ANALIZA

[kratak zaključak]

PRONAĐENO

- ...
- ...

PROBLEM

- ...
- ...

PREDLOG

- ...
- ...

RIZICI

- ...

SLEDEĆI KORAK

- ...
```

Ako je zadatak dokumentacija, koristi format:

```text
DOKUMENTOVANO

[kratak opis]

FAJLOVI

- ...

SADRŽAJ

- ...
- ...

NAPOMENE

- ...
```

---

## 7. Pravila za poslovne tokove projekta BLAGAJNA

### 7.1 Smena

Smena je poseban entitet.

Smena nije samo zbirni iznos u blagajni. Ona predstavlja operativni period rada blagajne.

Smena ima događaje:

- POČETAK
- PRESEK
- KRAJ

Smena mora da prati:

- ko je počeo smenu
- koja je smena
- vreme početka
- početno stanje blagajne
- početno stanje po valutama
- početno stanje po apoenima ako postoji unos apoena
- preseke u toku smene
- rezultat svakog preseka
- zatvaranje smene
- vreme zatvaranja
- ko je zatvorio smenu
- promet u smeni
- pregled svih unosa
- stanje na kraju po valutama
- višak ili manjak po valutama
- povezane događaje i dokumente

Ako sistem koristi više valuta, smena ne sme biti prikazana samo kao jedan zbirni iznos.

Kod svih prikaza smene, gde je relevantno, mora postojati razdvajanje po valutama.

---

### 7.2 Presek stanja

Presek stanja mora da radi po valutama i apoenima.

Unos preseka mora omogućiti:

- izbor ili prikaz valute
- unos količine po apoenu
- automatski obračun vrednosti reda
- ENTER prelazak na sledeće polje
- dodavanje svakog unosa kao poseban red
- pregled svih unetih apoena
- zbir po valuti
- poređenje očekivanog i izbrojanog stanja
- prikaz viška ili manjka
- potvrdu preseka
- vezu sa aktivnom smenom ako postoji

Presek mora razlikovati:

- očekivano stanje
- izbrojano stanje
- razliku
- korisnika koji je radio presek
- vreme preseka
- valutu
- apoene
- količine

Ne sme se svoditi na jednostavan unos jednog ukupnog iznosa ako postoje apoeni i valute.

---

### 7.3 Blagajnička knjiga

Blagajnička knjiga je centralni pregled događaja blagajne.

Mora prikazivati:

- datum i vreme događaja
- tip događaja
- dokument
- povezani dokument ako postoji
- korisnika
- valutu
- iznos
- smer kretanja novca
- status
- napomenu ili opis
- vezu sa smenom

Obavezne akcije:

- UPLATA
- ISPLATA
- TREZOR

Ove akcije su vidljive samo kada postoji aktivna smena.

Ako nema aktivne smene, korisnik ne sme moći da izvrši redovnu uplatu, isplatu ili trezor operaciju kroz blagajničku knjigu.

UI mora jasno prikazati da je potrebno otvoriti smenu.

---

### 7.4 Zahtev za isplatu

Zahtev za isplatu je molba da blagajna izvrši isplatu.

Zahtev za isplatu nije izvršni dokument.

Zahtev za isplatu ne sme direktno kreirati `CASH_OUTFLOW`.

Redovan tok mora biti:

```text
ZAHTEV ZA ISPLATU
→ NALOG ZA ISPLATU
→ IZVRŠENJE NALOGA
→ CASH_OUTFLOW
```

Ako je zahtev u okviru definisanog limita:

- sistem automatski kreira NALOG ZA ISPLATU
- zahtev dobija status koji pokazuje da je nalog kreiran ili da čeka isplatu
- dalje se nastavlja standardni tok naloga za isplatu

Ako je zahtev preko limita:

- zahtev ide na višu instancu
- zahtev čeka odobrenje
- nakon odobrenja kreira se NALOG ZA ISPLATU
- tek izvršenje naloga kreira `CASH_OUTFLOW`

Zabranjeno je uvoditi redovan tok direktne isplate zahteva.

Ako postoji stara funkcija za direktnu isplatu zahteva, ona sme ostati samo kao deprecated stub koji baca grešku, ako je tako već definisano u projektu.

---

### 7.5 Nalog za isplatu

Nalog za isplatu je izvršni dokument za blagajnu.

Nalog može nastati:

- ručno
- iz zahteva za isplatu
- iz drugog odobrenog poslovnog procesa

Nalog mora imati:

- broj naloga
- datum
- primaoca
- iznos
- valutu
- svrhu
- status
- kreatora
- odobravaoca ako postoji
- izvršioca
- povezani zahtev ako postoji
- povezane dokumente
- tok događaja
- vreme kreiranja
- vreme izvršenja ako je izvršen
- razlog odbijanja ako je odbijen
- razlog otkazivanja ako je otkazan

Izvršenje naloga je jedini redovan tok koji kreira `CASH_OUTFLOW`.

Nalog iz zahteva treba da ima vezu sa zahtevom, na primer kroz polja kao što su:

- `source_request_id`
- `linked_request_id`

Ako postoje drugačiji nazivi u kodu, koristi postojeće nazive i ne uvodi nove bez potrebe.

---

### 7.6 CASH_OUTFLOW

`CASH_OUTFLOW` predstavlja stvarni izlaz novca iz blagajne.

Ne sme nastajati iz molbe ili zahteva.

Sme nastati samo kroz izvršni tok, najčešće kroz izvršenje naloga za isplatu ili drugi jasno definisan izvršni dokument.

Pre kreiranja `CASH_OUTFLOW` mora biti jasno:

- ko izvršava isplatu
- kada se izvršava
- iz koje smene
- iz koje blagajne
- u kojoj valuti
- koji je iznos
- koji dokument je osnov
- koji je status dokumenta
- da li postoji dovoljno sredstava ako sistem to proverava

---

## 8. Pravila za UI

UI mora pratiti usvojeni moderni stil aplikacije.

Opšti stil:

- desktop admin pristup
- podrška za tamni i svetli režim gde je moguće
- jasna leva navigacija
- KPI kartice na vrhu kada ekran ima agregate
- glavna tabela levo ili centralno
- detalji desno kada je pregledni ekran
- jasni statusi
- primarne akcije jasno izdvojene
- opasne akcije vizuelno odvojene
- bez piktograma ako nisu već deo postojećeg stila
- bez nepotrebnih animacija
- bez promene globalnog vizuelnog identiteta bez zahteva

Kod ekrana za pregled:

- tabela mora biti funkcionalna
- filteri moraju biti jasni
- selektovani red mora puniti detalje
- prazno stanje mora imati poruku
- greške moraju biti prikazane korisniku
- akcije moraju biti usklađene sa statusom dokumenta
- akcije koje nisu dozvoljene u datom statusu ne smeju biti aktivne
- posle akcije mora se osvežiti lista ili detalj

Kod ekrana za unos:

- korisnik mora biti vođen korak po korak
- obavezna polja moraju biti jasno označena
- validacije moraju biti pre snimanja
- greške validacije moraju biti jasne
- posle snimanja mora biti jasna potvrda
- povratak na pregled mora osvežiti listu
- forma ne sme dozvoliti dupli submit ako je zahtev u toku

Kod desnog panela detalja:

- mora prikazati osnovne podatke
- mora prikazati status
- mora prikazati tok događaja ako postoji
- mora prikazati povezane dokumente ako postoje
- mora prikazati dostupne akcije u skladu sa statusom
- ne sme prikazivati akcije koje nisu logički dozvoljene

---

## 9. Pravila za statuse

Statusi su deo poslovne logike.

Ne menjaj nazive statusa bez izričitog zahteva.

Pre izmene statusa proveri:

- gde se status kreira
- gde se status prikazuje
- gde se status filtrira
- gde se status koristi za dozvoljene akcije
- gde se status koristi u testovima
- da li postoji mapiranje statusa na labelu u UI-ju
- da li postoji mapiranje statusa na boju ili badge

Ako uvodiš novi status, moraš proveriti sve povezane delove:

- backend konstante
- validacije
- status transition logiku
- frontend render
- filtere
- badge prikaz
- akcije
- testove
- dokumentaciju

---

## 10. Pravila za API i frontend komunikaciju

Ako menjaš backend funkciju koju poziva frontend, proveri:

- naziv API funkcije
- parametre
- strukturu odgovora
- error handling
- postojeće pozive
- render funkcije koje koriste odgovor
- prazno stanje
- loading stanje
- success i error poruke

Ako menjaš frontend poziv, proveri da backend funkcija stvarno postoji.

Ako menjaš strukturu odgovora backend funkcije, proveri sve frontend delove koji koriste ta polja.

Ne uvodi novo ime polja ako već postoji odgovarajuće polje u sistemu.

---

## 11. Pravila za podatke

Ne pretpostavljaj strukturu podataka.

Pre upisa proveri postojeći model:

- sheet naziv
- kolone
- redosled kolona
- helper funkcije za čitanje
- helper funkcije za upis
- normalizaciju vrednosti
- format datuma
- format brojeva
- format valuta
- ID generatore
- audit polja

Ako nedostaje kolona ili model nije jasan, nemoj nasumično dodavati polje. Prvo proveri postojeću dokumentaciju i kod.

---

## 12. Pravila za validacije

Validacije moraju biti poslovno logične.

Za novčane transakcije proveri najmanje:

- iznos je unet
- iznos je veći od nule
- valuta je uneta
- primalac ili platiša je unet ako je obavezno
- svrha je uneta ako je obavezna
- postoji aktivna smena ako je potrebna
- korisnik ima pravo na akciju ako sistem koristi role
- dokument je u statusu koji dozvoljava akciju
- ne postoji duplo izvršenje
- ne postoji poništen ili otkazan dokument koji se pokušava izvršiti

Za preseke proveri:

- valuta postoji
- apoen postoji
- količina je broj
- količina nije negativna
- zbir se pravilno računa
- razlika se pravilno računa
- presek je vezan za smenu ako je tako definisano

---

## 13. Pravila za testiranje

Za svaku izmenu obavezno navedi test korake.

Minimalno proveriti:

1. Otvaranje relevantne stranice.
2. Učitavanje postojećih podataka.
3. Kreiranje novog zapisa ako je primenjivo.
4. Validaciju obaveznih polja ako je primenjivo.
5. Izmenu statusa ako je primenjivo.
6. Grešku validacije ako je primenjivo.
7. Povratak na pregled.
8. Osvežavanje liste.
9. Da nema grešaka u browser konzoli.
10. Da nema očiglednih server grešaka.
11. Da nisu pokvareni povezani ekrani.
12. Da se povezani dokumenti i događaji prikazuju ispravno ako postoje.

Ako se test ne može izvršiti, napiši:

```text
Test nije izvršen u runtime okruženju. Predloženi su ručni test koraci.
```

---

## 14. Pravila za smoke testove

Ako postoje smoke testovi u projektu, pokreni ili ažuriraj relevantne testove kada je primenjivo.

Ako menjaš poslovni tok, proveri da li postoje testovi za:

- zahtev za isplatu
- nalog za isplatu
- izvršenje naloga
- CASH_OUTFLOW
- smenu
- presek
- blagajničku knjigu

Ako testovi ne postoje, ne izmišljaj da postoje. Napiši da nisu pronađeni i predloži konkretne test korake.

---

## 15. Pravila za dokumentaciju

Kada se menja poslovna logika, dokumentacija mora biti usklađena.

Dokumentacija treba da sadrži:

- šta je tok
- koji su statusi
- ko pokreće događaj
- šta se automatski kreira
- šta se ne sme raditi
- koji su povezani dokumenti
- koji su test scenariji
- koji su rizici

Dokumentacija mora biti jasna, direktna i operativna.

Ne pisati generičke opise koji ne pomažu razumevanju sistema.

---

## 16. Zabranjeno bez izričitog zahteva

Ne raditi sledeće bez izričitog zahteva:

- kompletan redesign
- promena arhitekture
- brisanje statusa
- preimenovanje postojećih funkcija
- menjanje business tokova
- menjanje modela podataka
- menjanje više modula odjednom
- dodavanje novih zavisnosti
- simuliranje uspeha bez realne provere
- tvrdnja da je testirano ako nije testirano
- uklanjanje postojećih validacija
- uklanjanje audit logike
- uklanjanje povezivanja dokumenata
- menjanje globalnog CSS-a zbog jednog ekrana
- zamena postojećeg UI sistema potpuno novim pristupom
- dodavanje mock podataka kao produkciono rešenje

---

## 17. Standardni kratki prompt za Codex

Kada ovaj fajl postoji u projektu, korisnik može Codex-u slati kratke zadatke u ovom formatu:

```text
Primeni docs/CODEX_SYSTEM_RULES.md.

Zadatak:
[upiši konkretan zadatak]

Ograničenja:
- minimalan patch
- ne menjaj nepovezane module
- vrati test korake
```

Za veće zadatke:

```text
Pročitaj docs/CODEX_SYSTEM_RULES.md i primeni ta pravila.

Tema:
[tema]

Cilj:
[šta treba postići]

Trenutno stanje:
[šta sada ne valja]

Željeno stanje:
[kako treba da radi]

Ograničenja:
- minimalan patch
- zadrži postojeću arhitekturu
- ne menjaj statuse bez potrebe
- ne menjaj druge module

Test:
- navedi i izvrši relevantne test korake ako je moguće
```

---

## 18. Posebna napomena

Ovaj fajl ne zamenjuje konkretan zadatak.

On definiše stalna pravila rada.

Svaki pojedinačni prompt i dalje mora jasno reći:

- šta treba da se uradi
- u kom delu sistema
- šta ne sme da se dira
- koji je očekivani rezultat
- da li je zadatak analiza, patch, UI izmena, test ili dokumentacija

Ako postoji konflikt između ovog fajla i konkretnog zadatka, konkretan zadatak ima prednost samo ako je eksplicitno napisan i ne narušava osnovnu poslovnu logiku sistema.
