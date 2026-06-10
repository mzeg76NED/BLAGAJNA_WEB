# ZADATAK ZA CODEX: Pending ISPLATA za odobreni nalog za isplatu

## Naziv zadatka

`2026-06-10_pending-isplata-za-nalog`

## Tip zadatka

Workflow patch.

Cilj je uvesti minimalan i kontrolisan tok u kome se odobreni **NALOG ZA ISPLATU** šalje blagajni kao čekajuća **ISPLATA**, a blagajnik zatim izvršava stvarnu blagajničku isplatu.

---

# 1. Kontekst

U prethodnom patch-u je zaustavljeno da pregled naloga direktno poziva `apiExecutePaymentOrder()` iz supervizorskog toka.

Međutim, kompletan novi workflow još nije uveden.

Trenutno stanje:

1. Supervizor može odobriti nalog.
2. Akcija iz pregleda naloga više ne treba direktno da knjiži isplatu.
3. Backend legacy funkcija `executePaymentOrder()` i dalje postoji.
4. Nema potpuno uveden pending **ISPLATA** zapis koji blagajnik vidi i izvršava.
5. Potrebno je da odobreni nalog, kada se pošalje na isplatu, postane vidljiv blagajni.
6. Blagajna mora moći da ga isplati kroz blagajnički tok.

Pre rada obavezno primeniti:

```text
docs/CODEX_SYSTEM_RULES.md
```

Ako postoji konflikt između prethodnih taskova i ovog taska, ovaj task ima prednost za tok izvršenja naloga.

---

# 2. Poslovno pravilo

Supervizor odobrava nalog.

Supervizor ne isplaćuje novac.

Blagajnik izvršava stvarnu isplatu.

Ispravan tok mora biti:

```text
1. Nalog za isplatu je kreiran.
2. Supervizor odobrava nalog.
3. Odobren nalog dobija status da čeka slanje ili je spreman za isplatu.
4. Korisnik klikne akciju: Pošalji blagajni na isplatu.
5. Sistem kreira pending ISPLATA zapis povezan sa nalogom.
6. Pending ISPLATA je vidljiva na blagajni.
7. Blagajnik otvara pending ISPLATA zapis.
8. Blagajnik izvršava isplatu.
9. Tek tada se menja stanje blagajne.
10. Tek tada se kreira/knjiži stvarni CASH_OUTFLOW.
11. Nalog dobija status isplaćen ili zatvoren u skladu sa postojećim modelom.
12. Timeline/tok naloga dobija zeleni događaj stvarne isplate.
```

Zabranjen tok:

```text
Supervizor klikne Izvrši nalog
→ stanje blagajne se odmah promeni
```

---

# 3. Cilj zadatka

Dodati opciju da se odobreni nalog koji je poslat na isplatu:

1. vidi na blagajni
2. može otvoriti na blagajni
3. može izvršiti samo kroz blagajnički tok
4. bude povezan sa originalnim nalogom
5. upiše isplatu u stanje blagajne tek kada blagajnik potvrdi isplatu
6. upiše događaje u tok naloga
7. prikaže grešku u toku naloga ako nema dovoljno sredstava

---

# 4. Terminologija u UI-ju

Koristiti jasne poslovne nazive.

## Na pregledu naloga

Umesto nejasnog:

```text
Izvrši nalog
```

za supervizorski tok koristiti:

```text
Pošalji blagajni na isplatu
```

ili, ako postojeći UI standard zahteva kraće:

```text
Pošalji na isplatu
```

Ova akcija ne sme direktno menjati stanje blagajne.

## Na blagajni

Pending isplatu prikazati kao:

```text
Čeka isplatu
```

ili:

```text
Isplata po nalogu
```

Akcija blagajnika treba da bude:

```text
Izvrši isplatu
```

ili postojeći standard za blagajničku isplatu, ako postoji.

---

# 5. Statusi

Ne uvoditi nove statuse ako postojeći mogu jasno da pokriju tok.

Prvo proveriti postojeće statuse naloga.

Moguće postojeće stanje:

| Interni status | UI labela |
|---|---|
| `DRAFT` | `Nacrt` |
| `ISSUED` | `Odobren` ili `Izdat` |
| `WAITING_PAYMENT` | `Čeka na isplati` |
| `PARTIALLY_PAID` | `Delimično isplaćen` |
| `PAID` | `Isplaćen` |
| `CLOSED` | `Zatvoren` |
| `CANCELLED` | `Otkazan` |

Ako status `WAITING_PAYMENT` već znači "čeka blagajnu", koristiti ga.

Ako postoji potreba da se razlikuje "odobren, ali još nije poslat blagajni" od "poslat blagajni", proveriti postojeći model pre uvođenja novog statusa.

Ne uvoditi novi status bez jasnog razloga.

Ako mora da se uvede novi status, dokumentovati:

1. naziv statusa
2. gde se koristi
3. koje akcije dozvoljava
4. kako se prikazuje u UI-ju
5. kako utiče na filtere/KPI

---

# 6. Backend: pending ISPLATA zapis

## Cilj

Uvesti minimalan backend tok koji kreira pending **ISPLATA** zapis iz odobrenog naloga.

## Pre izmene proveriti

Pronaći postojeći model za:

1. blagajničke događaje
2. uplate
3. isplate
4. `CASH_OUTFLOW`
5. direktnu isplatu iz Knjige
6. pending akcije ako postoje
7. tok naloga / timeline
8. audit log
9. vezu između naloga i cash event-a

Tražiti postojeće funkcije i fajlove, posebno:

```text
src/PaymentOrders.gs
src/CashEvents.gs
src/WebApp.gs
src/html/scripts.html
src/html/desktop.html
src/html/styles.html
```

Mogući nazivi funkcija koje treba proveriti:

```text
executePaymentOrder
apiExecutePaymentOrder
createCashEvent
createCashOutflow
apiCreateCashOutflow
apiCreateCashEvent
listCashEvents
apiListCashEvents
```

## Zahtev

Dodati minimalan tok:

```text
sendPaymentOrderToCashier(orderId)
apiSendPaymentOrderToCashier(orderId)
```

ili koristiti postojeći naming standard projekta.

Funkcija mora:

1. pronaći nalog
2. proveriti da status dozvoljava slanje na isplatu
3. proveriti da nalog nije već poslat blagajni
4. kreirati pending ISPLATA zapis ili postojeći ekvivalent u blagajničkom toku
5. povezati pending ISPLATA zapis sa nalogom
6. upisati događaj u tok naloga:
   - `Poslato blagajni na isplatu`
7. promeniti status naloga u odgovarajući status ako postojeći model to predviđa, npr. `WAITING_PAYMENT`
8. vratiti ažuriran nalog ili rezultat koji frontend može da osveži

## Važno

Ova funkcija ne sme:

1. menjati stanje blagajne
2. kreirati završni `CASH_OUTFLOW` kao stvarno izvršenu isplatu
3. označiti nalog kao `PAID`
4. zatvoriti nalog
5. simulirati isplatu

---

# 7. Blagajna: prikaz čekajućih isplata

## Cilj

Na blagajni mora biti vidljivo da postoji nalog koji čeka isplatu.

## Zahtev

U postojećem blagajničkom UI-ju, najverovatnije tab **Knjiga** ili deo za brze akcije/čekanja, dodati prikaz pending isplata po nalozima.

Ne praviti novi veliki ekran ako nije potreban.

Minimalno prihvatljivo:

1. U tabu **Knjiga** prikazati sekciju:
   - `Čeka isplatu`
   - ili `Nalozi za isplatu`
2. Sekcija prikazuje pending ISPLATA zapise povezane sa nalozima.
3. Svaki red prikazuje:
   - broj naloga
   - datum
   - primalac
   - svrha
   - iznos
   - valuta
   - status
   - vezu ka nalogu ako postoji
   - akciju `Izvrši isplatu`
4. Prikaz je dostupan blagajniku ili korisniku sa rolom koja može da radi isplatu.
5. Ako nema aktivne smene, akcija `Izvrši isplatu` mora biti disabled ili nedostupna.
6. Ako nema pending isplata, prikazati prazno stanje.

