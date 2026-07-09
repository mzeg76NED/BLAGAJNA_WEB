# FAZA 0 - Workflow Inventory

Datum: 2026-07-09  
Status: IN PROGRESS  
Izvor: staticka analiza `src/*.gs`, `src/html/*.html`, postojece dokumentacije.

## 1. Prijava korisnika

Pocetak: korisnik ima Google Workspace sesiju i otvara desktop UI.  
Akcija: unos `user_code` + PIN.  
Backend: `apiLoginAppUser -> loginAppUser`.  
Validacije:

- korisnicki kod postoji,
- korisnik je aktivan,
- nalog nije zakljucan,
- PIN je postavljen,
- PIN hash se poklapa.

Promena podataka:

- kreira se red u `APP_SESSIONS`,
- azurira se `USERS.last_login_at`, `last_google_session_email`, `failed_login_count`.

Audit: `APP_USER_LOGIN`, `APP_USER_LOGIN_FAILED`.  
Novi status: aktivna app session.  
Sporedni efekti: frontend cuva samo `session_id` u `sessionStorage`.

## 2. Izbor blagajne

Pocetak: app session postoji.  
Akcija: korisnik bira blagajnu ili koristi default.  
Backend: `apiGetUiBootstrap`, `listCashboxes`, `assertCashboxAccess`.  
Validacije:

- blagajna aktivna,
- korisnik ima pristup blagajni,
- za cashier rolu default blagajna je ogranicavajuca.

Promena podataka: uglavnom ne, osim session/context update ako se uvede kasnije.  
Audit: nije uvek poseban dogadjaj u trenutnom modelu.

## 3. Otvaranje smene

Pocetak: nema otvorene smene za blagajnu.  
Akcija: `apiOpenShift` ili `apiOpenShiftWithOpeningCount`.  
Potrebna privilegija: `shifts:open`.  
Validacije:

- korisnik aktivan,
- rola/privilegija za smenu,
- cashbox aktivan,
- nema druge otvorene smene.

Promena podataka:

- novi `SHIFTS` red sa statusom `OPEN`,
- opcionalno `CASH_COUNTS` za pocetni popis.

Audit: `CREATE`, eventualno `POST` za count.  
Sporedni efekti: smena postaje uslov za operativne cash write akcije.

## 4. Presek smene / blagajne

Pocetak: aktivna smena ili dozvoljen opening count.  
Akcija: `apiCreateCashCount` / `apiCreateCashCounts`.  
Potrebna privilegija: `shifts:count`.  
Validacije:

- aktivna blagajna,
- aktivna valuta,
- apoeni i iznosi nenegativni,
- korisnik ima pravo i smenski kontekst.

Promena podataka:

- `CASH_COUNTS` red,
- ako postoji razlika, automatski `CASH_EVENTS` tip `CORRECTION`.

Novi status: `CASH_COUNTS.POSTED`.  
Audit: `CREATE` / `POST`.  
Sporedni efekti: korekcija utice na saldo samo kroz posted cash event.

## 5. Zatvaranje ili primopredaja smene

Pocetak: `SHIFTS.status = OPEN`.  
Akcije:

- `apiHandoverShift`
- `apiCloseShift`
- `apiCloseShiftWithLatestCashCounts`
- `apiCloseShiftWithClosingCount`
- `apiCloseActiveShift`

Potrebna privilegija: `shifts:close`.  
Validacije:

- smena postoji,
- korisnik je vlasnik smene ili ima elevated pravo,
- fizicki balans validan,
- status dozvoljava zatvaranje/primopredaju.

Promena podataka:

- `SHIFTS` dobija closing/handover polja,
- status prelazi u `HANDED_OVER`, `CLOSED` ili `CLOSED_WITH_DIFFERENCE`,
- opcionalno se kreiraju closing `CASH_COUNTS`.

Audit: `UPDATE`, `LOCK` ili povezani audit iz helpera.

## 6. Uplata

Pocetak: aktivna smena i cashbox.  
Akcija: `apiCreateCashInflow`.  
Potrebna privilegija: `cash_events:create`.  
Validacije:

- rola moze da kreira cash event,
- cashbox aktivan i dostupan,
- valuta aktivna,
- iznos pozitivan,
- korisnik ima aktivnu smenu za cashbox.

Promena podataka:

- novi `CASH_EVENTS` sa `event_type = CASH_INFLOW`, `direction = IN`, `status = POSTED`.

Audit: `POST`.  
Saldo: povecava se samo preko posted cash event-a.

## 7. Isplata po nalogu

Pocetak: Payment Order validan i poslat blagajniku, postoji pending `CASH_OUTFLOW` u `SUBMITTED`.  
Akcija: `apiExecutePendingPaymentOrderOutflow` ili legacy wrapper `apiExecutePaymentOrder`.  
Potrebna privilegija: `payment_orders:execute`.  
Validacije:

- pending event postoji,
- pending event je `CASH_OUTFLOW`,
- order je `WAITING_PAYMENT` ili `PARTIALLY_PAID`,
- iznos ne prelazi preostali iznos,
- valuta i cashbox se poklapaju sa nalogom,
- aktivna smena postoji,
- saldo je dovoljan.

Promena podataka:

- pending `CASH_EVENTS` prelazi u `POSTED`,
- `PAYMENT_ORDERS.amount_paid` se uvecava,
- order status prelazi u `PAID` ili `PARTIALLY_PAID`.

Audit: `POST` za event, `UPDATE` za order.  
Sporedni efekti: saldo se smanjuje kroz posted `CASH_OUTFLOW`.

## 8. Trezor

Pocetak: aktivna smena.  
Akcija: `apiCreateTreasuryHandover`.  
Potrebna privilegija: `cash_events:create`.  
Validacije:

- cashbox,
- valuta,
- iznos,
- smena,
- saldo ako je OUT.

Promena podataka: `CASH_EVENTS` tip `TREASURY_HANDOVER`.  
Audit: `POST`.

## 9. Nalog za isplatu

Pocetak: direktan unos ili odobren zahtev.  
Akcije:

- `apiCreateDirectPaymentOrder`
- `apiCreatePaymentOrderFromRequest`
- `apiIssuePaymentOrder`
- `apiSendPaymentOrderToCashier`
- `apiRejectPaymentOrderByCashier`

Potrebne privilegije:

- `payment_orders:create`
- `payment_orders:issue`
- `payment_orders:reject`

Validacije:

- obavezna polja,
- iznos pozitivan,
- valuta aktivna,
- cashbox aktivan,
- status dozvoljava prelaz,
- nema aktivnog duplog naloga za isti zahtev.

Promena podataka:

- `PAYMENT_ORDERS`,
- kod naloga iz zahteva azurira se `PAYMENT_REQUESTS.linked_order_id`,
- kod slanja blagajniku kreira/koristi pending `CASH_OUTFLOW`.

Audit: `CREATE`, `UPDATE`, `SUBMIT` ili odgovarajuci komentar.

## 10. Zahtev za isplatu

Pocetak: korisnik unosi zahtev.  
Akcije:

- `apiCreatePaymentRequest`
- `apiSubmitPaymentRequest`
- `apiUpdatePaymentRequest`
- `apiApprovePaymentRequest`
- `apiApproveAndIssuePaymentOrder`
- `apiRejectPaymentRequest`
- `apiReturnPaymentRequestForCorrection`

Potrebne privilegije:

- `payment_requests:create`
- `payment_requests:approve`
- `payment_requests:reject`
- `payment_requests:return_for_correction`

Validacije:

- obavezna polja,
- vlasnistvo ili ovlascenje,
- pozitivan iznos,
- statusni prelazi,
- limit/approval path.

Promena podataka: `PAYMENT_REQUESTS`, eventualno povezani `PAYMENT_ORDERS`.  
Audit: `CREATE`, `SUBMIT`, `APPROVE`, `REJECT`, `UPDATE`.  
Kriticno: zahtev nikada ne sme direktno promeniti saldo.

## 11. Dokumenti

Pocetak: postoji poslovni entitet.  
Akcija: `apiAttachDocumentToEntity`, `apiListDocumentsForEntity`.  
Privilegije: `documents:attach`, `documents:view`.  
Validacije:

- entity type validan,
- entity postoji,
- korisnik ima vidljivost/pravo,
- file payload validan.

Promena podataka:

- Google Drive fajl,
- `DOCUMENTS` metadata,
- `document_status` na povezanoj tabeli.

Audit: upload/cancel/replace kroz document helpers.

## 12. Audit

Pocetak: bitna poslovna akcija.  
Akcija: `writeAuditLog`.  
Promena podataka: append-only `AUDIT_LOG`.  
Kriticno:

- audit mora nositi app user kontekst ako API ide kroz session gating,
- audit se ne brise i ne menja kroz poslovne funkcije.

## 13. Korisnici i prava

Pocetak: ADMIN ili korisnik sa odgovarajucom privilegijom.  
Akcije:

- `apiListUsers`
- `apiCreateUser`
- `apiUpdateUserPermissions`
- `apiResetUserPin`
- `apiGetRolePermissionsMatrix`
- `apiUpdateRolePermissions`

Privilegije:

- `users:create`
- `users:update`
- `users:disable`
- `users:assign_roles`
- `audit:view` za neke matrice/preglede

Validacije:

- email format,
- PIN pravila,
- ne ukloniti poslednjeg aktivnog admina,
- role i permission matrica.

Promena podataka: `USERS`, `ROLES`, `PERMISSIONS`, `ROLE_PERMISSIONS`, audit.

