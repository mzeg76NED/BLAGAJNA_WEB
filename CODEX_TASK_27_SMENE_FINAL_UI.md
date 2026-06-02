# CODEX TASK 27 - Smene final UI

## Cilj

Redizajnirati desktop stranicu Smene prema dokumentu `CODEX_UI_Smene_Final.md`, u istom vizuelnom sistemu kao Blagajnicka knjiga, Presek stanja i Unos preseka.

## Granice

- Ne menjati poslovnu logiku smena.
- Ne menjati backend API, validacije, prava korisnika ili model podataka.
- Zadrzati postojece tokove: otvaranje smene, novi presek, zatvaranje smene, pregled knjige i blagajnickog lista.
- Podatke po valutama prikazivati iz dostupnih JSON polja smene i iz read-only izvestaja `apiGetCashMovementsReport`.
- Ako API ne vrati breakdown, prikazati dostupno i ostaviti TODO komentar u korisnickom prikazu.

## Koraci

1. Prepakovati `d-section-smena` u novi finalni layout: header, KPI kartice, pregled smena, detalji smene.
2. Ostaviti postojece forme za otvaranje/zatvaranje smene skrivene i koristiti postojece dijaloge.
3. Redizajnirati `renderShiftTable_` i `renderShiftDetail_` za novi prikaz.
4. U detaljima smene ucitati stavke iz `apiGetCashMovementsReport` za izabranu smenu i prikazati timeline, promet i pregled unosa.
5. Zakljucati Novi presek i Zatvori smenu kada nema aktivne smene ili kada izabrana smena nije aktivna.
6. Podici verziju aplikacije.

## Provera

- Ucitavanje stranice Smene bez JS greske.
- Otvori smenu koristi postojeci dijalog.
- Novi presek koristi postojeci tok preseka.
- Zatvori smenu koristi postojeci dijalog zatvaranja.
- Lista smena se ucitava i klik na red menja detalje.
- Prikaz valuta koristi dostupne podatke bez izmisljanja vrednosti.
- Blagajnicka knjiga, Presek stanja i Unos preseka ostaju netaknuti.
