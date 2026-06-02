# CODEX_TASK_24_PRESEK_STANJA_UI_PREDLOG_3

## Cilj

Implementirati novi UI za stranicu `Presek stanja` po prilozenom dizajnu `PRESEK STANJA (3).png` i instrukcijama iz `CODEX_UI_Presek_Stanja_Predlog_3.md`.

## Pravilo

Ne menjati poslovnu logiku preseka. Postojeci API `apiGetCashCountsReport` ostaje izvor podataka. Menja se UI organizacija, mapiranje podataka i interakcija.

## Obavezni elementi

1. KPI traka na vrhu:
   - ukupno preseka,
   - ocekivano ukupno po valutama,
   - popisano ukupno po valutama,
   - razlika ukupno po valutama,
   - proknjizeno,
   - u obradi,
   - dugme `+ Novi presek`.
2. Levi panel:
   - naslov `Preseci stanja`,
   - period filter,
   - pretraga,
   - filter vrste,
   - filter statusa,
   - filter valute,
   - tabela preseka,
   - selektovan red,
   - paginacija.
3. Desni panel:
   - naslov `Detalji preseka`,
   - status badge,
   - `Akcije`,
   - osnovni info blokovi,
   - tabovi `Pregled`, `Valute`, `Apoeni`, `Zapisnik`.
4. Tab `Apoeni`:
   - svaka valuta kao poseban blok,
   - tabela apoena,
   - subtotal po valuti,
   - ukupan red za sve valute,
   - toggle `Prikaži samo razlike`.
5. Mobilni prikaz:
   - bez siroke desktop tabele,
   - kartice preseka,
   - detalji kroz isti renderer kada je moguce.

## Kontrola

1. `node --check` nad `scripts.html`.
2. `git diff --check`.
3. `clasp push --force`.
4. Deploy na postojeci deployment.
5. Rucno proveriti:
   - KPI traka postoji,
   - red se selektuje,
   - desni panel menja tabove,
   - tab `Apoeni` prikazuje sve valute,
   - `+ Novi presek` otvara postojecu formu preseka,
   - nema horizontalnog scroll-a na desktop tabeli.
