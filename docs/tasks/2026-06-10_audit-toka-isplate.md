# ZADATAK ZA CODEX: Audit toka isplate

## Naziv zadatka

`2026-06-10_audit-toka-isplate`

## Tip zadatka

Kontrolni audit postojećeg stanja uz mali patch samo ako se pronađe očigledan tehnički problem.

Ovo nije zadatak za novi ekran, redesign ili promenu poslovnog toka.

---

# 1. Kontekst

Projekat **BLAGAJNA** je trenutno u fazi stabilizacije pre daljeg razvoja.

Pre dodavanja novih ekrana ili širenja funkcionalnosti potrebno je proveriti da li je postojeći tok isplate tehnički i logički čist.

U prethodnim fazama projekta već su postojali problemi kao što su:

1. duplirane frontend funkcije
2. promenjen tok zahteva i naloga
3. uklanjanje direktne isplate zahteva
4. više UI delova koji se oslanjaju na iste statuse i iste backend funkcije
5. moguć konflikt između starog i novog toka isplate

Zbog toga je potrebno prvo uraditi kontrolni audit.

Pre rada obavezno primeniti pravila iz:

```text
docs/CODEX_SYSTEM_RULES.md
```

Ako fajl `docs/CODEX_SYSTEM_RULES.md` ne postoji u projektu, prvo ga treba dodati ili zatražiti od korisnika da ga obezbedi.

---

# 2. Cilj zadatka

Cilj je proveriti da li je trenutni tok za isplate tehnički i logički čist.

Ispravan tok mora biti:

```text
ZAHTEV ZA ISPLATU
→ NALOG ZA ISPLATU
→ IZVRŠENJE NALOGA
→ CASH_OUTFLOW
```

To znači:

1. nema više direktne isplate zahteva
2. zahtev uvek vodi ka nalogu
3. samo izvršenje naloga pravi `CASH_OUTFLOW`
4. nema mrtvih funkcija koje se i dalje pozivaju
5. frontend i backend koriste iste statuse
6. pregled naloga, novi nalog i zahtev rade bez konfliktnih funkcija
7. stare funkcije ne smeju ostati aktivne ako više nisu deo važećeg toka

---

# 3. Fokus audita

Audit mora obuhvatiti sledeće delove sistema:

1. **ZAHTEV ZA ISPLATU**
2. **NALOG ZA ISPLATU**
3. izvršenje naloga
4. `CASH_OUTFLOW`
5. frontend pozive za pregled naloga
6. frontend pozive za novi nalog
7. frontend pozive za zahtev za isplatu
8. duplirane funkcije
9. zastarele funkcije
10. statusne prelaze
11. povezivanje zahteva i naloga
12. osvežavanje UI liste posle akcija

---

# 4. Obavezne provere

Codex mora proveriti sledeće.

---

## 4.1 Direktna isplata zahteva

Proveriti da zahtev za isplatu nigde više ne kreira direktno `CASH_OUTFLOW`.

Posebno proveriti:

1. backend funkcije u vezi sa zahtevima za isplatu
2. stare helper funkcije
3. frontend akcije na tabu Zahtevi
4. eventualne stare akcije tipa direktna isplata
5. testove ili smoke testove koji možda i dalje očekuju direktnu isplatu zahteva

Očekivano stanje:

```text
Zahtev za isplatu ne kreira direktno CASH_OUTFLOW.
```

Ako se pronađe direktno kreiranje `CASH_OUTFLOW` iz zahteva, to je problem koji mora biti jasno dokumentovan.

Ako je popravka mala i očigledna, uraditi minimalan patch.

Ako je popravka veća, ne raditi veliki refactor nego dokumentovati problem i predložiti sledeći zadatak.

---

## 4.2 Redovan tok isplate

Proveriti da je redovan tok:

```text
ZAHTEV ZA ISPLATU
→ NALOG ZA ISPLATU
→ IZVRŠENJE NALOGA
→ CASH_OUTFLOW
```

Proveriti:

