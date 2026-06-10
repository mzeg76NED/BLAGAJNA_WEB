# ZADATAK ZA CODEX: Workflow update za nalog za isplatu, UI statusi, fokus, forme i smene

## Naziv zadatka

`2026-06-10_workflow-update-payment-order-ui-shifts`

## Tip zadatka

Kombinovani zadatak:

1. poslovni workflow update za **NALOG ZA ISPLATU**
2. UI korekcije za statuse, dugmad, fokus i fiksne komande
3. korekcija skrola na stranici **SMENE**
4. standardizacija status labela kroz celu aplikaciju

Ovaj task ima prioritet nad daljim razvojem novih ekrana.

---

# 1. Kontekst

Posle poslednjeg patch-a korisnik je ručno proverio aplikaciju i definisao nove obavezne izmene.

Važno: ovo više nije samo kozmetički UI patch.

Potrebno je izmeniti poslovni tok naloga za isplatu.

## Dosadašnji problem

Trenutno akcija tipa **Izvrši nalog** direktno izvršava isplatu i menja stanje blagajne.

To nije ispravno.

## Novo pravilo

Supervizor odobrava nalog, ali **supervizor ne isplaćuje novac**.

Kada korisnik kaže:

```text
Izvrši nalog
```

sistem ne sme direktno menjati stanje blagajne.

Umesto toga:

```text
Izvrši nalog
→ kreira se zapis ISPLATA u blagajni
→ taj zapis čeka blagajnika da ga stvarno izvrši
→ tek blagajnikovo izvršenje isplate menja stanje blagajne
```

Dakle, odobrenje i izvršenje naloga nisu isto što i fizička isplata iz blagajne.

---

# 2. Pre rada

Obavezno primeniti:

```text
docs/CODEX_SYSTEM_RULES.md
```

Ako postoji konflikt između prethodnih taskova i ovog taska, ovaj task ima prednost za workflow naloga za isplatu.

Ne raditi veliki refactor. Ako je potrebno promeniti workflow, uraditi ga kao minimalan kontrolisan patch.

---

# 3. Ciljevi zadatka

Potrebno je uraditi sledeće:

1. Status **NALOG ZA ISPLATU - ČEKA NA ISPLATI** treba da ima iste boje kao labela **U pripremi** na formi **NOVI PRESEK STANJA - unos apoena**.
2. Fokus na aktivnim poljima za unos mora biti jasno vidljiv, sa svetlom linijom/outline efektom kao da polje blago sija.
3. Na pregledu **NALOGA ZA ISPLATU** obavezno dodati dugme za edit kada je nalog u `DRAFT` statusu.
4. Korisnik mora imati mogućnost da edituje DRAFT nalog.
5. Status labele kroz celu aplikaciju moraju biti standardizovane. Ne sme negde pisati `DRAFT`, a negde `Nacrt`, ako je dogovorena jedna labela.
6. Ako nema dovoljno sredstava za isplatu, pokušaj isplate mora biti upisan u tok naloga i obeležen crveno.
7. Kada dođe do stvarne isplate, događaj u toku naloga mora biti obeležen zeleno.
8. Novi workflow: akcija **Izvrši nalog** kreira zapis **ISPLATA** koji čeka blagajnika, a ne menja odmah stanje blagajne.
9. Komandna dugmad na formama treba organizovati konzistentno, idealno u sticky footer iznad status linije.
10. Stranica **SMENE** mora prestati da skroluje ceo sadržaj. Header/komande ostaju vidljivi, skroluje se samo data zona.

---

# 4. Status "Čeka na isplati" - boja kao "U pripremi"

## Problem

Status kod **NALOG ZA ISPLATU - ČEKA NA ISPLATI** nema odgovarajuću boju.

Korisnik traži da se status labela **Čeka na isplati** prikaže istim bojama kao labela:

```text
U pripremi
```

na formi:

```text
NOVI PRESEK STANJA - unos apoena
```

## Zahtev

1. Pronaći CSS klasu ili stil koji se koristi za labelu **U pripremi** na formi **NOVI PRESEK STANJA - unos apoena**.
2. Isti vizuelni stil primeniti na status labelu naloga **Čeka na isplati**.
3. Ne praviti novi stil ako postoji postojeći stil za **U pripremi**.
4. Ako se koristi status class mapper, povezati status naloga sa istom ili izvedenom klasom.
5. U odgovoru navesti tačnu CSS klasu/stil koji je korišćen.

