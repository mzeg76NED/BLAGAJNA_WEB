# Printable Reports and Document Templates

## Svrha

Task 13 dodaje HTML prikaze za štampu i browser opciju `Save as PDF`.

Štampani dokument je prikaz postojećeg zapisa iz sistema. Štampa ili PDF ne smeju da menjaju status zahteva, naloga, isplate, smene ili dnevnog zaključka.

## Pravila

1. Print prikazi su isključivo read-only.
2. Print prikazi ne kreiraju Payment Request, Payment Order ili Cash Payment Event.
3. Print prikazi ne menjaju statuse.
4. Print prikazi ne knjiže isplate.
5. Print prikazi ne menjaju stanje blagajne.
6. Print prikazi ne upisuju audit log.
7. PDF se pravi kroz browser komandu `Print` / `Save as PDF`.

## Print rute

Podržane su sledeće rute:

```text
?view=print-payment-request&id=REQ-...
?view=print-payment-order&id=ORD-...
?view=print-cash-event&id=CEV-...
?view=print-shift-handover&id=SHF-...
?view=print-daily-closing&id=CLS-...
?view=print-report&type=missing-documents
?view=print-report&type=cashbox-balance
```

Dodatni report tipovi su:

```text
orders-waiting-payment
requests-for-approval
daily-closing
differences
corrections-reversals
```

## Šabloni

Svaki šablon sadrži:

1. naziv sistema `BLAGAJNA WEB`,
2. tekst `Interni dokument blagajničkog poslovanja`,
3. liniju kompanije `Industrija Mesa Nedeljković doo`,
4. osnovne podatke o izvornom zapisu,
5. povezane dokumente,
6. vreme generisanja,
7. korisnika koji je otvorio prikaz,
8. napomenu da je izvorni zapis u sistemu.

## PDF

Server-side PDF generisanje nije implementirano u ovom tasku.

Funkcija `generatePrintablePdf(viewType, idOrFilters)` postoji kao placeholder i baca grešku:

```text
PDF generation is not implemented in Task 13. Use browser print or Save as PDF.
```

Operativni način rada je:

1. Otvoriti print rutu.
2. Kliknuti `Štampaj / Sačuvaj kao PDF`.
3. U browser dijalogu izabrati štampač ili `Save as PDF`.

## Desktop UI

Desktop prikaz ima sekciju `Štampa i PDF` u okviru izveštaja.

Korisnik unosi ID izvornog zapisa i otvara odgovarajući print prikaz u novom tabu. Za izveštaje se koriste postojeći filteri iz forme izveštaja.
