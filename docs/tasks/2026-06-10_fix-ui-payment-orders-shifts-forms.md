# ZADATAK ZA CODEX: Korektivni patch za UI, smenu, naloge, forme i verziju

## Naziv zadatka

`2026-06-10_fix-ui-payment-orders-shifts-forms`

## Tip zadatka

Korektivni patch nakon neuspešno primenjenih UI i workflow izmena.

Ovaj zadatak ima prioritet nad daljim razvojem.

---

# 1. Kontekst

Prethodni patch i deploy nisu dali očekivani rezultat u korisničkom interfejsu.

Korisnik je ručnom proverom utvrdio da sledeće nije rešeno:

1. Na tabu **Knjiga** dugme **Otvori smenu** i dalje postoji i kada je smena otvorena.
2. Vizuelni identitet dugmadi nije usklađen sa usvojenim stilom sa stranice **NOVI PRESEK STANJA**.
3. Komande, header i informativni delovi se i dalje skroluju na nekim formama, posebno na formi **Izmena zahteva**.
4. Na pregledu **Naloga za isplatu** sortiranje je obrnuto. Poslednji unet nalog mora biti na vrhu.
5. Dugmad na nalozima ne rade ili nisu povezana sa stvarnim backend akcijama.
6. Potrebno je omogućiti odobrenje naloga.
7. Dugme **Označi kao isplaćen** nema jasnu svrhu i ne treba da postoji kao operativna akcija ako nije deo poslovnog toka.
8. UI i dalje prikazuje staru verziju `22`, što znači da korisnik ne vidi očekivani deploy/verziju ili verzija nije ažurirana u interfejsu.
9. Potrebno je ponovo uraditi stvarnu UI izmenu i dokazati gde je primenjena.

Pre rada obavezno primeniti pravila iz:

```text
docs/CODEX_SYSTEM_RULES.md
```

Ako postoji konflikt između prethodnog taska i ovog taska, ovaj task ima prednost.

---

# 2. Cilj

Cilj je ispraviti konkretne UI i workflow propuste koje je korisnik ručno proverio.

Ovo nije zadatak za novi dizajn, novi ekran ili veliki refactor.

Cilj je da nakon patch-a korisnik u stvarnoj aplikaciji vidi:

1. da se **Otvori smenu** ne prikazuje kada aktivna smena postoji
2. da dugmad imaju isti vizuelni identitet kao na ekranu **NOVI PRESEK STANJA**
3. da header, info zona i komande ne skroluju, već da skroluje samo data/form body zona
4. da pregled naloga prikazuje poslednji unet nalog na vrhu
5. da akcije na nalogu rade u skladu sa statusom
6. da postoji funkcionalno odobrenje naloga ako backend tok to podržava
7. da ne postoji besmisleno dugme **Označi kao isplaćen**
8. da UI verzija bude ažurirana i vidljiva u interfejsu

---

# 3. Obavezno prvo proveriti da li se menja pravi UI

Pre bilo kakve izmene Codex mora proveriti da li je korisnički interfejs koji se menja zaista onaj koji je deploy-ovan i koji korisnik vidi.

## Proveriti

1. Koji HTML fajl/render koristi aktivni deploy:
   - `src/html/desktop.html`
   - `src/html/scripts.html`
   - `src/html/styles.html`
   - eventualno `desktop-v2` ako se realno koristi
2. Gde je prikazana verzija aplikacije.
3. Zašto UI i dalje prikazuje verziju `22`.
4. Da li postoji hardkodovana verzija u:
   - HTML-u
   - JS state-u
   - config fajlu
   - Apps Script manifestu
   - footer/header komponenti
5. Da li `clasp push` i deploy zaista uključuju fajlove koji se menjaju.
6. Da li postoji cache problem ili drugi deployment URL koji korisnik otvara.
7. Da li treba ažurirati lokalnu konstantu verzije aplikacije.

## Obavezno

Ako se utvrdi da korisnik gleda drugi UI fajl ili drugi deploy, prvo to jasno dokumentovati i popraviti.

Ne sme se ponovo menjati pogrešan UI sloj.