## Prihvatni kriterijum

Status naloga **Čeka na isplati** vizuelno odgovara labeli **U pripremi** iz forme **NOVI PRESEK STANJA - unos apoena**.

---

# 5. Fokus na poljima za unos

## Problem

Kod unosa preko tastature korisnik ne vidi dovoljno jasno koje polje je trenutno aktivno.

## Zahtev

Dodati jasan focus stil za sva relevantna polja za unos.

Fokus treba da ima:

1. svetlu liniju oko polja
2. blagi glow/sijanje
3. dovoljno kontrasta u light i dark modu
4. da ne narušava layout
5. da bude primenjen na:
   - input
   - select
   - textarea
   - custom polja ako postoje
   - polja u modalima/formama
   - polja u tabelarnom unosu apoena

## Tehnička napomena

Koristiti CSS `:focus` i/ili `:focus-visible`.

Ne uklanjati accessibility outline bez zamene.

## Prihvatni kriterijum

Kada korisnik TAB/ENTER navigacijom prelazi kroz formu, aktivno polje mora biti jasno obeleženo svetlom linijom i blagim glow efektom.

---

# 6. Pregled naloga za isplatu: edit DRAFT naloga

## Problem

Na pregledu **NALOGA ZA ISPLATU** ne postoji obavezno dugme za edit naloga u `DRAFT` statusu.

Korisnik mora imati priliku da edituje DRAFT nalog.

## Zahtev

Dodati akciju:

```text
Edituj nacrt
```

ili standardizovanu labelu u skladu sa status labelama, za nalog u `DRAFT` statusu.

## Pravila

1. Dugme za edit se prikazuje samo za DRAFT naloge.
2. Klik otvara postojeću formu za novi/izmenu naloga u edit modu.
3. Forma mora biti popunjena postojećim podacima naloga.
4. Snimanje mora ažurirati postojeći nalog, ne kreirati novi.
5. Posle snimanja lista naloga i detalj naloga moraju se osvežiti.
6. Backend mora proveriti da je nalog i dalje u statusu `DRAFT` u trenutku snimanja.
7. Ako backend update funkcija već postoji, koristiti je.
8. Ako backend update funkcija ne postoji, dodati minimalnu funkciju za update DRAFT naloga.
9. Ne dozvoliti edit naloga koji više nije DRAFT.

## Proveriti

1. postojeće funkcije za kreiranje naloga
2. postojeće funkcije za update naloga
3. model naloga
4. status mapper
5. frontend forma za novi nalog
6. da li forma već ima edit mode
7. da li postoje helperi za punjenje forme

## Prihvatni kriterijum

DRAFT nalog može da se otvori, izmeni i sačuva bez kreiranja duplikata.

---

# 7. Standardizacija status labela kroz celu aplikaciju

## Problem

U aplikaciji se statusi ne prikazuju dosledno.

Primer:

```text
negde je Draft
negde je Nacrt
```

To mora biti standardizovano.

## Zahtev

U celoj aplikaciji standardizovati prikaz status labela.

## Predlog standarda

Koristiti srpske poslovne labele u UI-ju.

| Interni status | UI labela |
|---|---|
| `DRAFT` | `Nacrt` |
| `SUBMITTED` | `Poslat` |
| `CASHIER_REVIEW` | `Pregled blagajne` |
| `IN_REVIEW` | `Na proveri` |
| `APPROVED` | `Odobren` |
| `ESCALATED_TO_ORDER` | `Prosleđen na odobrenje` |
| `ORDER_CREATED` | `Nalog kreiran` |
| `WAITING_PAYMENT` | `Čeka na isplati` |
| `PARTIALLY_PAID` | `Delimično isplaćen` |
| `PAID` | `Isplaćen` |
| `REJECTED` | `Odbijen` |
| `REJECTED_BY_CASHIER` | `Odbijen od blagajne` |
| `RETURNED_FOR_CORRECTION` | `Vraćen na ispravku` |
| `CANCELLED` | `Otkazan` |
| `CLOSED` | `Zatvoren` |

Ako projekat već ima usvojene srpske nazive koji se razlikuju od ove tabele, koristiti postojeći standard, ali ga primeniti svuda.

## Obavezno

1. Ne menjati interne status kodove bez potrebe.
2. Menjati samo UI labele i mapper-e.
3. Proveriti:
   - status label helper za zahteve
   - status label helper za naloge
   - KPI
   - tabove
   - filtere
   - badge prikaze
   - detalj dokumenta
   - timeline/tok događaja
