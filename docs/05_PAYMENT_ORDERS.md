# Payment Orders

## Definicija

Payment Order, odnosno nalog za isplatu, je ovlascena instrukcija blagajni da isplati definisan iznos definisanoj osobi za definisanu poslovnu svrhu.

Nalog za isplatu je ovlašćena instrukcija blagajni da izvrši isplatu, ali sam nalog ne menja stanje blagajne. Stanje blagajne menja se tek kada blagajnik izvrši nalog i nastane knjižen/blagajnički događaj isplate.

## Razlika izmedju zahteva, naloga i isplate

Payment Request je samo zahtev i ne autorizuje blagajnika da plati.

Payment Order je autorizovana instrukcija za placanje. On daje osnov za kasnije izvrsenje, ali sam ne pravi novcani dogadjaj.

Cash Payment Event je stvarna isplata. Tek knjizen Cash Event menja izracunato stanje blagajne.

## Workflow napomena za UI

Supervizor moze da odobri ili izda nalog, ali supervizor ne isplacuje novac.

Akcija `Posalji na isplatu` u pregledu naloga kreira pending ISPLATA zapis u `CASH_EVENTS` kao:

- `event_type = CASH_OUTFLOW`
- `status = SUBMITTED`
- `linked_order_id = order_id`

Pending ISPLATA ne menja stanje blagajne i ne oznacava nalog kao placen.

Stvarnu isplatu izvrsava blagajnik kroz blagajnicki tok. Tek blagajnikovo izvrsenje pending ISPLATA zapisa menja status cash event-a u `POSTED`, smanjuje stanje blagajne i azurira nalog na `PAID` ili `PARTIALLY_PAID`.

## Tipovi naloga

| Tip | Znacenje |
|---|---|
| FROM_REQUEST | Nalog je kreiran iz odobrenog zahteva za isplatu |
| DIRECT_ORDER | Nalog je kreiran direktno od strane ovlascenog korisnika |

Direktan nalog je dozvoljen samo za podignute role i mora ostati jasno obelezen kao `DIRECT_ORDER`.

## Dozvoljeni korisnici

Nalog iz odobrenog zahteva mogu da kreiraju aktivni korisnici sa rolama:

- ADMIN
- DIRECTOR
- FINANCE
- CASHIER_SUPERVISOR
- APPROVER

Direktan nalog mogu da kreiraju aktivni korisnici sa rolama:

- ADMIN
- DIRECTOR
- FINANCE
- CASHIER_SUPERVISOR

Nalog mogu da izdaju blagajni korisnici sa rolama:

- ADMIN
- DIRECTOR
- FINANCE
- CASHIER_SUPERVISOR
- APPROVER

Nalog mogu da otkazu korisnici sa rolama:

- ADMIN
- DIRECTOR
- FINANCE
- CASHIER_SUPERVISOR

Blagajnik moze da odbije/vrati nalog ako ne moze da ga izvrsi. Dozvoljene role:

- CASHIER
- CASHIER_SUPERVISOR
- ADMIN

## Statusi

| Status | Znacenje |
|---|---|
| DRAFT | Nalog je pripremljen, ali jos nije izdat blagajni |
| ISSUED | Rezervisano za kasniji detaljniji tok izdavanja |
| WAITING_PAYMENT | Nalog je odobren i moze biti poslat blagajni ili vec ceka pending ISPLATA zapis |
| PARTIALLY_PAID | Deo naloga je placen, potpuna logika pripada kasnijem tasku |
| PAID | Nalog je placen, popunjava se tek nakon izvrsenja placanja |
| REJECTED_BY_CASHIER | Blagajnik ne moze da izvrsi nalog kako je zadat |
| CANCELLED | Nalog je otkazan |
| CLOSED | Nalog je zatvoren nakon izvrsenja ili kasnijeg procesa |

## Polja

Payment Order koristi polja definisana u `PAYMENT_ORDERS` sheetu:

| Field | Required | Notes |
|---|---:|---|
| order_id | yes | Generisani ID |
| created_at | yes | Vreme kreiranja |
| created_by | yes | Korisnik koji je kreirao nalog |
| source_request_id | no | Obavezno za FROM_REQUEST |
| linked_request_id | no | Alias veze na zahtev; popunjava se za FROM_REQUEST |
| order_type | yes | FROM_REQUEST ili DIRECT_ORDER |
| cashbox_id | yes | Blagajna iz koje treba platiti |
| pay_to_name | yes | Primalac |
| amount_ordered | yes | Pozitivan iznos naloga |
| amount_paid | yes | Placeni iznos, u ovom tasku uvek 0 |
| currency | yes | Aktivna valuta |
| purpose | yes | Poslovna svrha |
| description | no | Dodatno objasnjenje |
| due_date | no | Datum dospeca |
| priority | yes | NORMAL ili URGENT |
| status | yes | Trenutni status |
| issued_by | no | Korisnik koji je izdao nalog |
| issued_at | no | Vreme izdavanja |
| executed_by | no | Popunjava se tek u Task 05 |
| executed_at | no | Popunjava se tek u Task 05 |
| linked_cash_event_id | no | Popunjava se tek u Task 05 |
| document_status | yes | NONE, MISSING ili ATTACHED |
| cancellation_reason | no | Obavezno ako je nalog otkazan |
| cashier_rejection_reason | no | Obavezno ako ga blagajnik odbije |
| updated_at | no | Vreme poslednje izmene |

