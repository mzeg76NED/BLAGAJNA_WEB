# CODEX TASK 26 - Blagajnicka knjiga final UI

## Cilj

Implementirati finalni desktop UI za stranicu Blagajnicka knjiga prema dokumentu `CODEX_UI_Blagajnicka_Knjiga_Final.md`, uz obavezno ocuvanje postojece poslovne logike.

## Granice zadatka

- Menja se samo vizuelni i UX sloj stranice Blagajnicka knjiga.
- Ne menjaju se backend funkcije, API pozivi, model podataka, Google Sheets struktura ni pravila knjizenja.
- Stranica Presek stanja, koja je prethodno prihvacena, ne sme se vizuelno menjati.
- Postojeci ID-jevi i handleri za ucitavanje, filtre, selekciju reda, detalje, blagajnicki list, presek i storno moraju ostati povezani.

## Koraci implementacije

1. Zadrzati postojece kontrole za period, korisnika, smenu, osvezavanje i dodati vizuelno uklopljenu pretragu.
2. Uvesti KPI kartice: pocetno stanje, ukupne uplate, ukupne isplate, neto promena i zavrsno stanje.
3. Preoblikovati tabelu u finalni tamni prikaz sa grupisanjem po datumu, timeline markerima, selekcijom i jasnim iznosima.
4. Uvesti stalni desni panel: brze akcije, detalji stavke, istorija stanja, donja akcijska dugmad.
5. Brze akcije povezati sa postojecim tokom uplate, isplate i trezora. Kada nema aktivne smene, dugmad ostaju vidljiva ali zakljucana.
6. Detalje stavke renderovati kroz postojeci `openDetailPanel_`, bez promene poslovne logike storna i stampe.
7. Sacuvati optimisticki prikaz i postojece osvezavanje podataka.
8. Povecati verziju aplikacije.

## Kontrola resenja

- Stranica se ucitava bez JavaScript greske.
- Filteri po datumu, korisniku i smeni rade.
- Pretraga filtrira opis, primaoca, korisnika i ID.
- Klik na red otvara detalje.
- Blagajnicki list, presek blagajne i storno ostaju povezani.
- Brze akcije su zakljucane bez aktivne smene i aktivne samo za glavnog blagajnika aktivne smene.
- KPI kartice koriste iste podatke kao tabela.
- Mobilni prikaz nije menjan i ne sme biti pokvaren.