## Ne sme

1. prikazivati dugme za isplatu supervizoru kao direktnu isplatu
2. omogućiti isplatu bez aktivne smene ako postojeći sistem zahteva aktivnu smenu
3. menjati stanje blagajne bez potvrde blagajnika

---

# 8. Blagajnik: izvršenje pending isplate

## Cilj

Blagajnik mora moći da izvrši pending ISPLATA zapis.

## Zahtev

Dodati ili povezati funkciju:

```text
executePendingPaymentOrderOutflow(pendingPaymentId)
```

ili koristiti postojeći naming standard.

Funkcija mora:

1. pronaći pending ISPLATA zapis
2. pronaći povezani nalog
3. proveriti da postoji aktivna smena
4. proveriti da korisnik ima pravo na isplatu ako role postoje
5. proveriti raspoloživo stanje
6. ako nema dovoljno sredstava:
   - ne menjati stanje blagajne
   - ne označiti nalog kao isplaćen
   - upisati crveni događaj u tok naloga
   - vratiti jasnu grešku korisniku
7. ako ima dovoljno sredstava:
   - kreirati/knjižiti stvarni `CASH_OUTFLOW`
   - promeniti stanje blagajne kroz postojeći blagajnički mehanizam
   - povezati cash event sa nalogom
   - označiti pending ISPLATA zapis kao izvršen
   - ažurirati status naloga na `PAID` ili odgovarajući postojeći status
   - upisati zeleni događaj u tok naloga
   - osvežiti UI liste i detalje

## Važno

Koristiti postojeći mehanizam knjiženja blagajne.

Ne praviti paralelni sistem stanja blagajne.

Ako postoji `executePaymentOrder()` koji već radi stvarnu blagajničku isplatu, može se refaktorisati minimalno tako da se koristi samo iz blagajničkog pending toka, ali ne iz supervizorskog pregleda naloga.

---

# 9. Timeline / tok naloga

## Zahtev

Tok naloga mora jasno prikazati:

1. nalog kreiran
2. nalog odobren
3. nalog poslat blagajni na isplatu
4. pokušaj isplate neuspešan zbog nedovoljno sredstava, crveno
5. isplata izvršena, zeleno
6. odbijanje/otkazivanje, crveno
7. druge postojeće događaje bez narušavanja

## Vizuelno

1. Uspešna stvarna isplata: zeleno
2. Neuspešna isplata zbog nedovoljno sredstava: crveno
3. Slanje blagajni: neutralno ili amber
4. Čeka na isplati: amber kao `U pripremi`

Ako postoje postojeće klase za timeline success/error/warning, koristiti njih.

Ne uvoditi novi vizuelni sistem bez potrebe.

---

# 10. Frontend: pregled naloga

## Zahtev

U detalju naloga:

1. Ako je nalog odobren i spreman za slanje blagajni, prikazati:
   - `Pošalji blagajni na isplatu`
2. Ta akcija poziva backend funkciju za kreiranje pending ISPLATA zapisa.
3. Nakon uspeha:
   - osvežiti listu naloga
   - osvežiti detalj naloga
   - prikazati informaciju da nalog čeka blagajnika
4. Ako je nalog već poslat blagajni:
   - ne prikazivati ponovo dugme za slanje
   - prikazati status `Čeka na isplati`
5. Ne prikazivati direktno dugme `Izvrši nalog` u supervizorskom toku ako ono menja stanje blagajne.

---

# 11. Frontend: blagajna / Knjiga

## Zahtev

Na blagajničkom delu, najverovatnije tab **Knjiga**, dodati ili povezati listu pending isplata.

Minimalan UI:

```text
Čeka isplatu

[broj naloga] [primalac] [svrha] [iznos] [valuta] [status] [Izvrši isplatu]
```

Akcija `Izvrši isplatu`:

1. dostupna samo kada postoji aktivna smena
2. poziva backend funkciju za izvršenje pending isplate
3. prikazuje grešku ako nema sredstava
4. osvežava:
   - pending listu
   - blagajničku knjigu
   - stanje smene ako se prikazuje
   - detalj naloga ako je otvoren ili se vrati na njega

