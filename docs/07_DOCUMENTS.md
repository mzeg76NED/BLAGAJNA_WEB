# Documents

## Svrha

Dokumenti su poslovni dokazi povezani sa zahtevima, nalozima, blagajnickim dogadjajima, smenama i dnevnim zakljuccima.

Dokument se ne čuva kao podatak u tabeli. Fajl se čuva u Google Drive-u, a u tabeli DOCUMENTS čuvaju se metapodaci i veza ka poslovnom događaju.

## Podrzani tipovi entiteta

Dokument moze biti povezan sa:

| Entity type | Sheet | ID field |
|---|---|---|
| PAYMENT_REQUEST | PAYMENT_REQUESTS | request_id |
| PAYMENT_ORDER | PAYMENT_ORDERS | order_id |
| CASH_EVENT | CASH_EVENTS | event_id |
| SHIFT | SHIFTS | shift_id |
| DAILY_CLOSING | DAILY_CLOSING | closing_id |

## Pravilo skladistenja

Fajl se cuva u Google Drive-u. Google Sheets baza cuva samo:

- `document_id`
- `entity_type`
- `entity_id`
- `file_name`
- `file_id`
- `file_url`
- `mime_type`
- `uploaded_by`
- `created_at`
- `status`
- `note`

Binary sadrzaj fajla se ne cuva u Google Sheets.

## Google Drive folder strategija

Koristi se konfiguracija:

```javascript
const DOCUMENT_ROOT_FOLDER_ID = '';
const DOCUMENT_ROOT_FOLDER_NAME = 'BLAGAJNA_WEB_DOCUMENTS';
```

Ako je `DOCUMENT_ROOT_FOLDER_ID` prazan, sistem pronalazi ili kreira root folder `BLAGAJNA_WEB_DOCUMENTS`.

U Task 06 implementirana je jednostavna folder struktura:

```text
BLAGAJNA_WEB_DOCUMENTS/
  PAYMENT_REQUEST/
  PAYMENT_ORDER/
  CASH_EVENT/
  SHIFT/
  DAILY_CLOSING/
```

Godisnja/mesecna/dnevna folder struktura je preporucena za kasnije, ali nije implementirana u ovom tasku.

## DOCUMENTS tabela

| Field | Required | Notes |
|---|---:|---|
| document_id | yes | Generisani ID |
| created_at | yes | Vreme upload-a |
| uploaded_by | yes | Korisnik koji je uploadovao dokument |
| entity_type | yes | PAYMENT_REQUEST, PAYMENT_ORDER, CASH_EVENT, SHIFT, DAILY_CLOSING |
| entity_id | yes | ID povezanog entiteta |
| file_name | yes | Originalni ili generisani naziv fajla |
| file_id | yes | Google Drive file ID |
| file_url | yes | Google Drive link |
| mime_type | no | MIME tip fajla |
| status | yes | ACTIVE, REPLACED, CANCELLED |
| note | no | Napomena |

## Statusi dokumenata

| Status | Znacenje |
|---|---|
| ACTIVE | Dokument je aktivan dokaz |
| REPLACED | Dokument je zamenjen novim dokumentom |
| CANCELLED | Dokument je otkazan, ali nije fizicki obrisan |

Drive fajl se u Task 06 ne brise ni kod otkazivanja ni kod zamene.

## Status povezanog entiteta

Entiteti koji imaju kolonu `document_status` koriste:

| Status | Znacenje |
|---|---|
| NONE | Nema dokumenta i dokument trenutno nije oznacen kao obavezan |
| MISSING | Dokument se ocekuje, ali nije aktivno povezan |
| ATTACHED | Postoji najmanje jedan aktivan dokument |

Kada se dokument uspesno doda, povezani entitet dobija `document_status = ATTACHED` ako ta kolona postoji.

Ako se aktivan dokument otkaze i nema drugih aktivnih dokumenata:

- PAYMENT_ORDER i CASH_EVENT dobijaju `MISSING`,
- ostali entiteti dobijaju `NONE`.

SHIFT i DAILY_CLOSING u pocetnom modelu nemaju `document_status`, pa se njihovo stanje ne azurira u ovom tasku.

## Upload workflow

`attachDocumentToEntity(entityType, entityId, filePayload, note)`:

1. proverava aktivnog korisnika,
2. proverava rolu,
3. proverava `entityType`,
4. proverava da povezani entitet postoji,
5. validira file payload,
6. uploaduje fajl u Google Drive,
7. dodaje red u `DOCUMENTS`,
8. azurira `document_status` povezanog entiteta na `ATTACHED`,
9. upisuje audit log `CREATE`.

Ocekivani `filePayload`:

```javascript
{
  fileName: 'racun.pdf',
  mimeType: 'application/pdf',
  base64Data: '...'
}
```

Ako `mimeType` nije poslat, koristi se `application/octet-stream`.

## Cancel workflow

`cancelDocument(documentId, reason)`:

1. proverava da dokument postoji,
2. zahteva razlog,
3. dozvoljava samo elevated role,
4. postavlja `status = CANCELLED`,
5. ne brise Drive fajl,
6. azurira `document_status` povezanog entiteta prema aktivnim dokumentima,
7. upisuje audit log `CANCEL`.

## Replacement workflow

`replaceDocument(documentId, filePayload, note)` je implementiran u Task 06:

1. stari dokument dobija `status = REPLACED`,
2. novi fajl se uploaduje u Drive,
3. kreira se novi `ACTIVE` red u `DOCUMENTS`,
4. novi dokument ostaje povezan sa istim entitetom,
5. stari Drive fajl se ne brise,
6. audit log belezi `UPDATE` za stari dokument i `CREATE` za novi.

## Audit pravila

| Akcija | Audit action |
|---|---|
| Dodavanje dokumenta | CREATE |
| Otkazivanje dokumenta | CANCEL |
| Zamena starog dokumenta | UPDATE |
| Novi dokument u zameni | CREATE |

Audit log se ne menja i ne brise kroz poslovne funkcije.

## Primeri

Dodavanje dokumenta na zahtev:

```javascript
attachDocumentToEntity('PAYMENT_REQUEST', requestId, {
  fileName: 'zahtev.pdf',
  mimeType: 'application/pdf',
  base64Data: '...'
}, 'Prilog zahteva');
```

Dodavanje dokumenta na nalog:

```javascript
attachDocumentToEntity('PAYMENT_ORDER', orderId, {
  fileName: 'nalog.pdf',
  mimeType: 'application/pdf',
  base64Data: '...'
}, 'Potpisan nalog');
```

Lista dokumenata:

```javascript
listDocumentsForEntity('PAYMENT_ORDER', orderId);
```

Lista aktivnih dokumenata:

```javascript
listActiveDocumentsForEntity('PAYMENT_ORDER', orderId);
```

Otkazivanje dokumenta:

```javascript
cancelDocument(documentId, 'Pogresan fajl.');
```

Zamena dokumenta:

```javascript
replaceDocument(documentId, {
  fileName: 'novi-racun.pdf',
  mimeType: 'application/pdf',
  base64Data: '...'
}, 'Ispravna verzija dokumenta');
```
