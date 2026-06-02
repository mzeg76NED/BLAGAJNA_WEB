# CODEX_TASK_22_CASH_COUNT_AND_SHIFT_REPAIR

## Cilj

Popraviti prikaz i tok rada za popis apoena, presek stanja, otvaranje smene i zatvaranje smene bez menjanja delova blagajnicke knjige koji rade.

Glavni cilj je da se isti posao, popis apoena po valutama, uvek radi kroz istu UI formu i isti JavaScript submit tok.

## Obuhvat

Uraditi samo sledece:

1. Presek stanja desktop prikaz.
2. Dijalog za otvaranje smene.
3. Dijalog za zatvaranje smene.
4. Prikaz istorije preseka i detalja preseka.
5. Osvezavanje blagajnicke knjige nakon otvaranja i zatvaranja smene.
6. Smanjenje nepotrebnih UI poziva nakon otvaranja/zatvaranja smene.

Ne raditi:

1. Ne menjati poslovna pravila zahteva i naloga.
2. Ne menjati direktne uplate/isplate osim refresh-a nakon smene.
3. Ne menjati Google Sheets strukturu.
4. Ne uvoditi novi framework.

## Poslovna pravila

1. Otvaranje smene je presek stanja tipa `SHIFT_OPENING`.
2. Kontrolni presek je presek stanja tipa `CASHBOX_COUNT`.
3. Zatvaranje smene je presek stanja tipa `SHIFT_CLOSING`.
4. Sva tri toka koriste istu logiku unosa apoena: valuta, apoen, komada, upisi.
5. Sva tri toka moraju dozvoliti popisano stanje nula.
6. Presek prikazuje sve valute koje su sacuvane u istom batch-u.
7. Posle otvaranja i zatvaranja smene, blagajnicka knjiga mora prikazati odgovarajuci dogadjaj korekcije ako postoji razlika.
8. Ako nema razlike, u blagajnickoj knjizi nema korektivnog cash event-a jer nema promene stanja, ali presek mora biti vidljiv u istoriji preseka.

## UI pravila

1. Na strani `Presek stanja` ukloniti zutu/braon nijansu iz redova istorije preseka.
2. Tabeli istorije preseka dati vise vidljivih redova.
3. Desktop presek treba da koristi vertikalno podeljen ekran: istorija preseka levo, detalji izabranog preseka desno.
4. Detalji preseka ne smeju biti centrirane kartice. Moraju biti tabele:
   - osnovni podaci,
   - rekapitulacija po valutama,
   - popisani apoeni.
5. Detalji preseka moraju prikazati sve valute iz batch-a, ne samo trenutno izabranu valutu.
6. Dugme `Upisi` u formi za apoene ne sme da visi; mora biti u istoj visini sa poljima `Apoen` i `Komada`.
7. Forma za unos apoena mora biti ista u:
   - otvaranju smene,
   - zatvaranju smene,
   - kontrolnom preseku.

## Implementacioni koraci

1. Napraviti helper koji generise isti HTML za formu popisa apoena:
   - hidden `cashbox_id`,
   - hidden `shift_id` kada treba,
   - hidden `count_type`,
   - select `currency`,
   - `cash-count-entry-area`,
   - textarea za napomenu sa podesivim imenom (`opening_note` ili `note`),
   - total,
   - akcije.
2. Prebaciti `openShiftOpeningDialog_` i `openShiftClosingDialog_` da koriste taj helper.
3. Zadrzati postojece inline forme samo ako su skrivene, ali ih ne koristiti kao glavni workflow.
4. Srediti CSS za `count-entry-form` i dijaloge tako da polja i dugme budu poravnati.
5. Preurediti desktop `Presek stanja` sekciju u grid: istorija levo, detalji desno.
6. Ukloniti `row-count` zutu nijansu sa istorije preseka.
7. Povecati `max-height` tabele istorije preseka.
8. Posle otvaranja smene pozvati osvezavanje:
   - aktivne smene,
   - filtera smena,
   - blagajnicke knjige,
   - stanja blagajne,
   - istorije preseka.
9. Posle zatvaranja smene pozvati isti minimum osvezavanja.
10. Izbeci duplirane teze pozive kad nisu potrebni.

## Kontrola resenja

Obavezno proveriti:

1. `node --check` nad izvucenim `scripts.html`.
2. `git diff --check`.
3. `clasp push --force`.
4. Novi Apps Script version i deploy na postojeci deployment.
5. U UI:
   - verzija na frontu je nova,
   - Presek stanja bez aktivne smene prikazuje poruku i istoriju, ne formu,
   - Presek stanja sa aktivnom smenom prikazuje formu,
   - dugme `Upisi` je poravnato,
   - istorija preseka ima vise redova,
   - detalji preseka prikazuju sve valute,
   - otvaranje smene osvezi blagajnicku knjigu,
   - zatvaranje smene osvezi blagajnicku knjigu.

## Napomena

Ako neki dogadjaj otvaranja ili zatvaranja smene nema razliku, ne postoji korektivni `CASH_EVENT`, pa se ne prikazuje kao stavka u blagajnickoj knjizi. To je ispravno za event-based balance model. Sam presek se ipak vidi u istoriji preseka.
