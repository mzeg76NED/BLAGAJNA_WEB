# E2E Test Plan

Ovaj dokument opisuje kompletan rucni end-to-end scenario za stabilizaciju pre sireg testiranja.

## Preduslovi

1. Pokrenut je `initializeDatabase()`.
2. Pokrenut je `createMinimalTestSetup()` ili su rucno dodati realni test korisnici.
3. Placeholder email adrese su zamenjene realnim Google Workspace nalozima.
4. Web App je deploy-ovan i testiran kroz aktivne korisnike.
5. Test blagajna `CB_MAIN` i valuta `RSD` postoje i aktivne su.

## Scenario

```text
Requester creates Payment Request
-> Approver approves request
-> Finance/Supervisor creates Payment Order
-> Authorized user issues Payment Order
-> Cashier creates cash inflow for test balance
-> Cashier executes Payment Order
-> Cash Event is created
-> Document is attached
-> Cashier opens shift
-> Cashier closes shift
-> Supervisor performs daily closing
-> Events are locked
-> Audit log is reviewed
```

## Koraci

| Step | Actor | Screen/function | Input | Expected result | Expected table changes | Expected audit log entry |
|---|---|---|---|---|---|---|
| 1 | REQUESTER | Mobile / `apiCreatePaymentRequest` | primalac, iznos, valuta, svrha | Zahtev je kreiran kao `DRAFT` | Novi red u `PAYMENT_REQUESTS` | `CREATE` za zahtev |
| 2 | REQUESTER | Mobile / `apiSubmitPaymentRequest` | `request_id` | Zahtev je `SUBMITTED` | Ažuriran red zahteva | `SUBMIT` za zahtev |
| 3 | APPROVER | Mobile/Desktop / `apiApprovePaymentRequest` | `request_id` | Zahtev je `APPROVED` | Popunjeni `reviewed_by`, `reviewed_at` | `APPROVE` za zahtev |
| 4 | FINANCE ili CASHIER_SUPERVISOR | `apiCreatePaymentOrderFromRequest` | `request_id`, `cashbox_id` | Kreiran nalog `DRAFT` | Novi red u `PAYMENT_ORDERS`, zahtev `CONVERTED_TO_ORDER` | `CREATE` za nalog i `UPDATE` za zahtev |
| 5 | FINANCE ili CASHIER_SUPERVISOR | `apiIssuePaymentOrder` | `order_id` | Nalog je `WAITING_PAYMENT` | Ažuriran red naloga | `SUBMIT` za nalog |
| 6 | CASHIER | `apiCreateCashInflow` | `CB_MAIN`, `RSD`, test iznos | Kreiran priliv za test stanje | Novi `CASH_INFLOW` u `CASH_EVENTS` | `POST` za cash event |
| 7 | CASHIER | `apiExecutePaymentOrder` | `order_id` | Isplata je izvrsena | Novi `CASH_OUTFLOW`, nalog `PAID` ili `PARTIALLY_PAID` | `POST` za cash event i `UPDATE` za nalog |
| 8 | CASHIER ili REQUESTER | `apiAttachDocumentToEntity` | entity type/id, fajl | Dokument je sacuvan u Drive | Novi red u `DOCUMENTS`, `document_status = ATTACHED` | `CREATE` za dokument |
| 9 | CASHIER | `apiOpenShift` | `cashbox_id`, napomena | Smena je otvorena | Novi red u `SHIFTS` sa `OPEN` | `CREATE` za smenu |
| 10 | CASHIER | `apiCloseShift` | `shift_id`, fizicko stanje | Smena je zatvorena | `SHIFTS.status = CLOSED` ili `CLOSED_WITH_DIFFERENCE` | `LOCK` ili `UPDATE` za smenu |
| 11 | CASHIER_SUPERVISOR | `apiPrepareDailyClosing` | `cashbox_id`, valuta, datum | Vracen preview bez upisa | Nema novog reda u `DAILY_CLOSING` | Nema audit upisa |
| 12 | CASHIER_SUPERVISOR | `apiCloseDailyCashbox` | fizicko stanje | Dnevni zakljucak kreiran | Novi red u `DAILY_CLOSING`, ukljuceni eventi `LOCKED` | `CREATE` za zakljucak i `LOCK` za evente |
| 13 | FINANCE ili DIRECTOR | Sheet pregled / audit review | filter po entity ID | Audit trag je potpun | `AUDIT_LOG` ostaje append-only | Nema izmene starih audit redova |

## Ogranicenje testiranja identiteta

Google Apps Script izvrsava kod kao aktivni korisnik prema deployment podesavanjima. Testiranje vise rola mora se raditi sa realnim Google Workspace nalozima ili odvojenim test deployment-om. Sistem ne treba da lazno impersonira produkcione role.
