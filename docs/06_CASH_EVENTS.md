# Cash Events

## Definicija

Cash Event je stvarni blagajnicki dogadjaj koji predstavlja realno kretanje novca u blagajni.

Stanje blagajne ne menja zahtev za isplatu i ne menja nalog za isplatu. Stanje blagajne menja samo knjižen blagajnički događaj, kao što je CASH_OUTFLOW sa statusom POSTED ili LOCKED.

## Cash Payment Event / Cash Outflow

Cash Payment Event je stvarna isplata koju blagajnik izvrsi na osnovu validnog Payment Order-a.

U ovom sistemu slanje odobrenog naloga blagajni kreira pending `CASH_OUTFLOW` dogadjaj sa:

- `direction = OUT`
- `status = SUBMITTED`
- vezom na `linked_order_id`
- vezom na `linked_request_id` ako nalog potice iz zahteva

Pending `SUBMITTED` dogadjaj ne ulazi u stanje blagajne.

Tek kada blagajnik potvrdi isplatu, isti dogadjaj prelazi u:

- `status = POSTED`
- `posted_by = blagajnik`
- `posted_at = vreme izvrsenja`

To je prvi trenutak kada se stanje blagajne smanjuje.

## Razlika izmedju zahteva, naloga i cash eventa

Payment Request je samo zahtev. Ne autorizuje isplatu i ne menja stanje.

Payment Order je ovlascena instrukcija za isplatu. Autorizuje blagajnika, ali i dalje ne menja stanje.

Cash Event je stvarno kretanje novca. Samo knjizeni dogadjaji ulaze u obracun stanja.

Zahtev za isplatu nikada ne kreira `CASH_OUTFLOW` direktno. I kada je zahtev u okviru limita, prvo nastaje `PAYMENT_ORDER`, a `CASH_OUTFLOW` nastaje tek kada blagajnik izvrsi taj nalog.

## Tipovi dogadjaja

| Tip | Direction | Uticaj |
|---|---|---|
| CASH_INFLOW | IN | Povecava stanje |
| CASH_OUTFLOW | OUT | Smanjuje stanje |
| CASH_TRANSFER_IN | IN | Povecava stanje blagajne primaoca |
| CASH_TRANSFER_OUT | OUT | Smanjuje stanje blagajne izvora |
| TREASURY_HANDOVER | OUT | Predaja sredstava iz blagajne u trezor; smanjuje blagajnu, nije isplata korisniku |
| CORRECTION | IN/OUT/NEUTRAL | Zavisi od korekcije, kasniji workflow |
| REVERSAL | IN/OUT/NEUTRAL | Zavisi od storna, kasniji workflow |

U pilot verziji implementirani su `CASH_INFLOW`, `CASH_OUTFLOW`, `TREASURY_HANDOVER`, `CORRECTION` po preseku blagajne i `REVERSAL`.

## Statusi

| Status | Znacenje |
|---|---|
| DRAFT | Pripremljen dogadjaj, nije knjizen |
| SUBMITTED | Predat na knjizenje |
| POSTED | Knjizen i ulazi u stanje |
| LOCKED | Zakljucan i ulazi u stanje |
| CANCELLED | Otkazan, ne ulazi u stanje |
| REVERSED | Storniran, ne ulazi direktno u stanje |

## Statusi koji uticu na stanje

Samo ovi statusi ulaze u obracun:

```text
POSTED
LOCKED
```

Svi ostali statusi se ignorisu pri racunanju stanja.

## Pravilo obracuna stanja

Stanje blagajne se racuna iz `CASH_EVENTS`:

```text
sum(POSTED/LOCKED IN)
- sum(POSTED/LOCKED OUT)
= izracunato stanje
```

`NEUTRAL` ne menja stanje.

Opening balance jos nije poseban modul. Do uvodjenja opening balance-a ili pocetnog blagajnickog dogadjaja, stanje krece od nule. Za testiranje se pocetno stanje pravi kroz `createCashInflow()`.

## Izvrsenje naloga za isplatu

`sendPaymentOrderToCashier(orderId)`:

1. proverava da nalog postoji,
2. dozvoljava samo nalog koji ceka isplatu,
3. proverava da ne postoji vec otvorena pending ISPLATA za isti nalog,
4. kreira `CASH_OUTFLOW` sa statusom `SUBMITTED`,
5. povezuje zapis sa nalogom kroz `linked_order_id`,
6. ne menja stanje blagajne,
7. ne oznacava nalog kao placen.

`executePendingPaymentOrderOutflow(pendingPaymentId, paymentData)`:

1. proverava aktivnog korisnika i rolu blagajnika,
2. proverava da postoji pending `CASH_OUTFLOW` sa statusom `SUBMITTED`,
3. proverava povezani nalog,
4. dozvoljava samo statuse naloga `WAITING_PAYMENT` i `PARTIALLY_PAID`,
5. proverava aktivnu smenu blagajnika za tu blagajnu,
6. proverava valutu i blagajnu,
7. proverava trenutno stanje blagajne,
8. sprecava negativno stanje,
9. prebacuje pending `CASH_OUTFLOW` u `POSTED`,
10. azurira `amount_paid` na nalogu,
11. prebacuje nalog u `PAID` ili `PARTIALLY_PAID`,
12. upisuje audit log za cash event i nalog.

`executePaymentOrder(orderId, paymentData)` je zadrzan kao kompatibilni ulaz, ali sada zahteva da za nalog vec postoji pending ISPLATA zapis.

## Pravilo nedovoljnog stanja

Ako je trenutno stanje blagajne manje od trazenog iznosa isplate:

1. sistem baca jasnu gresku,
2. pending `CASH_OUTFLOW` ostaje `SUBMITTED`,
3. nalog ostaje nepromenjen,
4. stanje blagajne ostaje nepromenjeno,
5. u audit/tok naloga upisuje se neuspesan pokusaj.

## Audit pravila

Svaki knjizeni cash event upisuje `AUDIT_LOG`:

| Akcija | Audit action |
|---|---|
| Cash inflow | POST |
| Cash outflow iz naloga | POST |
| Azuriranje naloga posle isplate | UPDATE |

Audit log se ne menja i ne brise kroz poslovne funkcije.

## Primeri

Kreiranje priliva za testiranje stanja:

```javascript
createCashInflow({
  cashbox_id: 'CB-001',
  currency: 'RSD',
  amount: 50000,
  description: 'Pocetni test priliv'
});
```

Izvrsenje naloga u celosti:

```javascript
const result = executePaymentOrder(orderId, {
  note: 'Isplata izvrsena primaocu'
});
```

Delimicna isplata:

```javascript
const result = executePaymentOrder(orderId, {
  amount: 5000,
  note: 'Delimicna isplata'
});
```

Provera stanja:

```javascript
const balance = calculateCashboxBalance('CB-001', 'RSD');
```

Storno nije implementiran u Task 05:

```javascript
reverseCashEvent(eventId, 'Greska u unosu');
```