## Lifecycle

Nalog iz zahteva:

```text
SUBMITTED PAYMENT_REQUEST u okviru limita ili APPROVED PAYMENT_REQUEST preko limita
-> WAITING_PAYMENT
-> request status ORDER_CREATED
-> pending CASH_OUTFLOW SUBMITTED kada se posalje blagajni
-> CASH_OUTFLOW POSTED tek kada blagajnik izvrsi isplatu
```

Direktan nalog:

```text
DRAFT PAYMENT_ORDER
-> WAITING_PAYMENT
-> pending CASH_OUTFLOW SUBMITTED
-> CASH_OUTFLOW POSTED
```

Otkazivanje:

```text
DRAFT ili WAITING_PAYMENT
-> CANCELLED
```

Odbijanje od strane blagajnika:

```text
WAITING_PAYMENT
-> REJECTED_BY_CASHIER
```

Izvrsenje naloga i prelaz u `PAID` ili `PARTIALLY_PAID` nisu deo Task 04.

## Poslovna pravila

1. Payment Order je ovlascenje za isplatu, ali nije sama isplata.
2. Kreiranje naloga ne pravi Cash Event.
3. Izdavanje naloga ne pravi Cash Event.
4. Nalog ne menja stanje blagajne.
5. Nalog iz zahteva mora imati `source_request_id` i `linked_request_id`.
6. Odobren zahtev ne sme da kreira vise aktivnih naloga.
7. Kreiran nalog iz zahteva azurira zahtev na `ORDER_CREATED`.
8. Direktan nalog mora imati `order_type = DIRECT_ORDER`.
9. Otkazan nalog ostaje u sheetu.
10. Placeni ili zatvoreni nalog ne moze se direktno otkazati.
11. Delimicno placen nalog se ne otkazuje u ovom tasku.
12. Blagajnik moze da odbije samo nalog u statusu `WAITING_PAYMENT`.
13. Slanje naloga blagajni ne menja stanje blagajne.
14. Slanje naloga blagajni kreira pending `CASH_OUTFLOW` sa statusom `SUBMITTED`.
15. Samo blagajnik koji ima aktivnu smenu za blagajnu moze da izvrsi pending ISPLATA zapis.
16. Ako nema dovoljno sredstava, pending ISPLATA ostaje `SUBMITTED`, nalog ostaje neplacen, stanje se ne menja i u audit/tok naloga se upisuje neuspesan pokusaj.

## Validacije

Kreiranje naloga iz zahteva proverava:

- aktivnog korisnika,
- dozvoljenu rolu,
- da zahtev postoji,
- da je zahtev u dozvoljenom statusu za kreiranje naloga,
- da zahtev u okviru limita moze kreirati nalog posle `SUBMITTED`,
- da zahtev preko limita moze kreirati nalog tek posle odobrenja vise instance,
- da zahtev nema `linked_order_id`,
- da nema drugog aktivnog naloga za isti zahtev,
- obaveznu blagajnu,
- aktivnu blagajnu,
- pozitivan iznos,
- aktivnu valutu,
- dozvoljeni prioritet,
- dozvoljeni document status.

Kreiranje direktnog naloga proverava:

- aktivnog korisnika,
- dozvoljenu rolu,
- `cashbox_id`,
- `pay_to_name`,
- `amount_ordered`,
- `currency`,
- `purpose`,
- pozitivan iznos,
- aktivnu valutu,
- aktivnu blagajnu.

Izdavanje, otkazivanje i odbijanje naloga proveravaju trenutni status i rolu korisnika.

## Audit pravila

Svaka vazna akcija dodaje red u `AUDIT_LOG`:

| Akcija | Audit action |
|---|---|
| Kreiranje naloga | CREATE |
| Povezivanje zahteva sa nalogom | UPDATE |
| Izdavanje naloga blagajni | SUBMIT |
| Slanje pending ISPLATA blagajni | SUBMIT / CREATE |
| Neuspesan pokusaj zbog nedovoljno sredstava | UPDATE |
| Otkazivanje naloga | CANCEL |
| Odbijanje naloga od strane blagajnika | REJECT |

Audit log se ne menja i ne brise kroz poslovne funkcije.

## Primeri

Kreiranje naloga iz odobrenog zahteva:

```javascript
const order = createPaymentOrderFromRequest(requestId, {
  cashbox_id: 'CB-001',
  due_date: new Date(),
  description: 'Isplata po odobrenom zahtevu'
});
```

Kreiranje direktnog naloga:

```javascript
const order = createDirectPaymentOrder({
  cashbox_id: 'CB-001',
  pay_to_name: 'Petar Petrovic',
  amount_ordered: 15000,
  currency: 'RSD',
  purpose: 'Trosak puta Novi Sad',
  priority: 'NORMAL'
});
```

Izdavanje naloga blagajni:

```javascript
issuePaymentOrder(order.order_id);
```

Otkazivanje naloga:

```javascript
cancelPaymentOrder(order.order_id, 'Pogresno unet nalog.');
```

Odbijanje naloga od strane blagajnika:

```javascript
rejectPaymentOrderByCashier(order.order_id, 'Primalac nije prisutan.');
```
