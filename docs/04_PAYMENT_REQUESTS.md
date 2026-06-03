# Payment Requests

## Definicija

Payment Request, odnosno zahtev za isplatu, je zahtev koji korisnik podnosi trazeci da se novac isplati odredjenoj osobi za odredjenu poslovnu svrhu.

Zahtev za isplatu nije nalog za isplatu i nije isplata. Zahtev ne menja stanje blagajne.

## Razlika izmedju zahteva, naloga i isplate

Payment Request je samo poslovni zahtev. Ne daje blagajniku ovlascenje da isplati novac.

Payment Order je autorizovano uputstvo blagajniku. Tek nalog moze kasnije da bude osnova za isplatu, ali ni on sam ne menja stanje blagajne.

Cash Payment Event je stvarno izvrsena isplata. Samo knjizeni cash event menja izracunato stanje blagajne.

## Dozvoljeni korisnici

Zahtev za isplatu mogu da kreiraju aktivni korisnici sa jednom od sledecih rola:

- ADMIN
- DIRECTOR
- FINANCE
- CASHIER_SUPERVISOR
- CASHIER
- APPROVER
- REQUESTER

Zahteve mogu da pregledaju i odobravaju aktivni korisnici sa jednom od sledecih rola:

- ADMIN
- DIRECTOR
- FINANCE
- CASHIER_SUPERVISOR
- APPROVER

Kreator zahteva moze da podnese ili otkaze svoj zahtev. Korisnici sa review rolama mogu da rade nad zahtevima u redu za odobrenje.

## Statusi

Dozvoljeni statusi su:

| Status | Znacenje |
|---|---|
| DRAFT | Zahtev je sacuvan kao nacrt |
| SUBMITTED | Zahtev je podnet na pregled |
| IN_REVIEW | Zahtev je u obradi kod odobravaoca |
| CASHIER_REVIEW | Zahtev je u obradi blagajne / odobravaoca |
| APPROVED | Legacy status za odobren zahtev |
| APPROVED_FOR_DIRECT_PAYMENT | Zahtev je odobren za direktnu isplatu kroz poseban Cash Payment Event |
| ESCALATED_TO_ORDER | Zahtev mora u visi nivo i iz njega nastaje nalog |
| ORDER_CREATED | Iz zahteva je kreiran nalog za isplatu |
| PAID | Zahtev je isplacen kroz Cash Payment Event |
| REJECTED | Zahtev je odbijen |
| RETURNED_FOR_CORRECTION | Zahtev je vracen podnosiocu na dopunu |
| CONVERTED_TO_ORDER | Zahtev je kasnije pretvoren u nalog za isplatu |
| CANCELLED | Zahtev je otkazan |

## Polja

Payment Request koristi polja definisana u `PAYMENT_REQUESTS` sheetu:

| Field | Required | Notes |
|---|---:|---|
| request_id | yes | Generisani ID |
| created_at | yes | Vreme kreiranja |
| created_by | yes | Email korisnika koji je kreirao zahtev |
| requester_user_id | no | Interni ID korisnika ako je dostupan |
| requested_for_name | yes | Primalac novca |
| amount | yes | Pozitivan iznos |
| currency | yes | Aktivna valuta |
| purpose | yes | Poslovna svrha |
| description | no | Dodatno objasnjenje |
| preferred_cashbox_id | no | Predlozena blagajna |
| needed_by_date | no | Datum kada je novac potreban |
| priority | yes | NORMAL, URGENT ili VERY_URGENT |
| status | yes | Trenutni status |
| reviewed_by | no | Korisnik koji je pregledao zahtev |
| reviewed_at | no | Vreme pregleda |
| rejection_reason | no | Obavezno ako je zahtev odbijen |
| linked_order_id | no | Popunjava se kada je iz zahteva kreiran nalog |
| approval_path | no | DIRECT_PAYMENT, PAYMENT_ORDER ili UNDECIDED |
| direct_cash_event_id | no | Popunjava se kasnije kada stvarna direktna isplata napravi Cash Event |
| returned_for_correction_reason | no | Obavezna napomena kada je zahtev vracen na dopunu |
| cancellation_reason | no | Razlog ponistenja kada je potreban |
| document_status | yes | NONE, MISSING ili ATTACHED |
| updated_at | no | Vreme poslednje izmene |

## Poslovna pravila

1. Zahtev za isplatu ne utice na stanje blagajne.
2. Zahtev za isplatu ne ovlascuje blagajnika da izvrsi isplatu.
3. Novi zahtev pocinje u statusu `DRAFT`.
4. Samo `DRAFT` zahtev moze da predje u `SUBMITTED`.
5. `SUBMITTED` zahtev moze da predje u `CASHIER_REVIEW`.
6. `SUBMITTED`, `IN_REVIEW`, `CASHIER_REVIEW`, `ESCALATED_TO_ORDER` ili legacy `APPROVED` zahtev moze da bude obradjen.
7. Zahtev u obradi moze da bude odbijen ili vracen na dopunu.
8. Odbijanje zahteva mora imati razlog.
9. Vracanje na dopunu mora imati napomenu.
10. Otkazan zahtev ostaje u sheetu i dobija status `CANCELLED`.
11. Zahtev u statusu `ORDER_CREATED`, `CONVERTED_TO_ORDER` ili `PAID` ne moze da se otkaze kroz ovaj workflow.
12. Odobravanje zahteva za direktnu isplatu ne pravi Cash Event i ne menja stanje blagajne.
13. Kreiranje naloga iz zahteva ne menja stanje blagajne i ne sme se ponoviti ako zahtev vec ima povezan aktivan nalog.

