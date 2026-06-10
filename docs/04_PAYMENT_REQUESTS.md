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
| APPROVED | Interni prelaz nakon odobrenja vise instance, neposredno pre kreiranja naloga |
| APPROVED_FOR_DIRECT_PAYMENT | Deprecated / emergency-only legacy status; ne koristi se u redovnom toku |
| ESCALATED_TO_ORDER | Zahtev preko limita ceka odobrenje vise instance |
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
| approval_path | no | AUTO_ORDER, PAYMENT_ORDER ili UNDECIDED; legacy DIRECT_PAYMENT se tretira kao AUTO_ORDER |
| direct_cash_event_id | no | Legacy polje; redovan tok ne povezuje Cash Event direktno sa zahtevom |
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
12. Zahtev se ne isplacuje direktno i ne sme direktno kreirati `CASH_OUTFLOW`.
13. Ako je zahtev u okviru limita, sistem automatski kreira nalog za isplatu i postavlja zahtev na `ORDER_CREATED`.
14. Ako je zahtev preko limita, zahtev ostaje u `ESCALATED_TO_ORDER` dok ga visa instanca ne odobri.
15. Nakon odobrenja vise instance sistem kreira nalog za isplatu i postavlja zahtev na `ORDER_CREATED`.
16. Kreiranje naloga iz zahteva ne menja stanje blagajne i ne sme se ponoviti ako zahtev vec ima povezan aktivan nalog.

## UI tok i limiti

Desktop UI sadrzi dva ekrana za rad sa zahtevima:

- Novi zahtev za isplatu
- Pregled zahteva za isplatu

Ekrani prikazuju ocekivani put obrade zahteva:

| Put | Znacenje |
|---|---|
| AUTO_ORDER | Iznos je u okviru limita i sistem automatski kreira nalog za isplatu. |
| PAYMENT_ORDER | Iznos je preko limita; zahtev ide na odobrenje vise instance, pa se nakon odobrenja kreira nalog za isplatu. |
| UNDECIDED | Zahtev jos nema dovoljno podataka ili nije obradjen. |

Legacy `DIRECT_PAYMENT` se vise ne koristi u redovnom toku i prikazuje se kao automatski nalog zbog kompatibilnosti sa starim redovima.

Trenutna konfiguracija limita je deljena iz backend konfiguracije i koristi se u UI za prikaz ocekivanog puta:

| Valuta | Limit za automatsko kreiranje naloga |
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
-> ORDER_CREATED ili ESCALATED_TO_ORDER ili REJECTED ili RETURNED_FOR_CORRECTION
```

Alternativni tok:

```text
DRAFT ili SUBMITTED ili IN_REVIEW ili CASHIER_REVIEW ili ESCALATED_TO_ORDER
-> CANCELLED
```

Tok za nalog:

```text
SUBMITTED u okviru limita ili APPROVED preko limita
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

Zahtev u okviru limita:

```javascript
const submitted = submitPaymentRequest(request.request_id);
// submitted.linked_order_id pokazuje na automatski kreiran nalog.
```

Odobravanje zahteva preko limita i kreiranje naloga:

```javascript
approvePaymentRequest(request.request_id);
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