1. kreiranje zahteva
2. šta se dešava kada je zahtev u okviru limita
3. šta se dešava kada je zahtev preko limita
4. odobrenje zahteva
5. kreiranje naloga iz zahteva
6. izvršenje naloga
7. kreiranje `CASH_OUTFLOW`
8. status zahteva nakon kreiranja naloga
9. status naloga nakon kreiranja
10. status naloga nakon izvršenja

Očekivano stanje:

1. zahtev je ulazni dokument
2. nalog je izvršni dokument
3. `CASH_OUTFLOW` nastaje samo nakon izvršenja naloga
4. zahtev ne zaobilazi nalog

---

## 4.3 Deprecated funkcija za direktnu isplatu

Proveriti funkciju:

```text
approvePaymentRequestForDirectPayment()
```

Ako postoji, očekivano je da ostane samo kao deprecated stub koji baca grešku.

Proveriti:

1. da li funkcija postoji
2. da li baca grešku
3. da li se negde aktivno poziva
4. da li frontend ima dugme ili akciju koja je poziva
5. da li testovi i dalje računaju na ovu funkciju

Očekivano stanje:

```text
approvePaymentRequestForDirectPayment() ne sme biti deo redovnog toka.
```

Ako postoji aktivan poziv na ovu funkciju, to je problem.

---

## 4.4 Povezivanje naloga sa zahtevom

Proveriti da se nalog kreiran iz zahteva pravilno povezuje sa zahtevom.

Ako su u projektu već uvedena polja:

```text
source_request_id
linked_request_id
```

proveriti da se koriste konzistentno.

Ako postoje drugačiji postojeći nazivi polja, koristiti postojeće nazive iz koda.

Ne uvoditi nova polja bez potrebe.

Proveriti:

1. da li nalog pamti ID izvornog zahteva
2. da li zahtev pamti ID kreiranog naloga ako je tako modelovano
3. da li frontend prikazuje povezani nalog
4. da li detalj naloga prikazuje povezani zahtev
5. da li se povezivanje čuva nakon osvežavanja liste
6. da li se povezivanje koristi u toku događaja ili dokumentima

Očekivano stanje:

```text
Nalog i zahtev su međusobno povezani postojećim modelom podataka.
```

---

## 4.5 Pregled naloga i apiListPaymentOrders

Proveriti da `apiListPaymentOrders` i pregled naloga rade kroz jednu važeću frontend funkciju.

Posebno proveriti funkciju:

```text
loadDesktopNalozi_()
```

Proveriti:

1. da li postoji samo jedna aktivna definicija `loadDesktopNalozi_()`
2. da li ta funkcija koristi `apiListPaymentOrders`
3. da li puni postojeći state za naloge
4. da li renderuje KPI kartice
5. da li renderuje filtere
6. da li renderuje tabelu naloga
7. da li selekcija reda puni detalj
8. da li desni panel detalja radi
9. da li se lista osvežava posle akcija

Očekivano stanje:

```text
Pregled naloga koristi apiListPaymentOrders i nema konfliktnih frontend funkcija.
```

---

## 4.6 Duplirana funkcija loadDesktopNalozi_()

Proveriti da nema više dupliranih definicija:

```text
loadDesktopNalozi_()
```

Ako postoje dve definicije, utvrditi:

1. koja se stvarno izvršava
2. koja koristi staru logiku
3. koja koristi novu logiku
4. koji pozivi zavise od svake verzije
5. šta treba ukloniti

Očekivano stanje:

```text
Postoji samo jedna važeća definicija loadDesktopNalozi_().
```

Ako duplikat postoji, a uklanjanje je mali patch, ukloniti zastarelu verziju.

Ako uklanjanje nije sigurno, dokumentovati rizik i predložiti sledeći patch.

---

## 4.7 Stara logika apiListOrdersWaitingForPayment

Proveriti da nema aktivnih poziva na staru logiku:

```text
apiListOrdersWaitingForPayment
```

ako više nije deo važećeg toka.

Proveriti:

1. frontend pozive
2. backend funkciju
3. helper funkcije
4. testove
5. dokumentaciju ili komentare ako utiču na razumevanje koda

Očekivano stanje:

```text
Ako apiListOrdersWaitingForPayment nije deo novog toka, ne sme imati aktivne UI pozive.
```

Ako funkcija ostaje zbog kompatibilnosti, jasno napisati da li je mrtva, deprecated ili i dalje legitimna.