4. Ne sme ostati mešavina `DRAFT`, `Draft`, `Nacrt`, `nacrt`.

## Prihvatni kriterijum

Kroz celu aplikaciju korisnik vidi iste nazive za iste statuse.

---

# 8. Nedovoljno sredstava: upis u tok naloga

## Problem

Kada nema dovoljno sredstava za isplatu, pokušaj isplate mora biti evidentiran u toku naloga.

Trenutno nije dovoljno da backend samo vrati grešku.

## Zahtev

Kada korisnik pokuša isplatu/izvršenje i nema dovoljno sredstava:

1. događaj mora biti upisan u tok naloga
2. događaj mora jasno reći da isplata nije izvršena zbog nedovoljno sredstava
3. tačka u timeline-u/toku naloga mora biti obeležena crveno
4. status naloga ne sme biti pogrešno promenjen u isplaćen
5. korisnik mora videti grešku i u UI-ju
6. audit/event log mora biti usklađen sa postojećim modelom

Kada dođe do stvarne isplate:

1. događaj mora biti upisan u tok naloga
2. događaj mora biti obeležen zeleno
3. status mora biti ažuriran u skladu sa postojećim tokom
4. lista i detalj moraju biti osveženi

## Proveriti

1. gde se proverava raspoloživo stanje blagajne
2. koja funkcija baca grešku za nedovoljno sredstava
3. kako se trenutno upisuje tok naloga
4. kako se prikazuje timeline/tok naloga
5. koje klase postoje za crveni/zeleni događaj
6. da li postoji audit helper koji treba koristiti

## Važno

Ne uvoditi paralelni audit model.

Koristiti postojeći model događaja/timeline-a ako postoji.

## Prihvatni kriterijum

Neuspešan pokušaj isplate zbog nedovoljno sredstava ostaje vidljiv u toku naloga kao crveni događaj.

Stvarna isplata se vidi kao zeleni događaj.

---

# 9. Novi workflow za izvršenje naloga

## Kritično novo pravilo

Kada korisnik iz naloga izabere:

```text
Izvrši nalog
```

ne sme se direktno menjati stanje u blagajni.

## Ispravan tok

```text
1. Nalog je odobren.
2. Korisnik klikne Izvrši nalog.
3. Sistem kreira zapis ISPLATA u blagajni.
4. Taj zapis čeka blagajnika da ga izvrši.
5. Tek kada blagajnik izvrši ISPLATA zapis, menja se stanje blagajne.
6. Nalog se zatvara ili označava kao isplaćen tek nakon stvarne blagajničke isplate.
```

## Poslovno objašnjenje

Odobrenje naloga radi supervizor.

Supervizor ne isplaćuje novac.

Zato akcija na nalogu ne sme direktno da bude fizička isplata iz blagajne.

Nalog je instrukcija/odobrenje, a blagajnička ISPLATA je stvarni blagajnički događaj.

## Zahtev

Pronaći postojeći tok za kreiranje blagajničke isplate.

Mogući nazivi koje treba proveriti u kodu:

1. `CASH_OUTFLOW`
2. `ISPLATA`
3. `cash outflow`
4. funkcije za direktnu isplatu iz Knjige
5. funkcije za kreiranje cash event-a
6. funkcije za pending cash action
7. funkcije za blagajničke događaje

Potrebno je napraviti minimalnu izmenu tako da:

1. akcija **Izvrši nalog** više ne menja odmah stanje blagajne
2. akcija kreira pending zapis **ISPLATA** povezan sa nalogom
3. taj zapis se vidi blagajniku kao obaveza za isplatu
4. stvarno izvršenje pending isplate radi kroz postojeći blagajnički tok
5. nalog pamti vezu sa kreiranom isplatom
6. timeline naloga prikazuje da je isplata poslata blagajni / čeka izvršenje
7. kada blagajnik izvrši isplatu, timeline naloga dobija zeleni događaj
8. ako blagajnik ne može da izvrši zbog nedovoljno sredstava, timeline dobija crveni događaj

## Ako postojeći model ne podržava pending ISPLATA

Ako u projektu ne postoji model za pending blagajničku isplatu, Codex ne sme improvizovati veliki novi sistem.

U tom slučaju:

1. dokumentovati da postojeći model ne podržava pending isplatu
2. predložiti minimalan model/polje/status kao poseban sledeći patch
3. u ovom patch-u ne menjati stanje blagajne direktno ako se time krši novo pravilo
4. UI akciju nazvati jasno, npr. **Pošalji blagajni na isplatu**, ako se samo kreira nalog/čekanje

## Prihvatni kriterijum

Nakon ovog taska više ne sme važiti:

```text
Izvrši nalog → direktno promeni stanje blagajne
```

Mora važiti:

```text
Izvrši nalog → kreira/pokreće ISPLATA zapis za blagajnika
```

ili, ako model još ne postoji, Codex mora jasno blokirati ovu promenu i dokumentovati sledeći minimalni patch.

---

# 10. Komandna dugmad na istom mestu

## Problem

Komandna dugmad su na različitim mestima po formama.

Korisnik predlaže da dugmad budu uvek na istom mestu na ekranu.

## Predlog UI pravila

Za forme koje zauzimaju ceo ekran, komande treba držati u sticky footer delu:

```text
form header / info zona
scrollable form body
sticky form footer sa komandama
status linija
```

Footer treba da bude na dnu ekrana, iznad status linije.

## Zahtev

1. Proveriti da li postoji shared full-screen form layout.
2. Ako postoji, dodati sticky footer za komande.
3. Ako ne postoji, primeniti minimalan lokalni obrazac na:
   - Novi zahtev
   - Izmena zahteva
   - Novi nalog
   - Edit naloga ako bude dodat
   - Novi presek stanja ako je u istom layout sistemu
4. Ne raditi kompletan redesign.
5. Ne pomerati komande na način koji lomi mobilni prikaz ako isti kod koristi mobilni UI.
6. Dugmad u footeru moraju koristiti standardni vizuelni identitet iz **NOVI PRESEK STANJA**.

## Prihvatni kriterijum

Na full-screen formama komandna dugmad su konzistentno pozicionirana u donjoj komandnoj zoni i ne nestaju skrolovanjem.

---

# 11. SMENE: skrol samo data zone

## Problem

Na stranici **SMENE** se i dalje skroluje ceo sadržaj.

Ovo nije popravljeno prethodnim patch-om.

## Zahtev

Popraviti layout stranice **SMENE** tako da:

1. header stranice ostaje vidljiv
2. KPI/info zona ostaje vidljiva ako postoji
3. komande ostaju vidljive
4. skroluje se samo lista/tabela/data zona smena
5. detalj smene, ako je dug, ima sopstveni scroll ili kontrolisanu data zonu
6. ne sme se skrolovati ceo ekran tako da korisnik izgubi komande

## Proveriti

1. render funkciju za stranicu Smene
2. CSS klase za Smene
3. da li Smene koriste isti shell kao Knjiga/Zahtevi/Nalozi
4. da li postoji globalni container koji forsira page scroll
5. da li postoje nested scroll problemi

## Prihvatni kriterijum

Na stranici **SMENE** header/komande ne nestaju skrolovanjem. Skroluje se samo data deo.

---

# 12. Ograničenja

1. Minimalan patch.
2. Ne raditi kompletan redesign.
3. Ne uvoditi direktnu isplatu zahteva.
4. Ne menjati model podataka bez potrebe.
5. Ne uvoditi nove statuse bez jasnog razloga.
6. Ne uvoditi nove biblioteke.
7. Ne refaktorisati ceo `scripts.html`.
8. Ne menjati `desktop-v2` osim ako se dokaže da je aktivan UI.
9. Ne tvrditi da je runtime testirano ako nije.
10. Ne sakrivati dugmad bez rešavanja backend toka.
11. Ne menjati stanje blagajne direktno iz supervizorskog odobrenja naloga.
12. Ako pending ISPLATA model ne postoji, ne improvizovati veliki novi model bez dokumentovanja.

---

# 13. Obavezne provere pre izmene

Pre izmene Codex mora proveriti:

1. aktivni UI sloj koji korisnik vidi
2. status mapper-e za naloge
3. status mapper-e za zahteve
4. CSS klasu/stil za **U pripremi**
5. CSS za fokus polja
6. form layout za Novi/Izmena zahtev
7. form layout za Novi/Edit nalog
8. render i backend za DRAFT nalog
9. backend update za DRAFT nalog
10. postojeći tok izvršenja naloga
11. postojeći tok blagajničke isplate
12. postojeći event/timeline model naloga
13. postojeći audit log
14. render stranice Smene
15. status liniju / footer ako postoji

