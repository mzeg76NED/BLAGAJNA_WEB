# UI Requirements

## Svrha

Interfejs omogucava korisnicima da rade kroz Google Apps Script Web App umesto direktnog menjanja Google Sheets tabela.

Interfejs ne sme da sadrži poslovnu logiku koja zaobilazi server. Frontend samo prikuplja podatke i poziva server funkcije, dok se validacija i pravila izvršavaju na server strani.

## Mobilni UI

Mobilni prikaz je primarni operativni ekran za blagajnika i korisnike koji unose zahteve.

Principi:

1. veliki tasteri,
2. jednostavne sekcije,
3. minimalno kucanja,
4. jasne poruke o uspehu i gresci,
5. bez gustih tabela.

## Desktop UI

Desktop prikaz je jednostavan dashboard za pregled i operativni rad.

Principi:

1. kartice sa osnovnim brojevima,
2. jednostavne HTML tabele,
3. bez eksternih biblioteka,
4. bez direktnog editovanja sheetova,
5. audit log nije editabilan iz UI-ja.

## Rute

Podrzane su rute:

```text
/exec
/exec?view=mobile
/exec?view=desktop
/exec?view=index
```

Default ruta prikazuje mobilni UI. `view=index` prikazuje izbor prikaza.

## Mobilne sekcije

Mobilni UI sadrzi sekcije:

1. Home,
2. Novi zahtev za isplatu,
3. Moji zahtevi,
4. Zahtevi za odobrenje,
5. Nalozi za isplatu,
6. Izvrsi nalog,
7. Nova uplata,
8. Dodaj dokument,
9. Presek blagajne,
10. Smena,
11. Dnevni zakljucak.

## Desktop sekcije

Desktop UI sadrzi:

1. Dashboard,
2. Payment Requests,
3. Payment Orders,
4. Cashbox Balance,
5. Documents,
6. Shifts,
7. Daily Closings,
8. Audit placeholder.

## API wrapper-i

Frontend poziva samo `api*` funkcije iz `WebApp.gs`.

Payment Requests:

1. `apiCreatePaymentRequest(data)`,
2. `apiSubmitPaymentRequest(requestId)`,
3. `apiListMyPaymentRequests()`,
4. `apiListRequestsForApproval()`,
5. `apiApprovePaymentRequest(requestId)`,
6. `apiRejectPaymentRequest(requestId, reason)`.

Payment Orders:

1. `apiCreatePaymentOrderFromRequest(requestId, orderData)`,
2. `apiCreateDirectPaymentOrder(orderData)`,
3. `apiIssuePaymentOrder(orderId)`,
4. `apiListOrdersWaitingForPayment()`,
5. `apiRejectPaymentOrderByCashier(orderId, reason)`.

Cash Events:

1. `apiExecutePaymentOrder(orderId, paymentData)`,
2. `apiCreateCashInflow(data)`,
3. `apiCalculateCashboxBalance(cashboxId, currency)`.

Documents:

1. `apiAttachDocumentToEntity(entityType, entityId, filePayload, note)`,
2. `apiListDocumentsForEntity(entityType, entityId)`.

Shifts:

1. `apiOpenShift(cashboxId, openingNote)`,
2. `apiGetMyActiveShifts()`,
3. `apiGetShiftBalance(shiftId)`,
4. `apiHandoverShift(shiftId, handoverToUserEmail, physicalBalanceByCurrency, note)`,
5. `apiCloseShift(shiftId, physicalBalanceByCurrency, note)`.

Daily Closing:

1. `apiPrepareDailyClosing(cashboxId, currency, closingDate)`,
2. `apiCloseDailyCashbox(cashboxId, currency, closingDate, physicalBalance, note)`,
3. `apiListDailyClosings(filters)`.

System:

1. `apiGetCurrentUserContext()`,
2. `apiGetAppConfigForUi()`.

## File upload

Frontend cita izabrani fajl kroz `FileReader` i salje backend-u payload:

```javascript
{
  fileName: file.name,
  mimeType: file.type,
  base64Data: base64WithoutPrefix
}
```

Backend cuva fajl u Google Drive, a u `DOCUMENTS` upisuje metapodatke.

## Poznate limitacije

1. Nema naprednog dashboard-a i grafikona.
2. Nema PDF izvestaja.
3. Nema OCR-a.
4. Fizičko stanje smene se unosi kao JSON tekst.
5. UI ne prikazuje detaljan audit log, vec samo placeholder.
6. Frontend validacija je samo pomocna; server ostaje izvor poslovnih pravila.