---

# 4. Kritična ispravka: Knjiga / Otvori smenu

## Problem

Na tabu **Knjiga** dugme **Otvori smenu** i dalje je vidljivo kada aktivna smena postoji.

To je pogrešno.

## Zahtev

Popraviti render logiku taba **Knjiga** tako da:

### Ako aktivna smena ne postoji

1. prikazuje se informacija da nema aktivne smene
2. dugme **Otvori smenu** je vidljivo i aktivno
3. akcije koje zahtevaju smenu su sakrivene ili disabled

### Ako aktivna smena postoji

1. prikazuje se informacija da je smena aktivna
2. dugme **Otvori smenu** ne sme biti prikazano
3. ako iz tehničkog razloga mora ostati u DOM-u, mora biti `hidden` i `disabled`
4. klik na otvaranje smene ne sme biti moguć
5. korisnik ne sme doći do backend poruke **SMENA JE VEĆ OTVORENA** kroz normalan UI tok
6. brze akcije koje zahtevaju aktivnu smenu treba da budu dostupne u skladu sa rolom korisnika

## Proveriti tačno

1. koja promenljiva/state čuva aktivnu smenu
2. koji backend poziv vraća aktivnu smenu
3. gde se renderuje quick actions zona
4. gde se dodaje dugme **Otvori smenu**
5. da li se posle otvaranja/zatvaranja smene ponovo učitava state
6. da li postoji više render funkcija za Knjigu
7. da li postoje duplirani elementi ili stari markup koji ostaje vidljiv

## Prihvatni kriterijum

Kada postoji aktivna smena, tekst ili dugme **Otvori smenu** ne sme biti vidljivo kao akcija korisniku.

---

# 5. Dugmad: primeniti visual sa NOVI PRESEK STANJA

## Problem

Dugmad nisu usklađena sa usvojenim vizuelnim identitetom.

Korisnik je eksplicitno tražio da sva dugmad budu u istom stilu kao na stranici:

```text
NOVI PRESEK STANJA
```

## Zahtev

1. Pronaći konkretne CSS klase i markup obrazac dugmadi na stranici **NOVI PRESEK STANJA**.
2. Dokumentovati u odgovoru koje klase su preuzete kao kanonski stil.
3. Primenu tog stila proširiti na:
   - Knjiga
   - Zahtevi
   - Izmena zahteva
   - Novi zahtev
   - Nalozi za isplatu
   - Detalj naloga
   - Novi nalog
   - Preseci
   - Smene ako su u istom UI sloju
4. Ne praviti novi paralelni stil ako već postoji usvojeni stil.
5. Ne menjati samo jedno dugme; napraviti konzistentan lokalni/shared helper ako je moguće bez velikog refactora.
6. Dugmad moraju imati jasne varijante:
   - primarno
   - sekundarno
   - opasno
   - disabled
7. Sva dugmad moraju imati konzistentno:
   - visinu
   - border radius
   - razmak
   - font
   - hover
   - focus
   - disabled stanje

## Prihvatni kriterijum

Na navedenim ekranima dugmad moraju vizuelno odgovarati dugmadima sa ekrana **NOVI PRESEK STANJA**.

U završnom izveštaju obavezno navesti:

1. koje klase su identifikovane kao standard
2. gde su primenjene
3. da li je nešto ostalo van opsega i zašto

---

# 6. Fiksni headeri, komande i skrol samo data/body zone

## Problem

Na nekim ekranima se i dalje skroluju komande, header i informativni delovi.

Posebno je primećeno na formi:

```text
Izmena zahteva
```

## Zahtev

Popraviti layout obrazac tako da:

1. header ekrana ostaje vidljiv
2. informativni deo ostaje vidljiv
3. komandna dugmad ostaju vidljiva
4. skroluje se samo sadržaj:
   - tabela
   - lista
   - stavke
   - form body
   - data zona
5. forma **Izmena zahteva** mora biti posebno popravljena
6. ako isti problem postoji na drugim formama, primeniti isti obrazac

## Posebno proveriti forme

