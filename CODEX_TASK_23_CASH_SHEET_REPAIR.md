# CODEX_TASK_23_CASH_SHEET_REPAIR

## Cilj

Popraviti blagajnicki list kao poslovni dokument, ne kao kopiju ekranskog prikaza.

Blagajnicki list mora jasno prikazati:

1. smenu ili dan koji se posmatra,
2. pocetno stanje,
3. redovne uplate,
4. redovne isplate,
5. predaju u trezor,
6. ocekivano zavrsno stanje,
7. zavrsni fizicki popis,
8. visak ili manjak.

## Problem koji se resava

Trenutna matematika moze da duplira stanje jer se u rekapitulaciji istovremeno koriste:

1. pocetno stanje smene iz popisa,
2. korektivni cash event nastao iz istog popisa.

To nije prihvatljivo za blagajnicki list.

## Poslovno pravilo za rekapitulaciju

Za smenski blagajnicki list:

```text
pocetno stanje smene
+ redovne uplate
- redovne isplate
- predaja u trezor
= ocekivano zavrsno stanje

fizicki popis na zatvaranju
- ocekivano zavrsno stanje
= visak / manjak
```

Korekcije preseka, visak i manjak, mogu biti prikazane u listi dogadjaja, ali se ne smeju posebno sabirati u rekapitulaciji da ne bi duplirale pocetno ili zavrsno stanje.

Za dnevni blagajnicki list bez izabrane smene:

1. pocetno stanje je stanje pre prvog dogadjaja u danu,
2. zavrsno stanje je stanje posle poslednjeg dogadjaja u danu,
3. fizicki popis je poslednji popis za taj dan i valutu ako postoji.

## UI pravila

1. Blagajnicki list mora imati cist blok rekapitulacije.
2. Nazivi redova moraju biti poslovni:
   - Pocetno stanje
   - Uplate
   - Isplate
   - Predaja u trezor
   - Ocekivano stanje
   - Zavrsni popis
   - Razlika
3. Korekcije preseka ne treba isticati kao posebne redove u rekapitulaciji.
4. Dogadjaji u tabeli mogu prikazati preseke i korekcije kao informativne stavke.
5. Stampanje/PDF mora koristiti podatke iz dokumenta, ne screenshot.

## Implementacioni koraci

1. Popraviti `getCashSheetReport`.
2. Za smenu koristiti `opening_balance_json` kao pocetno stanje.
3. Iz ukupnih uplata/isplata izbaciti:
   - `CASH_COUNT`,
   - korekcije nastale iz preseka,
   - reversal ako nije redovan blagajnicki promet.
4. Predaju u trezor prikazati posebno.
5. Zavrsni popis uzeti iz poslednjeg `SHIFT_CLOSING` za smenu i valutu, ako postoji.
6. Ako nema `SHIFT_CLOSING`, uzeti poslednji popis u smeni i valuti kao informativni fizicki popis.
7. Izracunati `expected_closing_balance`.
8. Izracunati `difference = physical_total - expected_closing_balance`.
9. U UI koristiti `expected_closing_balance` kao obracunsko stanje.
10. Sacuvati postojece dugme i tabelu dogadjaja.

## Kontrola resenja

1. `node --check` za `scripts.html`.
2. `git diff --check`.
3. `clasp push --force`.
4. Deploy na postojeci deployment.
5. Rucno proveriti:
   - smena otvorena sa 5.000 RSD bez dodatnog prometa,
   - blagajnicki list pokazuje pocetak 5.000, ocekivano 5.000,
   - ako je zatvaranje 70.000, razlika je 65.000,
   - korekcija preseka se ne sabira duplo u rekapitulaciji.