---

## 4.8 Frontend i backend statusi

Proveriti da frontend statusi odgovaraju backend statusima.

Posebno proveriti statuse za:

1. zahtev za isplatu
2. nalog za isplatu
3. odobrenje
4. odbijanje
5. otkazivanje
6. izvršenje
7. poništenje izvršenja
8. nalog kreiran iz zahteva
9. zahtev preko limita
10. zahtev u okviru limita

Ako postoje statusi kao:

```text
WAITING_PAYMENT
ESCALATED_TO_ORDER
ORDER_CREATED
```

proveriti da ih frontend pravilno prikazuje, filtrira i koristi za akcije.

Ne uvoditi nove statuse bez potrebe.

Ako frontend koristi stari naziv statusa, a backend novi, to je konflikt koji treba popraviti minimalnim patch-om ako je očigledan.

---

## 4.9 UI akcije po statusu naloga

Proveriti da akcije u UI-ju odgovaraju statusu naloga.

Akcije koje treba proveriti:

1. odobri
2. odbij
3. otkaži
4. izvrši nalog
5. poništi izvršenje
6. štampaj nalog
7. otvori detalje

Proveriti:

1. da li se akcije prikazuju samo kada su dozvoljene
2. da li disabled stanje postoji ako se akcija prikazuje ali nije dozvoljena
3. da li klik poziva ispravnu backend funkciju
4. da li se greške prikazuju korisniku
5. da li se lista osvežava nakon akcije
6. da li detalj naloga osvežava status nakon akcije

Očekivano stanje:

```text
UI ne sme nuditi akciju koja nije dozvoljena za trenutni status naloga.
```

---

## 4.10 Osvežavanje liste naloga posle akcije

Proveriti da se posle sledećih akcija lista naloga osvežava:

1. kreiranje naloga
2. odobrenje naloga
3. odbijanje naloga
4. otkazivanje naloga
5. izvršenje naloga
6. poništenje izvršenja
7. kreiranje naloga iz zahteva
8. odobrenje zahteva koje kreira nalog

Očekivano stanje:

```text
Nakon svake akcije korisnik vidi ažurno stanje liste i detalja.
```

Ako se osvežava samo deo UI-ja, proveriti da to ne ostavlja stari status u tabeli ili detalju.

---

# 5. Ograničenja

Ovaj zadatak je audit i stabilizaciona provera.

Važe sledeća ograničenja:

1. Ovo je audit i mali patch samo ako se pronađe očigledan tehnički problem.
2. Ne raditi redesign.
3. Ne menjati poslovni tok.
4. Ne uvoditi nove statuse bez potrebe.
5. Ne menjati model podataka bez izričitog razloga.
6. Ne refaktorisati ceo fajl.
7. Ne menjati UI vizuelni identitet.
8. Ne dodavati nove ekrane.
9. Ne dodavati nove biblioteke.
10. Ne uklanjati funkcije ako nije provereno da nemaju aktivne pozive.
11. Ako se pronađe veći problem, ne rešavati ga velikim refactorom.
12. Veći problem jasno dokumentovati i predložiti sledeći mali patch.

---

# 6. Dozvoljen mali patch

Dozvoljeno je uraditi mali patch ako je problem očigledan i lokalizovan.

Primeri dozvoljenog malog patch-a:

1. uklanjanje duplirane frontend funkcije ako je jasno koja je zastarela
2. zamena pogrešnog frontend poziva novim postojećim backend pozivom
3. uklanjanje UI akcije koja poziva deprecated funkciju
4. usklađivanje frontend status labela sa postojećim backend statusima
5. dodavanje reload-a liste posle već postojeće akcije
6. korekcija poziva koji osvežava detalj naloga nakon promene statusa

Nije dozvoljeno:

1. menjati poslovni tok
2. menjati model podataka
3. uvoditi novu arhitekturu
4. prepraviti ceo frontend fajl
5. uvoditi kompletno novi UI
6. rešavati veliki problem kroz veliki refactor u ovom zadatku

---

# 7. Obavezni izlaz iz Codex-a

Codex mora da vrati sledeće.