1. Izmena zahteva
2. Novi zahtev
3. Novi nalog
4. Izmena naloga ako postoji
5. Novi presek stanja
6. Otvaranje smene
7. Zatvaranje smene
8. Uplata
9. Isplata
10. Trezor

## Tehnički zahtev

Ako postoje modal/form shell komponente, popraviti shell, a ne pojedinačno svaku formu, ali samo ako to ne pravi veliki refactor.

Ako nema shared shell-a, primeniti lokalni patch na relevantne forme.

## Prihvatni kriterijum

Na formi **Izmena zahteva** komande i header ne smeju nestajati skrolovanjem. Skroluje se samo deo sa poljima/sadržajem.

---

# 7. Pregled naloga za isplatu: sortiranje

## Problem

Sort na pregledu **Naloga za isplatu** je obrnut.

Korisnik očekuje:

```text
poslednji unet nalog treba da je na vrhu
```

## Zahtev

Popraviti sortiranje liste naloga za isplatu tako da najnoviji nalog bude prvi.

Proveriti po kom polju treba sortirati:

1. datum kreiranja
2. vreme kreiranja
3. broj naloga ako nosi redosled
4. ID ako je monotono rastući
5. postojeće backend polje koje najtačnije označava unos

Ne pogađati. Proveriti postojeći model podataka.

## Mesto ispravke

Ispravku uraditi na mestu koje je najstabilnije:

1. backend sort u `apiListPaymentOrders` ili povezanoj funkciji, ako je to centralni izvor liste
2. frontend sort samo ako backend već vraća sve podatke, a UI ima lokalne filtere/sort

Ako postoji više pregleda koji koriste istu listu, ne pokvariti ih.

## Prihvatni kriterijum

Na pregledu naloga, poslednji kreiran/unet nalog prikazuje se kao prvi red.

---

# 8. Nalozi za isplatu: dugmad i akcije

## Problem

Dugmad na nalozima ne rade ili nisu vezana za pravi tok.

Korisnik posebno navodi:

1. potrebno je da može odobriti nalog
2. dugme **Označi kao isplaćen** nema svrhu
3. dugmad nisu u traženom visualu

## Zahtev

Pregledati akcije u detalju naloga i uskladiti ih sa backend tokom.

## Obavezno proveriti backend funkcije

Pronaći postojeće funkcije za:

1. kreiranje naloga
2. odobrenje naloga
3. odbijanje naloga
4. otkazivanje naloga
5. izvršenje naloga
6. poništenje izvršenja
7. štampu naloga ako postoji
8. osvežavanje detalja/lista

Ne izmišljati backend funkciju ako ne postoji.

Ako backend funkcija za odobrenje ne postoji, dokumentovati i predložiti minimalan backend patch.

Ako backend funkcija postoji, povezati frontend dugme na nju.

## Odobrenje naloga

Omogućiti da korisnik može odobriti nalog ako status to dozvoljava.

Proveriti status iz koga je odobrenje dozvoljeno.

Ne uvoditi novi status bez potrebe.

UI mora:

1. prikazati dugme **Odobri nalog** samo kada je dozvoljeno
2. pozvati postojeću backend funkciju za odobrenje
3. prikazati grešku ako backend odbije akciju
4. osvežiti listu i detalj nakon uspeha
5. evidentirati audit/event ako backend to već radi

## Dugme “Označi kao isplaćen”

Ovo dugme nema jasnu svrhu i ne odgovara poslovnom toku ako već postoji izvršenje naloga.

Potrebno je:

1. pronaći gde se renderuje **Označi kao isplaćen**
2. proveriti šta poziva
3. ako samo duplira izvršenje ili nema backend akciju, ukloniti ga iz UI-ja
4. ako je trebalo da znači **Izvrši nalog**, preimenovati ga u skladu sa poslovnim tokom samo ako poziva pravu funkciju izvršenja
5. ne ostavljati besmisleno dugme u UI-ju

Preferirano:

```text
Označi kao isplaćen
```

ukloniti ili zameniti jasnom akcijom:

```text
Izvrši nalog
```

samo ako je to stvarni backend tok.

## Prihvatni kriterijum

