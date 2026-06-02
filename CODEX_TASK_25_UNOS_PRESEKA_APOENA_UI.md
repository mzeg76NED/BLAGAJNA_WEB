# CODEX TASK 25: UI unos preseka apoena

## Cilj

Implementirati novu formu **Novi presek stanja - unos apoena** prema fajlu `CODEX_UI_Unos_Preseka_Apoena.md` i slici `UNOS PRESEKA (2).png`.

## Stroga granica

Ne menjati postojeći ekran **Presek stanja** iz taska 24:

- ne menjati KPI traku,
- ne menjati tabelu/listu preseka,
- ne menjati desni panel detalja,
- ne menjati tabove Pregled / Valute / Apoeni / Zapisnik.

Menja se samo forma za unos apoena koja se otvara iz:

- novog kontrolnog preseka,
- otvaranja smene,
- zatvaranja smene.

## Funkcionalni zahtevi

1. Forma mora imati dark dashboard izgled.
2. Mora prikazati naslov, podnaslov, KPI kartice, unosni blok, tabelu redova, desni panel, poslednje unose i akcije.
3. Valute moraju imati slikovne oznake:
   - RSD: zastava Srbije,
   - EUR: zastava EU,
   - ČEK/CEK: oznaka za ček.
4. ENTER navigacija:
   - Valuta -> Apoen,
   - Apoen -> Količina,
   - Količina -> dodaj red i fokus na Apoen.
5. TAB ostaje standardno kretanje.
6. ESC čisti aktivno polje ili traži potvrdu za izlaz.
7. F5 čuva/proknjižava presek kroz postojeći API.
8. F9 čuva lokalni nacrt forme bez promene poslovnog modela.
9. Dupli red `valuta + apoen` uvećava postojeću količinu.
10. Red može da se izmeni i obriše.
11. Totali po valutama i poslednji unosi se osvežavaju uživo.

## Kontrola rešenja

Pre deploy-a proveriti:

1. `node --check` za `scripts.html`.
2. `git diff --check`.
3. Dugme `Novi presek` otvara novu formu.
4. Otvaranje smene koristi istu formu.
5. Zatvaranje smene koristi istu formu.
6. Prethodni ekran Presek stanja ostaje netaknut.