Ako nema aktivne smene:

1. dugme je disabled
2. prikazuje se poruka da je potrebno otvoriti smenu

---

# 12. Povezivanje podataka

Pending ISPLATA mora imati vezu sa nalogom.

Koristiti postojeći model povezivanja ako postoji.

Minimalna potrebna veza:

1. `payment_order_id`
2. broj naloga
3. primalac
4. iznos
5. valuta
6. svrha
7. status pending isplate
8. kreirao/poslao
9. vreme slanja
10. izvršio blagajnik
11. vreme izvršenja
12. povezani `cash_event_id` ili ekvivalent ako postoji

Ako postoje postojeća polja drugačijeg naziva, koristiti postojeće nazive.

Ne uvoditi duple nazive bez potrebe.

---

# 13. Ograničenja

1. Minimalan patch.
2. Ne praviti veliki novi modul ako postojeći model blagajničkih događaja može da se iskoristi.
3. Ne menjati poslovni tok zahteva za isplatu.
4. Ne uvoditi direktnu isplatu zahteva.
5. Ne dozvoliti supervizoru da direktno knjiži isplatu iz pregleda naloga.
6. Ne menjati stanje blagajne pre potvrde blagajnika.
7. Ne kreirati `CASH_OUTFLOW` pri slanju naloga blagajni.
8. Ne označiti nalog kao `PAID` pre stvarne isplate.
9. Ne uvoditi nove statuse ako postojeći pokrivaju tok.
10. Ako uvodiš novi pending status, dokumentuj ga.
11. Ne dirati `desktop-v2` osim ako je dokazano aktivan.
12. Ne refaktorisati ceo `scripts.html`.
13. Ne tvrditi da je runtime testirano ako nije.
14. Ne završiti zadatak bez deploy-a i git push-a, osim ako postoji blokirajuća greška.

---

# 14. Obavezne provere pre izmene

Pre izmene Codex mora proveriti:

1. postojeći model naloga za isplatu
2. postojeći model cash event-a / blagajničke knjige
3. postojeći tok direktne isplate iz Knjige
4. postojeću funkciju `executePaymentOrder()`
5. da li postoji pending cash action model
6. postojeće statuse naloga
7. postojeći timeline/event log naloga
8. postojeće role korisnika
9. postojeći prikaz taba Knjiga
10. postojeći prikaz brzih akcija
11. postojeći deploy/UI sloj
12. postojeće smoke testove

---

# 15. Dokumentacija

Ažurirati dokumentaciju naloga za isplatu, najverovatnije:

```text
docs/05_PAYMENT_ORDERS.md
```

Dodati jasno:

1. ko odobrava nalog
2. ko šalje nalog blagajni
3. šta znači `Čeka na isplati`
4. ko stvarno izvršava isplatu
5. kada nastaje `CASH_OUTFLOW`
6. šta se dešava kada nema dovoljno sredstava
7. kako se događaj upisuje u tok naloga
8. koji statusi se koriste

---

# 16. Test koraci

Codex mora navesti i, ako može, pripremiti smoke testove.

## 16.1 Slanje naloga blagajni

1. Kreirati DRAFT nalog.
2. Odobriti nalog.
3. Kliknuti `Pošalji blagajni na isplatu`.
4. Proveriti da stanje blagajne nije promenjeno.
5. Proveriti da nije kreiran završni `CASH_OUTFLOW`.
6. Proveriti da je kreiran pending ISPLATA zapis.
7. Proveriti da nalog ima događaj `Poslato blagajni na isplatu`.
8. Proveriti da nalog ima status `Čeka na isplati` ili odgovarajući postojeći status.

## 16.2 Vidljivost na blagajni

1. Otvoriti tab **Knjiga** kao blagajnik.
2. Proveriti da se vidi pending ISPLATA po nalogu.
3. Proveriti da red prikazuje broj naloga, primaoca, iznos, valutu i svrhu.
4. Ako nema aktivne smene, proveriti da je `Izvrši isplatu` disabled.
5. Otvoriti smenu.
6. Proveriti da `Izvrši isplatu` postaje dostupno.