1. Korisnik može odobriti nalog kroz UI ako status to dozvoljava.
2. Dugmad u detalju naloga rade.
3. Dugme **Označi kao isplaćen** ne postoji kao besmislena akcija.
4. Posle akcije se osvežavaju i lista i detalj.
5. Akcije su vidljive samo u statusima gde imaju smisla.
6. Dugmad imaju vizuelni identitet kao **NOVI PRESEK STANJA**.

---

# 9. Verzija aplikacije u UI

## Problem

Korisniku u interfejsu i dalje stoji verzija `22`, iako je deploy urađen kao novija verzija.

## Zahtev

Proveriti i popraviti prikaz verzije aplikacije.

## Proveriti

1. gde se definiše prikazana verzija
2. da li je hardkodovana u HTML-u
3. da li dolazi iz config-a
4. da li se puni iz backend-a
5. da li deploy verzija Apps Script-a ima veze sa UI verzijom
6. da li postoji cache ili korisnik gleda stari URL
7. da li treba povećati internu UI verziju

## Očekivano

UI mora prikazivati aktuelnu internu verziju posle ovog patch-a.

Predlog verzije:

```text
v2.0.24-pilot-ui-correction
```

Ako projekat ima drugačiji format verzionisanja, koristiti postojeći format i povećati verziju za jedan korak.

## Prihvatni kriterijum

U interfejsu više ne sme da stoji stara verzija `22` ako je patch deploy-ovan.

---

# 10. Obavezne provere pre izmene

Pre izmene Codex mora proveriti:

1. da li menja UI koji je stvarno aktivan u deploy-u
2. gde se renderuje tab Knjiga
3. gde se renderuje dugme **Otvori smenu**
4. gde se čuva state aktivne smene
5. gde se renderuju dugmad i koje CSS klase koristi **NOVI PRESEK STANJA**
6. gde je forma **Izmena zahteva**
7. gde se definiše scroll/layout forme
8. gde se učitava i sortira pregled naloga
9. koje backend funkcije postoje za odobrenje naloga
10. gde se renderuje dugme **Označi kao isplaćen**
11. gde se prikazuje verzija aplikacije

---

# 11. Ograničenja

1. Minimalan patch.
2. Ne raditi kompletan redesign.
3. Ne menjati poslovni tok zahteva i naloga.
4. Ne uvoditi direktnu isplatu zahteva.
5. Ne menjati model podataka bez izričitog razloga.
6. Ne uvoditi nove statuse bez potrebe.
7. Ne uvoditi nove biblioteke.
8. Ne refaktorisati ceo `scripts.html`.
9. Ne menjati `desktop-v2` osim ako se dokaže da ga aktivni deploy stvarno koristi.
10. Ne tvrditi da je testirano ako nije runtime provereno.
11. Ne ostavljati dugmad koja nemaju funkciju.
12. Ne ostavljati UI verziju neažurnom.

---

# 12. Obavezni test koraci

Codex mora navesti, a korisnik treba ručno da proveri, sledeće.

## 12.1 Knjiga / smena

1. Otvoriti aplikaciju bez aktivne smene.
2. Otvoriti tab **Knjiga**.
3. Proveriti da je **Otvori smenu** vidljivo.
4. Otvoriti smenu.
5. Vratiti se na **Knjiga**.
6. Proveriti da **Otvori smenu** više nije vidljivo.
7. Proveriti da nema poruke **SMENA JE VEĆ OTVORENA** u normalnom toku.
8. Zatvoriti smenu ako tok to dozvoljava.
9. Proveriti da se dugme ponovo vraća kada nema aktivne smene.

## 12.2 Dugmad

1. Otvoriti **NOVI PRESEK STANJA**.
2. Zabeležiti vizuelni stil dugmadi.
3. Otvoriti **Knjiga**.
4. Otvoriti **Zahtevi**.
5. Otvoriti **Izmena zahteva**.
6. Otvoriti **Nalozi za isplatu**.
7. Otvoriti detalj naloga.
8. Proveriti da dugmad imaju isti vizuelni identitet.

## 12.3 Skrol i fiksni headeri

