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
| APPROVED | Zahtev je odobren |
| REJECTED | Zahtev je odbijen |
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
| priority | yes | NORMAL ili URGENT |
| status | yes | Trenutni status |
| reviewed_by | no | Korisnik koji je pregledao zahtev |
| reviewed_at | no | Vreme pregleda |
| rejection_reason | no | Obavezno ako je zahtev odbijen |
| linked_order_id | no | Popunjava se kasnije, kada Task 04 napravi nalog |
| document_status | yes | NONE, MISSING ili ATTACHED |
| updated_at | no | Vreme poslednje izmene |

## Poslovna pravila

1. Zahtev za isplatu ne utice na stanje blagajne.
2. Zahtev za isplatu ne ovlascuje blagajnika da izvrsi isplatu.
3. Novi zahtev pocinje u statusu `DRAFT`.
4. Samo `DRAFT` zahtev moze da predje u `SUBMITTED`.
5. Samo `SUBMITTED` zahtev moze da predje u `IN_REVIEW`.
6. Samo `SUBMITTED` ili `IN_REVIEW` zahtev moze da bude odobren.
7. Samo `SUBMITTED` ili `IN_REVIEW` zahtev moze da bude odbijen.
8. Odbijanje zahteva mora imati razlog.
9. Otkazan zahtev ostaje u sheetu i dobija status `CANCELLED`.
10. Zahtev u statusu `CONVERTED_TO_ORDER` ne moze da se otkaze kroz ovaj workflow.
11. Odobravanje zahteva ne pravi Payment Order u Task 03.
12. Odobravanje zahteva ne pravi Cash Event i ne menja stanje blagajne.

## Lifecycle

Standardni tok u ovom tasku:

```text
DRAFT
-> SUBMITTED
-> IN_REVIEW
-> APPROVED ili REJECTED
```

Alternativni tok:

```text
DRAFT ili SUBMITTED ili IN_REVIEW ili APPROVED
-> CANCELLED
```

Prelaz iz `APPROVED` u `CONVERTED_TO_ORDER` pripada Task 04 i nije implementiran ovde.

## Validacije

Kreiranje zahteva proverava:

- aktivnog trenutnog korisnika,
- dozvoljenu rolu,
- obavezna polja `requested_for_name`, `amount`, `currency`, `purpose`,
- pozitivan iznos,
- aktivnu valutu,
- dozvoljeni prioritet `NORMAL` ili `URGENT`,
- aktivnu predlozenu blagajnu ako je uneta,
- dozvoljeni `document_status`.

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

Odobravanje zahteva:

```javascript
approvePaymentRequest(request.request_id);
```

Odbijanje zahteva:

```javascript
rejectPaymentRequest(request.request_id, 'Nedostaje poslovno obrazlozenje.');
```

Otkazivanje zahteva:

```javascript
cancelPaymentRequest(request.request_id, 'Korisnik je odustao od zahteva.');
```
