# Backup and Export Procedure

## Zašto je backup potreban

Backup omogućava vraćanje podataka i proveru istorije ako dođe do greške u pilotu, pogrešne konfiguracije ili neuspešnog deploy-a.

Pre svake veće izmene aplikacije ili strukture baze mora postojati sveža kopija Google Sheet baze.

## Kada je backup obavezan

1. Pre početka pilota.
2. Na kraju svakog pilot dana.
3. Pre izmene koda.
4. Pre izmene strukture sheetova.
5. Pre masovnog unosa korisnika, blagajni ili valuta.
6. Pre prelaska iz pilota u produkciju.

## Kako napraviti kopiju baze

1. Korisnik mora imati rolu `ADMIN` ili `FINANCE`.
2. Pokrenuti `createDatabaseBackupCopy()`.
3. Sačuvati vraćeni URL.
4. Proveriti da backup fajl postoji u Drive folderu.

## Kako eksportovati CSV

Za jedan sheet:

```text
exportSheetAsCsv('CASH_EVENTS')
```

Za sve osnovne sheetove:

```text
exportAllCoreSheetsAsCsv()
```

Ako je baza velika, preporuka je eksport po pojedinačnom sheetu.

## Kako proveriti backup

1. Otvoriti backup URL.
2. Proveriti da postoje svi ključni sheetovi.
3. Proveriti da prvi red sadrži headere.
4. Uporediti broj redova u glavnim tabelama.
5. Proveriti datum i vreme u nazivu backup fajla.

## Gde se čuva backup

Backup se čuva u folderu `BLAGAJNA_WEB_BACKUPS`, u istom Drive roditeljskom folderu kao Google Sheet baza, osim ako je drugačije podešen `BACKUP_ROOT_FOLDER_ID`.

## Odgovornost

Za backup je odgovoran administrator pilot okruženja ili finansije.

Minimalno pravilo:

1. `ADMIN` pravi backup pre tehničkih promena.
2. `FINANCE` proverava dnevni backup tokom pilota.
3. Linkovi backup fajlova čuvaju se u internom pilot zapisniku.
