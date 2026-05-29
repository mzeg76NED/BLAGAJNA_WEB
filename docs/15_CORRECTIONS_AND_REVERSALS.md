# Corrections and Reversals

Ovaj dokument opisuje kontrolisano ispravljanje gresaka na knjizenim blagajnickim dogadjajima.

Knjižen blagajnički događaj se ne ispravlja direktnom izmenom iznosa. Greška se ispravlja storno događajem ili korektivnim događajem, tako da ostaje jasan trag šta je prvobitno urađeno i kako je ispravljeno.

## Zasto je direktna izmena zabranjena

Knjizeni cash event predstavlja poslovni trag o stvarnom kretanju novca. Ako se iznos, valuta, blagajna ili smer menjaju direktno posle knjizenja, sistem gubi dokaz sta je prvobitno uradjeno.

Zato se `POSTED`, `LOCKED` i `REVERSED` dogadjaji ne ispravljaju direktnim menjanjem poslovnih polja. Ispravka se radi novim dogadjajem.

## Reversal i correction

`REVERSAL` je storno dogadjaj koji se vezuje za originalni cash event i koristi suprotan smer.

`CORRECTION` je korektivni dogadjaj koji unosi dodatno uskladjenje stanja kada prost storno nije dovoljan ili kada je potrebno evidentirati razliku.

## Reversal workflow

1. Ovlasceni korisnik poziva `reverseCashEvent(eventId, reason)`.
2. Razlog je obavezan.
3. Originalni dogadjaj mora biti `POSTED` ili `LOCKED`.
4. `LOCKED` dogadjaj mogu da storniraju samo `ADMIN` i `FINANCE`.
5. Sistem kreira novi `REVERSAL` dogadjaj sa suprotnim smerom.
6. Originalni dogadjaj dobija status `REVERSED`.
7. Audit log belezi `REVERSE` za original i `POST` za storno dogadjaj.

## Correction workflow

1. Ovlasceni korisnik poziva `createCorrectionEvent(data)`.
2. Obavezna polja su `cashbox_id`, `currency`, `direction`, `amount`, `description` i `reason`.
3. `direction` mora biti `IN` ili `OUT`.
4. Iznos mora biti pozitivan.
5. Sistem kreira `CORRECTION` cash event sa statusom `POSTED`.
6. Audit log belezi `POST`.

## Statusi

| Status | Utice na stanje | Napomena |
|---|---|---|
| DRAFT | no | Nije knjizeno |
| SUBMITTED | no | Nije knjizeno |
| POSTED | yes | Knjizeni dogadjaj |
| LOCKED | yes | Dogadjaj ukljucen u zakljucak |
| CANCELLED | no | Otkazano pre knjizenja ili administrativno |
| REVERSED | no | Originalni dogadjaj je storniran |

## Obracun stanja posle storna

Izabrana strategija u ovoj verziji:

1. Originalni dogadjaj dobija status `REVERSED`.
2. `REVERSED` original se iskljucuje iz obracuna stanja.
3. Novi `REVERSAL` dogadjaj ima status `POSTED` i ucestvuje u obracunu po svom smeru.
4. `POSTED` i `LOCKED` dogadjaji uticu na stanje.
5. `CANCELLED`, `DRAFT`, `SUBMITTED` i `REVERSED` ne uticu na stanje.

## Locked i post-closing korekcije

Dogadjaji ukljuceni u dnevni zakljucak imaju status `LOCKED`. Njihovo storniranje je osetljivo jer je zakljucak vec uradjen.

Za ovu verziju:

1. `LOCKED` dogadjaj smeju da storniraju samo `ADMIN` i `FINANCE`.
2. Storno `LOCKED` dogadjaja u opisu dobija oznaku `POST_CLOSING_CORRECTION`.
3. Prethodni dnevni zakljucak se ne otkljucava automatski.
4. Kasniji menadzment izvestaj mora posebno prikazati post-closing korekcije.

## Veza sa Payment Order

Ako se stornira `CASH_OUTFLOW` povezan sa nalogom za isplatu, sistem u ovom tasku ne vraca automatski Payment Order u `WAITING_PAYMENT`.

Razlog je poslovna bezbednost: ponovno otvaranje naloga zahteva jasna pravila o delimisnim isplatama, dokumentima i odobrenjima. To pripada kasnijem tasku.

## Audit pravila

Svaki storno i svaka korekcija moraju dodati red u `AUDIT_LOG`.

Audit log mora pokazati:

1. ko je izvrsio akciju,
2. koji originalni dogadjaj je storniran,
3. koji novi dogadjaj je kreiran,
4. razlog,
5. vreme akcije.

## Primeri

Storno pogresnog priliva:

```javascript
reverseCashEvent('CEV-20260529-ABC12345', 'Priliv je unet dva puta.');
```

Korektivni dogadjaj za manjak:

```javascript
createCorrectionEvent({
  cashbox_id: 'CB_MAIN',
  currency: 'RSD',
  direction: 'OUT',
  amount: 1000,
  description: 'Korekcija manjka po kontroli.',
  reason: 'Fizicko stanje je manje od izracunatog.'
});
```

Post-closing korekcija:

```javascript
reverseCashEvent('CEV-LOCKED-123', 'Greska pronadjena posle dnevnog zakljucka.');
```