1. Otvoriti formu **Izmena zahteva**.
2. Popuniti ili otvoriti zahtev sa dovoljno podataka da forma ima skrol.
3. Proveriti da header i komande ostaju vidljivi.
4. Proveriti da se skroluje samo body/data deo.
5. Ponoviti za novi zahtev i novi nalog ako imaju isti problem.

## 12.4 Sort naloga

1. Kreirati novi nalog za isplatu.
2. Otvoriti pregled naloga.
3. Proveriti da je poslednji unet nalog na vrhu.
4. Proveriti da filteri ne kvare redosled.
5. Osvežiti stranicu i proveriti da redosled ostaje isti.

## 12.5 Akcije naloga

1. Kreirati nalog u statusu koji dozvoljava odobrenje.
2. Otvoriti detalj naloga.
3. Kliknuti **Odobri nalog**.
4. Proveriti da se status promenio.
5. Proveriti da su lista i detalj osveženi.
6. Proveriti da dugme **Označi kao isplaćen** ne postoji kao besmislena akcija.
7. Proveriti da postoji samo poslovno jasna akcija, na primer **Izvrši nalog**, ako status to dozvoljava.
8. Proveriti da backend ne vraća grešku zbog pogrešnog statusa.

## 12.6 Verzija

1. Otvoriti aplikaciju posle deploy-a.
2. Proveriti prikaz verzije.
3. Verzija ne sme ostati `22`.
4. Očekivano: nova interna verzija ili postojeći format uvećan za ovaj patch.

## 12.7 Browser konzola

1. Otvoriti browser devtools.
2. Proći kroz Knjiga, Zahtevi i Nalozi.
3. Proveriti da nema JS grešaka.
4. Proveriti da nema neuspešnih poziva backend funkcija.

---

# 13. Obavezan izlaz iz Codex-a

Codex mora vratiti odgovor u ovom formatu:

```text
URAĐENO

[kratak opis]

IZMENJENI FAJLOVI

- ...

ŠTA JE STVARNO POPRAVLJENO

1. Knjiga / Otvori smenu:
   - ...
2. Dugmad / visual:
   - ...
3. Skrol / fiksni headeri:
   - ...
4. Sort naloga:
   - ...
5. Akcije naloga:
   - ...
6. Verzija:
   - ...

ŠTA NIJE MENJANO

- ...

PROVERE

- ...

TEST KORACI

- ...

RIZICI

- ...
```

Ako neka stavka nije rešena, ne sme pisati da je rešena.

Za svaku nerešenu stavku mora napisati:

1. zašto nije rešena
2. gde je problem
3. koji je sledeći minimalni patch

---

# 14. Prihvatni kriterijumi celog zadatka

Zadatak se smatra prihvaćenim samo ako su ispunjeni svi uslovi:

1. **Otvori smenu** nije vidljivo kada postoji aktivna smena.
2. Dugmad su vizuelno usklađena sa **NOVI PRESEK STANJA**.
3. Forma **Izmena zahteva** ne skroluje header i komande.
4. Pregled naloga sortira najnoviji nalog na vrh.
5. Nalog je moguće odobriti iz UI-ja ako status to dozvoljava.
6. Dugme **Označi kao isplaćen** je uklonjeno ili zamenjeno poslovno ispravnom akcijom.
7. Dugmad u detalju naloga rade.
8. UI verzija više nije `22`.
9. Lista i detalj se osvežavaju nakon akcija.
10. Nema JS grešaka u konzoli pri osnovnom prolasku kroz Knjiga, Zahtevi i Nalozi.

---

# 15. Napomena

Ovaj zadatak postoji zato što prethodni patch nije proizveo očekivani rezultat u stvarnom UI-ju.

Zato Codex ne sme završiti samo statičkom tvrdnjom da je promena urađena.

Mora eksplicitno navesti:

1. gde je promenjen aktivni UI
2. kako je utvrdio da je to UI koji korisnik vidi
3. gde se prikazuje verzija
4. koje klase dugmadi su preuzete kao standard
5. koje akcije naloga su povezane sa backend funkcijama