## 16.3 Izvršenje isplate

1. Kliknuti `Izvrši isplatu`.
2. Proveriti da se stanje blagajne menja tek sada.
3. Proveriti da se kreira/knjiži `CASH_OUTFLOW`.
4. Proveriti da pending ISPLATA više nije otvorena.
5. Proveriti da nalog dobija status `Isplaćen` ili odgovarajući postojeći status.
6. Proveriti da timeline naloga ima zeleni događaj.

## 16.4 Nedovoljno sredstava

1. Kreirati nalog sa iznosom većim od raspoloživih sredstava.
2. Poslati nalog blagajni.
3. Pokušati `Izvrši isplatu`.
4. Proveriti da stanje blagajne nije promenjeno.
5. Proveriti da nalog nije označen kao isplaćen.
6. Proveriti da je u timeline naloga upisan crveni događaj.
7. Proveriti da UI prikazuje jasnu grešku.

## 16.5 Regresija

1. Proveriti da zahtev za isplatu i dalje ne pravi direktno `CASH_OUTFLOW`.
2. Proveriti da odobrenje zahteva kreira/povezuje nalog.
3. Proveriti da pregled naloga i dalje sortira najnovije na vrhu.
4. Proveriti da DRAFT nalog i dalje može da se edituje.
5. Proveriti browser konzolu.
6. Proveriti server/audit log ako postoji.

---

# 17. Obavezno na kraju: provere, deploy i git push

Nakon izmene obavezno uraditi:

## 17.1 Sintaksne provere

1. Proveriti `.gs` fajlove.
2. Proveriti `scripts.html`.
3. Proveriti da nema očiglednih JS grešaka.
4. Ako postoje smoke testovi koji mogu lokalno da se pokrenu, pokrenuti ih.
5. Ako smoke testovi zahtevaju Apps Script runtime i Sheet bazu, jasno napisati da nisu pokrenuti.

## 17.2 Apps Script

Obavezno uraditi:

```bash
clasp push
clasp version
clasp deploy
```

Ako projekat koristi opis verzije, koristiti opis:

```text
v2.0.25-pilot-pending-isplata
```

ili sledeći postojeći format verzionisanja.

## 17.3 Git

Obavezno uraditi:

```bash
git status
git add ...
git commit -m "Add pending cashier payment flow for payment orders"
git push origin main
```

## 17.4 Završni izveštaj

U završnom odgovoru obavezno navesti:

1. izmenjene fajlove
2. šta je promenjeno
3. šta nije menjano
4. da li je uveden pending ISPLATA model ili iskorišćen postojeći
5. koje backend funkcije su dodate/promenjene
6. koje frontend akcije su dodate/promenjene
7. kada se menja stanje blagajne
8. kada nastaje `CASH_OUTFLOW`
9. rezultat sintaksnih provera
10. broj Apps Script verzije
11. deployment ID i opis
12. git commit hash
13. potvrdu da je push uspešan
14. šta nije runtime testirano
15. rizike

---

# 18. Prihvatni kriterijumi

Zadatak se smatra prihvaćenim samo ako:

1. Odobren nalog može da se pošalje blagajni na isplatu.
2. Slanje blagajni ne menja stanje blagajne.
3. Slanje blagajni ne kreira završni `CASH_OUTFLOW`.
4. Pending ISPLATA je vidljiva blagajni.
5. Blagajna može da izvrši pending ISPLATA zapis.
6. Stanje blagajne se menja tek kada blagajnik izvrši isplatu.
7. `CASH_OUTFLOW` nastaje tek kada blagajnik izvrši isplatu.
8. Nalog i pending ISPLATA su povezani.
9. Timeline naloga prikazuje slanje blagajni.
10. Timeline naloga prikazuje uspešnu isplatu zeleno.
11. Timeline naloga prikazuje neuspeh zbog nedovoljno sredstava crveno.
12. Ako nema aktivne smene, blagajnik ne može izvršiti isplatu.
13. Deploy i git push su urađeni.
