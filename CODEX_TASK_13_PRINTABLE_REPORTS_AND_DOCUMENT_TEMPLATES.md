# CODEX_TASK_13_PRINTABLE_REPORTS_AND_DOCUMENT_TEMPLATES.md

## Task name

BLAGAJNA WEB — Task 13: Printable reports and document templates

## Purpose of this task

Implement printable document views and report templates for BLAGAJNA WEB.

The goal is to allow users to generate clean printable documents from existing business records:

1. Payment Request print view,
2. Payment Order print view,
3. Cash Payment confirmation print view,
4. Shift handover record print view,
5. Daily closing report print view,
6. Missing documents report print view,
7. Cashbox balance report print view.

This task must not change the core business workflows.

It must only read existing records and render printable HTML.

PDF generation is optional and must be implemented only if it can be done safely in Google Apps Script without external paid services.

## Before starting

Read these files first:

1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. all `CODEX_TASK_*.md` files,
4. all files in `/docs`,
5. all files in `/src`.

Do not overwrite useful existing work.

If print views already exist, improve them.

If WebApp routing already exists, extend it carefully.

## Critical rules to preserve

These rules must remain true:

```text
Payment Request is not payment.
Payment Order is not payment.
Only posted or locked Cash Event changes cashbox balance.
```

Printable documents must not create, approve, post, reverse or close anything.

Printable documents are read-only outputs.

## Scope of this task

Implement:

1. printable HTML templates,
2. print route handling,
3. server functions that prepare print data,
4. print-safe CSS,
5. optional PDF blob generation if safe,
6. documentation,
7. manual tests.

Do not implement:

1. accounting posting,
2. ERP integration,
3. digital signature,
4. OCR,
5. advanced legal archiving,
6. external PDF services,
7. paid dependencies.

## Required files to update or create

Update or create:

1. `src/PrintViews.gs`
2. `src/WebApp.gs`
3. `src/html/print-payment-request.html`
4. `src/html/print-payment-order.html`
5. `src/html/print-cash-event.html`
6. `src/html/print-shift-handover.html`
7. `src/html/print-daily-closing.html`
8. `src/html/print-report.html`
9. `src/html/print-styles.html`
10. `src/html/desktop.html`
11. `src/html/scripts.html`
12. `docs/17_PRINTABLE_REPORTS_AND_TEMPLATES.md`
13. `docs/10_TEST_CASES.md`
14. `README.md`

If project structure differs, adapt carefully.

## Required print routes

Extend `doGet(e)` in `WebApp.gs` or route handler.

Supported routes:

```text
?view=print-payment-request&id=REQ-...
?view=print-payment-order&id=ORD-...
?view=print-cash-event&id=CEV-...
?view=print-shift-handover&id=SHF-...
?view=print-daily-closing&id=CLS-...
?view=print-report&type=missing-documents
?view=print-report&type=cashbox-balance
```

Rules:

1. Validate current user permission before rendering.
2. Validate that ID/type exists.
3. Render printable HTML.
4. Do not modify business data.
5. Do not write audit log for normal print view unless project policy requires print tracking.
6. If print tracking is added, it must be documented and must not pollute business audit log unless intentionally required.

## Required server functions in `src/PrintViews.gs`

Create `PrintViews.gs` if missing.

### 1. `getPrintablePaymentRequestData(requestId)`

Returns all data needed to print a Payment Request.

Data should include:

1. request,
2. requester user if available,
3. linked order if available,
4. linked documents,
5. status label,
6. company/application header data.

Rules:

1. Current user must have permission to view request.
2. Request must exist.
3. Do not change data.

### 2. `getPrintablePaymentOrderData(orderId)`

Returns data for Payment Order.

Data should include:

1. order,
2. source request if available,
3. linked cash event if available,
4. linked documents,
5. status label,
6. company/application header data.

Rules:

1. Current user must have permission to view order.
2. Order must exist.
3. Do not change data.

### 3. `getPrintableCashEventData(eventId)`

Returns data for Cash Event.

Data should include:

1. cash event,
2. linked order if available,
3. linked request if available,
4. linked documents,
5. cashbox,
6. status label.

Rules:

1. Current user must have permission to view cash event.
2. Event must exist.
3. Do not change data.

### 4. `getPrintableShiftHandoverData(shiftId)`

Returns data for shift handover/closing record.

Data should include:

1. shift,
2. cashbox,
3. opened_by user if available,
4. handover_to user if available,
5. balance JSON parsed,
6. physical balance JSON parsed,
7. difference JSON parsed,
8. linked documents.

Rules:

1. Current user must have permission to view shift.
2. Shift must exist.
3. Do not change data.

### 5. `getPrintableDailyClosingData(closingId)`

Returns data for daily closing report.

Data should include:

1. daily closing,
2. cashbox,
3. currency,
4. included cash events if available,
5. linked documents,
6. totals,
7. difference.

Rules:

1. Current user must have permission to view daily closing.
2. Closing must exist.
3. Do not change data.

### 6. `getPrintableReportData(reportType, filters)`

Returns data for printable operational reports.

Supported report types:

```text
missing-documents
cashbox-balance
orders-waiting-payment
requests-for-approval
daily-closing
differences
corrections-reversals
```

Rules:

1. Use existing report functions from `Reports.gs`.
2. Do not duplicate report logic.
3. Do not modify data.

## Optional PDF generation

Implement only if safe and simple.

Possible function:

```javascript
function generatePrintablePdf(viewType, idOrFilters) {}
```

Rules:

1. Generate HTML using existing print template.
2. Convert to PDF blob only if Google Apps Script supports current approach reliably.
3. Store PDF in Drive only if explicitly requested by caller.
4. Do not automatically create PDF on every print view.
5. Document limitations.

If PDF generation is not implemented, create placeholder:

```javascript
function generatePrintablePdf(viewType, idOrFilters) {
  throw new Error('PDF generation is not implemented in Task 13. Use browser print or Save as PDF.');
}
```

This is acceptable.

## Print template requirements

All print templates must use Serbian Latin script.

### General style

Printable documents must be:

1. clean,
2. black and white friendly,
3. readable,
4. A4 friendly,
5. suitable for browser print,
6. without unnecessary icons,
7. without external fonts or external CSS.

### Common header

Each document should include:

```text
BLAGAJNA WEB
Interni dokument blagajničkog poslovanja
```

Optional company line:

```text
Industrija Mesa Nedeljković doo
```

Do not hardcode company data in too many places.

Use config if available.

### Common footer

Each print document should include:

1. generation timestamp,
2. generated by user,
3. document source ID,
4. note that document is generated from BLAGAJNA WEB.

Example:

```text
Dokument generisan iz sistema BLAGAJNA WEB. Izvorni zapis se nalazi u sistemu.
```

## Template 1 — Payment Request print

Title:

```text
ZAHTEV ZA ISPLATU
```

Fields:

1. Broj zahteva,
2. Datum kreiranja,
3. Podnosilac,
4. Primalac novca,
5. Iznos,
6. Valuta,
7. Svrha,
8. Opis,
9. Prioritet,
10. Status,
11. Pregledao,
12. Datum pregleda,
13. Razlog odbijanja if applicable,
14. Povezani nalog if applicable,
15. Dokumenta.

Signature placeholders:

```text
Podnosilac zahteva: ______________________
Odobrio / pregledao: ______________________
```

## Template 2 — Payment Order print

Title:

```text
NALOG ZA ISPLATU
```

Fields:

1. Broj naloga,
2. Datum naloga,
3. Tip naloga,
4. Povezani zahtev,
5. Blagajna,
6. Primalac novca,
7. Iznos za isplatu,
8. Već isplaćeno,
9. Preostalo,
10. Valuta,
11. Svrha,
12. Opis,
13. Rok isplate,
14. Status,
15. Izdao,
16. Datum izdavanja,
17. Dokumenta.

Important visible note:

```text
Ovaj nalog ovlašćuje blagajnu za isplatu, ali stanje blagajne se menja tek izvršenjem isplate.
```

Signature placeholders:

```text
Nalog izdao: ______________________
Blagajnik: ______________________
Primalac novca: ______________________
```

## Template 3 — Cash Event print

Title depends on event type:

```text
POTVRDA O ISPLATI
POTVRDA O UPLATI
BLAGAJNIČKI DOGAĐAJ
```

Fields:

1. Broj događaja,
2. Datum događaja,
3. Tip događaja,
4. Blagajna,
5. Valuta,
6. Smer,
7. Iznos,
8. Partner / primalac / lice,
9. Opis,
10. Povezani zahtev,
11. Povezani nalog,
12. Status,
13. Knjižio,
14. Vreme knjiženja,
15. Dokumenta.

Signature placeholders:

```text
Blagajnik: ______________________
Primalac / predavalac novca: ______________________
Kontrolisao: ______________________
```

## Template 4 — Shift handover print

Title:

```text
ZAPISNIK O PRIMOPREDAJI BLAGAJNE
```

Fields:

1. Broj smene,
2. Blagajna,
3. Otvorio,
4. Vreme otvaranja,
5. Početno stanje,
6. Predato korisniku,
7. Vreme primopredaje,
8. Obračunsko stanje,
9. Fizičko stanje,
10. Razlika,
11. Status,
12. Napomena,
13. Dokumenta.

Signature placeholders:

```text
Predao: ______________________
Primio: ______________________
Kontrolisao: ______________________
```

## Template 5 — Daily closing print

Title:

```text
DNEVNI ZAKLJUČAK BLAGAJNE
```

Fields:

1. Broj zaključka,
2. Datum,
3. Blagajna,
4. Valuta,
5. Početno stanje,
6. Ukupne uplate,
7. Ukupne isplate,
8. Obračunsko stanje,
9. Fizičko stanje,
10. Razlika,
11. Status,
12. Zaključio,
13. Vreme zaključka,
14. Napomena,
15. Dokumenta.

Include simple table of included cash events if available:

1. event_id,
2. event_type,
3. direction,
4. amount,
5. description,
6. status.

Signature placeholders:

```text
Blagajnik: ______________________
Kontrolisao: ______________________
Finansije: ______________________
```

## Template 6 — Printable report

Generic report template.

Title depends on report type.

Supported report titles:

1. Pregled nedostajućih dokumenata,
2. Presek stanja blagajni,
3. Nalozi koji čekaju isplatu,
4. Zahtevi za odobrenje,
5. Pregled dnevnih zaključaka,
6. Pregled razlika,
7. Pregled korekcija i storna.

## Desktop UI additions

In `desktop.html`, add print buttons where practical:

1. Print Payment Request,
2. Print Payment Order,
3. Print Cash Event,
4. Print Daily Closing,
5. Print current report.

If exact IDs are not available in current UI, add simple input fields:

```text
Unesi ID za štampu
```

and buttons.

## JavaScript requirements

In `scripts.html`, add helper functions:

1. `openPrintView(view, id)`
2. `openPrintReport(reportType)`
3. `printCurrentPage()`

Example behavior:

```javascript
window.open(baseUrl + '?view=print-payment-order&id=' + encodeURIComponent(orderId), '_blank');
```

Use existing Web App URL handling if available.

## Print CSS requirements

Create `print-styles.html`.

Rules:

1. A4 friendly.
2. Hide buttons in print.
3. Use simple tables.
4. Use strong section headings.
5. Avoid colored backgrounds as required information carrier.
6. Use black/white friendly layout.

CSS should include:

```css
@media print {
  .no-print {
    display: none !important;
  }
}
```

## Required documentation: create `docs/17_PRINTABLE_REPORTS_AND_TEMPLATES.md`

Document must include:

1. purpose of printable documents,
2. list of templates,
3. routes,
4. permission rules,
5. print layout rules,
6. optional PDF strategy,
7. browser print limitation,
8. no-write rule,
9. future improvements.

Include this exact statement:

```text
Štampani dokument je prikaz postojećeg zapisa iz sistema. Štampa ili PDF ne smeju da menjaju status zahteva, naloga, isplate, smene ili dnevnog zaključka.
```

## Required tests: update `docs/10_TEST_CASES.md`

Add manual tests for print views.

### Test 1: Print Payment Request

Expected:

1. route opens,
2. request data is shown,
3. signatures are visible,
4. no business data is changed.

### Test 2: Print Payment Order

Expected:

1. route opens,
2. order data is shown,
3. note about order not changing balance is visible,
4. no cash event is created.

### Test 3: Print Cash Event

Expected:

1. route opens,
2. event data is shown,
3. linked order/request shown if available,
4. no data is changed.

### Test 4: Print Shift Handover

Expected:

1. route opens,
2. balances are shown,
3. signatures are visible,
4. no shift status changes.

### Test 5: Print Daily Closing

Expected:

1. route opens,
2. totals and difference shown,
3. included events shown if implemented,
4. no events are modified.

### Test 6: Print Missing Documents Report

Expected:

1. route opens,
2. missing document rows appear,
3. no data changes.

### Test 7: Browser Save as PDF

Expected:

1. user can use browser print,
2. layout is readable on A4.

### Test 8: Unauthorized print access

Expected:

1. unauthorized user cannot print protected record,
2. clear error is shown.

## Do not do these things in this task

1. Do not change statuses from print views.
2. Do not create cash events from print views.
3. Do not approve requests from print views.
4. Do not issue payment orders from print views.
5. Do not lock daily closing from print views.
6. Do not use external PDF services.
7. Do not use paid dependencies.
8. Do not add digital signature unless explicitly requested.
9. Do not implement OCR.
10. Do not integrate with ERP.

## Expected response after completion

After completing this task, report:

1. files created,
2. files updated,
3. print routes implemented,
4. templates implemented,
5. PDF generation status,
6. manual test steps,
7. limitations,
8. next recommended task.

## Recommended next task after this

Next task should be:

```text
Task 14 — Production readiness cleanup and pilot rollout
```

Task 14 should implement:

1. cleanup of TODOs,
2. configuration review,
3. pilot user setup,
4. pilot data checklist,
5. backup/export procedure,
6. operational SOP for users,
7. known issue list,
8. go-live checklist.