---

# 14. Obavezni test koraci

Codex mora navesti test korake.

## 14.1 Status boja

1. Otvoriti **NOVI PRESEK STANJA - unos apoena**.
2. Pogledati labelu **U pripremi**.
3. Otvoriti nalog u statusu **Čeka na isplati**.
4. Proveriti da status ima isti vizuelni stil.

## 14.2 Fokus polja

1. Otvoriti formu sa više input polja.
2. Prelaziti preko TAB/ENTER.
3. Proveriti da aktivno polje ima svetlu liniju/glow.
4. Proveriti light i dark mod.

## 14.3 Edit DRAFT naloga

1. Kreirati DRAFT nalog.
2. Otvoriti Pregled naloga.
3. Izabrati DRAFT nalog.
4. Kliknuti **Edituj nacrt**.
5. Izmeniti podatke.
6. Sačuvati.
7. Proveriti da nije kreiran duplikat.
8. Proveriti da su lista i detalj ažurirani.

## 14.4 Status labele

1. Proći kroz Zahteve.
2. Proći kroz Naloge.
3. Proći kroz filtere/KPI/tabove.
4. Proveriti da nema mešanja `Draft`, `DRAFT`, `Nacrt`.
5. Proveriti ostale status labele.

## 14.5 Nedovoljno sredstava

1. Pokušati isplatu kada nema dovoljno sredstava.
2. Proveriti da UI prikaže grešku.
3. Proveriti da je događaj upisan u tok naloga.
4. Proveriti da je događaj crveno obeležen.
5. Proveriti da status nije pogrešno promenjen u isplaćen.

## 14.6 Stvarna isplata

1. Kreirati/odobriti nalog.
2. Pokrenuti akciju koja šalje blagajni ISPLATA zapis.
3. Kao blagajnik izvršiti ISPLATA zapis.
4. Proveriti da tek tada stanje blagajne menja vrednost.
5. Proveriti da je timeline naloga zeleno obeležen.

## 14.7 Komandni footer

1. Otvoriti Izmenu zahteva.
2. Proveriti da su komande u donjoj komandnoj zoni.
3. Skrolovati form body.
4. Proveriti da komande ostaju vidljive.
5. Ponoviti za Novi nalog / Edit nalog ako postoji.

## 14.8 Smene

1. Otvoriti stranicu **SMENE**.
2. Skrolovati sadržaj.
3. Proveriti da header i komande ostaju vidljivi.
4. Proveriti da skroluje samo data zona.
5. Proveriti detalj smene ako postoji.

---

# 15. Obavezan izlaz iz Codex-a

Codex mora vratiti:

```text
URAĐENO

[kratak opis]

IZMENJENI FAJLOVI

- ...

ŠTA JE PROMENJENO

1. Status boja Čeka na isplati:
   - ...
2. Fokus polja:
   - ...
3. Edit DRAFT naloga:
   - ...
4. Standardizacija status labela:
   - ...
5. Nedovoljno sredstava / tok naloga:
   - ...
6. Novi workflow Izvrši nalog:
   - ...
7. Sticky footer komandi:
   - ...
8. Smene scroll:
   - ...

ŠTA NIJE MENJANO

- ...

ŠTA NIJE MOGLO BITI ZAVRŠENO

- ...

PROVERE

- ...

TEST KORACI

- ...

RIZICI

- ...
```

Ako Codex ne može da završi novi workflow bez većeg model patch-a, mora to jasno napisati i ne sme lažno tvrditi da je rešeno.

---

# 16. Prihvatni kriterijumi

Zadatak se smatra prihvaćenim samo ako:

1. **Čeka na isplati** ima isti vizuelni stil kao **U pripremi**.
2. Aktivna input polja jasno svetle/fokusirana su.
3. DRAFT nalog ima edit akciju.
4. DRAFT nalog se može izmeniti bez duplikata.
5. Status labele su standardizovane.
6. Nedovoljno sredstava se upisuje u tok naloga kao crveni događaj.
7. Stvarna isplata se upisuje kao zeleni događaj.
8. **Izvrši nalog** ne menja direktno stanje blagajne iz supervizorskog toka.
9. Komandna dugmad full-screen formi su u konzistentnom sticky footeru.
10. Stranica **SMENE** ne skroluje ceo sadržaj.
11. Nema JS grešaka u osnovnom prolasku kroz relevantne ekrane.