## UI tok i limiti

Desktop UI sadrzi dva ekrana za rad sa zahtevima:

- Novi zahtev za isplatu
- Pregled zahteva za isplatu

Ekrani prikazuju ocekivani put obrade zahteva:

| Put | Znacenje |
|---|---|
| DIRECT_PAYMENT | Iznos je u okviru limita blagajnika i zahtev moze biti odobren za direktnu isplatu. Stanje blagajne se i dalje menja tek kroz Cash Payment Event. |
| PAYMENT_ORDER | Iznos je preko limita ili je potrebna visa instanca, pa se iz zahteva kreira nalog za isplatu. |
| UNDECIDED | Zahtev jos nema dovoljno podataka ili nije obradjen. |

Trenutna konfiguracija limita je deljena iz backend konfiguracije i koristi se u UI za prikaz ocekivanog puta:

| Valuta | Limit za direktno odobrenje |
|---|---:|
| RSD | 30.000 |
| EUR | 100 |
| CEK | 30.000 |

Odbijanje zahteva u UI i backendu mora imati razlog. Vracanje na dopunu mora imati napomenu. Kreiranje naloga iz zahteva mora imati potvrdu i ne sme automatski kreirati drugi nalog ako zahtev vec ima povezan nalog ili aktivan nalog u `PAYMENT_ORDERS`.

## Lifecycle

Standardni tok u ovom tasku:

```text
DRAFT
-> SUBMITTED
-> CASHIER_REVIEW / IN_REVIEW
-> APPROVED_FOR_DIRECT_PAYMENT ili ESCALATED_TO_ORDER ili REJECTED ili RETURNED_FOR_CORRECTION
```

Alternativni tok:

```text
DRAFT ili SUBMITTED ili IN_REVIEW ili CASHIER_REVIEW ili APPROVED_FOR_DIRECT_PAYMENT ili ESCALATED_TO_ORDER
-> CANCELLED
```

Tok za nalog:

```text
ESCALATED_TO_ORDER
-> ORDER_CREATED
-> PAYMENT_ORDER
-> CASH_PAYMENT_EVENT
```

## Validacije

Kreiranje zahteva proverava:

- aktivnog trenutnog korisnika,
- dozvoljenu rolu,
- obavezna polja `requested_for_name`, `amount`, `currency`, `purpose`,
- pozitivan iznos,
- aktivnu valutu,
- dozvoljeni prioritet `NORMAL`, `URGENT` ili `VERY_URGENT`,
- aktivnu predlozenu blagajnu i pravo pristupa blagajni ako je uneta,
- izracunat `approval_path` na osnovu iznosa i valute,
- dozvoljeni `document_status`.

Podnosenje zahteva dodatno proverava da opis postoji i ima najmanje 10 karaktera.

Promene statusa proveravaju:

- da zahtev postoji,
- da je trenutni status dozvoljen za trazenu akciju,
- da korisnik ima pravo nad zahtevom,
- da je razlog unet kada je obavezan.

## Audit pravila

Svaka vazna akcija dodaje red u `AUDIT_LOG`:

| Akcija | Audit action |
|---|---|
| Kreiranje zahteva | CREATE |
| Podnosenje zahteva | SUBMIT |
| Oznacavanje kao u obradi | UPDATE |
| Odobravanje zahteva | APPROVE |
| Odbijanje zahteva | REJECT |
| Vracanje na dopunu | UPDATE |
| Otkazivanje zahteva | CANCEL |

Audit log se ne menja i ne brise kroz poslovne funkcije.

## Primeri

Kreiranje nacrta:

```javascript
const request = createPaymentRequest({
  requested_for_name: 'Petar Petrovic',
  amount: 15000,
  currency: 'RSD',
  purpose: 'Trosak puta Novi Sad',
  description: 'Gorivo i putarina',
  priority: 'NORMAL'
});
```

Podnosenje zahteva:

```javascript
submitPaymentRequest(request.request_id);
```

Odobravanje zahteva za direktnu isplatu:

```javascript
approvePaymentRequestForDirectPayment(request.request_id);
```

Odobravanje zahteva preko limita i kreiranje naloga:

```javascript
approvePaymentRequest(request.request_id);
createPaymentOrderFromRequest(request.request_id, { cashbox_id: 'CB-001' });
```

Odbijanje zahteva:

```javascript
rejectPaymentRequest(request.request_id, 'Nedostaje poslovno obrazlozenje.');
```

Vracanje na dopunu:

```javascript
returnPaymentRequestForCorrection(request.request_id, 'Dodati fiskalni racun kao prilog.');
```

Otkazivanje zahteva:

```javascript
cancelPaymentRequest(request.request_id, 'Korisnik je odustao od zahteva.');
```