## 7.1 Izmenjeni fajlovi

Ako je bilo izmene:

```text
IZMENJENI FAJLOVI

- putanja/fajl
- putanja/fajl
```

Ako nije bilo izmene:

```text
Nije urađena izmena koda.
```

---

## 7.2 Lista pronađenih problema

Navesti sve pronađene probleme, jasno i konkretno.

Format:

```text
PRONAĐENI PROBLEMI

1. [problem]
   - fajl:
   - funkcija:
   - posledica:
   - status: popravljeno / nije popravljeno / potreban poseban patch
```

---

## 7.3 Šta je popravljeno

Ako je urađen patch, navesti:

1. šta je promenjeno
2. gde je promenjeno
3. zašto je promenjeno
4. kako je provereno

---

## 7.4 Šta nije dirano

Obavezno navesti šta nije dirano.

Posebno:

1. poslovni tok
2. model podataka
3. statusi
4. UI redesign
5. nepovezani moduli

---

## 7.5 Mrtve funkcije i duplirani kod

Posebno navesti:

1. da li postoje mrtve funkcije
2. da li postoje duplirane funkcije
3. da li postoji aktivan poziv na zastarelu funkciju
4. da li postoji funkcija koja treba ostati samo zbog kompatibilnosti
5. da li postoji funkcija koja treba biti uklonjena u posebnom patch-u

---

## 7.6 Konflikt frontend/backend statusa

Posebno navesti:

1. da li frontend koristi statuse koji ne postoje u backendu
2. da li backend vraća statuse koje frontend ne prikazuje pravilno
3. da li su filteri usklađeni sa statusima
4. da li su akcije usklađene sa statusima
5. da li su badge/label prikazi usklađeni sa statusima

---

## 7.7 Ručni test koraci

Navesti test korake.

Minimalno:

1. kreiraj zahtev za isplatu u okviru limita
2. proveri da se kreira ili povezuje nalog
3. proveri da zahtev ne kreira direktno `CASH_OUTFLOW`
4. kreiraj zahtev preko limita ako sistem to podržava
5. odobri zahtev preko limita
6. proveri da odobrenje kreira nalog
7. izvrši nalog
8. proveri da tek izvršenje naloga kreira `CASH_OUTFLOW`
9. proveri pregled naloga
10. proveri novi nalog
11. proveri detalj naloga
12. proveri akcije po statusu
13. proveri osvežavanje liste nakon svake akcije
14. proveri browser konzolu
15. proveri server log ako postoji

Ako runtime test nije izvršen, napisati:

```text
Runtime test nije izvršen. Urađena je statička provera i navedeni su ručni test koraci.
```

---

## 7.8 Rizici

Navesti rizike.

Primeri:

1. deo toka nije pokriven testovima
2. postoje stare funkcije koje nisu uklonjene zbog nejasnih zavisnosti
3. postoje statusi koji se koriste samo u UI-ju
4. postoji backend funkcija bez frontend poziva
5. postoji frontend akcija bez jasne backend funkcije
6. postoji potreba za posebnim patch-om

---

# 8. Zašto je ovo sledeći korak

Ovo je stabilizacioni zadatak.

Pre daljeg razvoja mora se potvrditi da osnovni tok isplate radi ispravno:

```text
Zahtev za isplatu
→ Nalog za isplatu
→ Izvršenje naloga
→ CASH_OUTFLOW
```

Ako ovaj tok nije čist, svaki sledeći ekran se naslanja na nestabilnu osnovu.

Zato ovaj audit ima prednost nad dodavanjem novih ekrana.

---

# 9. Sledeći razvojni zadaci posle audita

Nakon ovog audita sledeći zadatak treba izabrati prema nalazu.

Predloženi redosled:

| Prioritet | Zadatak | Razlog |
|---:|---|---|
| 1 | Dovršiti i testirati **PREGLED NALOGA ZA ISPLATU** | Centralni operativni ekran za isplate |
| 2 | Dovršiti **ZAHTEV ZA ISPLATU** pregled i formu | Zahtev je ulaz u tok, ali ne sme zaobići nalog |

Ako audit pronađe kritičan problem, prvo rešiti taj problem kroz poseban mali patch.
