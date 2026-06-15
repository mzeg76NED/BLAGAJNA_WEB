# Business Process

## Svrha

Ovaj dokument opisuje osnovne poslovne tokove blagajne.

## Standardni tok

PAYMENT_REQUEST -> APPROVAL -> PAYMENT_ORDER -> PENDING ISPLATA -> CASH_PAYMENT_EVENT -> DOCUMENT / RECEIPT -> CLOSING

## Operativna pravila

1. Payment Request je zahtev i ne menja stanje blagajne.
2. Payment Order je odobreno uputstvo i ne menja stanje blagajne.
3. Slanje naloga blagajni kreira pending `CASH_OUTFLOW` sa statusom `SUBMITTED`.
4. Pending `SUBMITTED` događaj ne ulazi u obračun stanja.
5. Tek izvršenje pending ISPLATA zapisa od strane blagajnika prebacuje `CASH_OUTFLOW` u `POSTED` i menja stanje blagajne.
6. Direktna isplata bez naloga nije deo redovnog toka. Emergency/ad-hoc izuzetak mora biti posebno dokumentovan pre upotrebe.
