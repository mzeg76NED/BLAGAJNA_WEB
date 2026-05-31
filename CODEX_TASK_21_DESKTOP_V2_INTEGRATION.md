# CODEX TASK 21 — Desktop v2 UI: integracija i pokretanje

> **Datum kreiranja:** 2026-05-31  
> **Autor analize:** Claude (Cowork sesija)  
> **Status:** Integrisano u Apps Script deployment @36; čeka ručni browser test korisnika

---

## 1. Šta je urađeno (van Codexa)

Dodat je kompletno novi desktop korisnički interfejs kao **alternativa** postojećem, bez ikakve izmene postojećeg koda osim jedne linije u `WebApp.gs`.

### 1.1 Novi fajlovi

| Fajl | Linija | Opis |
|---|---|---|
| `src/html/desktop-v2.html` | 651 | Novi desktop HTML template |
| `src/html/styles-v2.html` | 279 | CSS za novi UI (scope-ovan na `.dv2-shell`) |
| `src/html/scripts-v2.html` | 915 | Standalone JS — sopstveni `v2CallApi()`, sva UI logika |

### 1.2 Izmenjeni fajlovi

| Fajl | Izmena |
|---|---|
| `src/WebApp.gs` | Dodat `'desktop-v2'` u `allowedViews` niz u `doGet()` |

### 1.3 Arhitektura — ključne odluke

**Novi UI je 100% aditivan:**
- Stari `desktop.html`, `mobile.html`, `scripts.html`, `styles.html` su **netaknuti**
- `scripts-v2.html` ne include-uje stari `scripts.html` — standalone je
- CSS klasa `.dv2-shell` umesto `.d-shell` sprečava bilo kakav konflikt sa logikom u `scripts.html`
- Isti backend (`WebApp.gs`) — svi API pozivi su identični

**URL routing:**
- Stari UI: `?view=desktop` (nepromenjeno)
- Novi UI: `?view=desktop-v2` (novo)

---

## 2. Šta novi UI podržava

### 2.1 Navigacija (8 sekcija)

| Sekcija | ID | Šta radi |
|---|---|---|
| Blagajnička knjiga | `dv2-section-knjiga` | Tabela cash evenata + quick form + detail panel |
| Blagajnički list | `dv2-section-blagajnicki-list` | Štampa blagajničkog lista po ID-u |
| Nalozi za isplatu | `dv2-section-nalozi` | Lista naloga + detail panel + izvršenje/odbijanje |
| Zahtevi | `dv2-section-zahtevi` | Lista zahteva + detail panel + odobri/odbij/nalog |
| Smene | `dv2-section-smena` | Otvaranje, zatvaranje, primopredaja, presek |
| Dnevni zaključak | `dv2-section-zakljucak` | Pripremi + zaključi dan |
| Izveštaji | `dv2-section-izvestaji` | 10 report funkcija sa inline prikazom tabele |
| Audit log | `dv2-section-audit` | Sve audit akcije |

### 2.2 Topbar KPI (uvek vidljivi)

- Stanje blagajne (live, osvežava se svakih 30s)
- Broj naloga koji čekaju isplatu
- Status aktivne smene
- Promet danas — IN i OUT iz knjige

### 2.3 Urgent alert

Element `#v2-urgent-kpi` u topbaru — prikazuje se kada postoje nalozi u statusu `WAITING_PAYMENT` ili `PARTIALLY_PAID`. Klik vodi na sekciju Nalozi.

### 2.4 Quick form (knjiga sidebar)

- Toggle Uplata / Isplata
- Poziva `apiCreateCashInflow` ili `apiCreateDirectCashOutflow`
- Prikazuje se samo kad korisnik ima `canPostDirectCashEvents === true`
- Ako nema aktivne smene, prikazuje se `#v2-permission-card` sa uputom

### 2.5 Detail panel (knjiga)

- Otvara se klikom na red u tabeli
- Prikazuje sve podatke cash eventa
- Print dugme → otvara `?view=print-cash-event&id=...`
- Storno dugme → `apiReverseCashEvent` sa prompt-om za razlog

### 2.6 Status bedževi u bojama

```
POSTED/APPROVED/PAID → zelena    SUBMITTED → plava
WAITING/PARTIALLY/IN_REVIEW → žuta    REJECTED/CANCELLED → crvena
LOCKED/CLOSED → siva    URGENT → crvena
```

### 2.7 Upravljanje smenom

- Otvori: `apiOpenShift`
- Presek: `apiGetActiveShiftBalance`
- Primopredaja: `apiHandoverShift` (sa email poljem za primaoca)
- Zatvori: `apiCloseActiveShift` (sa fizičkim stanjem po valutama)

### 2.8 API pozivi koji se koriste (svi potvrđeni u WebApp.gs)

```
apiGetUiBootstrap               apiCalculateCashboxBalance
apiGetCashMovementsReport       apiListOrdersWaitingForPayment
apiListRequestsForApproval      apiListMyPaymentRequests
apiApprovePaymentRequest        apiApproveAndIssuePaymentOrder
apiRejectPaymentRequest         apiExecutePaymentOrder
apiRejectPaymentOrderByCashier  apiReverseCashEvent
apiCreateCashInflow             apiCreateDirectCashOutflow
apiOpenShift                    apiCloseActiveShift
apiHandoverShift                apiGetActiveShiftBalance
apiGetActiveShiftState          apiGetMyActiveShifts
apiPrepareDailyClosing          apiCloseDailyCashbox
apiGetAuditLog
+ 10 report API funkcija (sve iz Reports.gs)
```

---

## 3. Šta Codex treba da uradi

### 3.1 OBAVEZNO — clasp push i test

```powershell
cd C:\Users\milan\source\repos\BLAGAJNA_WEB
clasp push
```

Ako push prođe bez grešaka, otvori Web App URL sa `?view=desktop-v2` i provjeri:

- [ ] Aplikacija se učitava (nema JS konzolnih grešaka)
- [ ] Bootstrap se poziva (`apiGetUiBootstrap` vraća podatke)
- [ ] Saldo se prikazuje u topbaru
- [ ] Knjiga se učitava (redovi su u tabeli)
- [ ] Navigacija funkcioniše (klik na sidebar stavke)
- [ ] Urgent alert se prikazuje/skriva ispravno
- [ ] Quick form radi (uplata/isplata)
- [ ] Detail panel se otvara klikom na red

Codex napomena 2026-05-31:
- `clasp push --force` je uspešno izvršen.
- Novi deployment je kreiran kao verzija `@36`.
- Stabilni deployment `AKfycbwpcDvFbbyTsKUEULCXIXqmhXUBp06bDkdp-hu64wbHTqMx6a8mEx6vJdYx3AGv1w794A` je ažuriran na `@36`.
- `scripts.html` i `scripts-v2.html` prolaze lokalnu JS syntax proveru.
- `git diff --check` prolazi bez grešaka.

### 3.2 OBAVEZNO — Ispraviti 3 poznata ID mismatch-a u starom `desktop.html`

Status: urađeno.

Ovo su bugovi koji postoje u **starom** UI-u (ne u v2), ali ih treba popraviti jer stariji UI ostaje u produkciji.

#### Bug 1: Detail panel zahteva ne radi

U `scripts.html` (linije 1626, 1649):
```js
// Traži:
document.getElementById('request-detail-panel')
document.getElementById('detail-panel-body')
// Ali desktop.html ima:
id="d-request-detail-panel"
id="d-rdp-body"
```

**Fix u `scripts.html`** — zamijeni u funkcijama `showRequestDetailPanel` i `closeRequestDetailPanel`:
```js
// Staro:
var panel = document.getElementById('request-detail-panel');
var body = document.getElementById('detail-panel-body');
// Novo:
var panel = document.getElementById('d-request-detail-panel');
var body = document.getElementById('d-rdp-body');
```

I za close dugme (linija 184):
```js
// Staro:
bindClick('close-detail-panel-btn', closeRequestDetailPanel);
// Novo:
bindClick('d-rdp-close', closeRequestDetailPanel);
```

#### Bug 2: Urgent alert element nedostaje

`scripts.html` ima logiku za `refreshUrgentAlert()` koja traži `#urgent-alert` i `#urgent-alert-title`, ali ti elementi ne postoje ni u `mobile.html` ni u `desktop.html`.

**Fix — dodati u `desktop.html`** (ispod `<div id="d-message"...>`):
```html
<div id="urgent-alert" style="display:none;background:#7f1d1d;color:#fca5a5;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;align-items:center;gap:8px">
  <i class="ti ti-alert-triangle"></i>
  <span id="urgent-alert-title">Nalozi čekaju izvršenje</span>
</div>
```

#### Bug 3: execute-payment-form-card nedostaje

`scripts.html` linija 929/937 traži `#execute-payment-form-card` koji ne postoji u `desktop.html`. Funkcija `selectOrderForExecution` ne radi ispravno.

**Fix — dodati u `desktop.html`** u sekciji nalozi, ispod forme za izvršenje:
```html
<div id="execute-payment-form-card" style="display:none">
  <!-- ovo je wrapper koji scripts.html show/hide-uje -->
</div>
```

### 3.3 PREPORUČENO — LockService u createPaymentOrderFromRequest

Status: već postoji u trenutnoj funkciji; nije bila potrebna dodatna izmena.

Postoji race condition: dva simultana zahteva mogu kreirati dupli nalog za isti zahtev.

**Fajl:** `src/PaymentOrders.gs`  
**Funkcija:** `createPaymentOrderFromRequest`  
**Fix:** Dodati `LockService.getScriptLock()` wrap, identično kao u `executePaymentOrder`:

```js
function createPaymentOrderFromRequest(requestId, orderData) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // ... postojeći kod ...
  } finally {
    lock.releaseLock();
  }
}
```

### 3.4 PREPORUČENO — index.html: dodati link na novi UI

Status: urađeno.

U `src/html/index.html` dodati treće dugme pored "Mobilni prikaz" i "Desktop prikaz":

```html
<a href="?view=desktop-v2" class="...">Novi desktop (v2)</a>
```

### 3.5 OPCIONALNO — createCashTransfer implementacija

`CashEvents.gs` ima stub koji baca grešku:
```js
function createCashTransfer(...) {
  throw new Error('Not implemented in Task 05');
}
```

Implementirati kao atomsku operaciju: `CASH_TRANSFER_OUT` iz izvorne blagajne + `CASH_TRANSFER_IN` u odredišnu, unutar jednog `LockService` bloka. Oba eventa se kreiraju ili nijedan.

---

## 4. Testni scenario za verifikaciju v2 UI-a

Izvršiti ovim redosledom u browseru (`?view=desktop-v2`):

1. **Bootstrap** — provjeri da se korisnik i blagajna prikazuju u sidebaru
2. **Knjiga** — provjeri da se redovi učitavaju, klikni na red → detail panel
3. **Quick form** — unesi uplatu, provjeri da se pojavi u knjizi
4. **Nalozi** — klikni na nalog, provjeri detail panel, izvrši isplatu
5. **Zahtevi** — klikni na zahtev, odobri → provjeri da se kreira nalog
6. **Smena** — otvori smenu, provjeri presek, zatvori smenu
7. **Zaključak** — pripremi zaključak, provjeri preview, zaključi dan
8. **Izveštaji** — klikni "Prikaži" za "Stanje blagajne"
9. **Audit log** — klikni refresh, provjeri da su akcije iz testa vidljive
10. **Dark mode** — toggle u topbaru desno, provjeri vizuelno

---

## 5. Poznate limitacije v2 UI-a (svjesne odluke)

| Limitacija | Razlog |
|---|---|
| Cash count (prebrojavanje apoena) nije u v2 | Kompleksna forma, dodati u sledećem tasku |
| Document upload nije u v2 | Zahteva poseban flow, dodati u sledećem tasku |
| Korekcioni unos nije u v2 | Rezervisan za FINANCE rolu, dodati u sledećem tasku |
| Mobile v2 nije uradjen | Biće uradjen u sledećem tasku |
| Live refresh je na 30s (v2) vs 15s (stari UI) | Manje opterećenje GAS kvote |

---

## 6. Struktura fajlova posle ovog taska

```
src/
├── WebApp.gs                    ← +1 linija (desktop-v2 u allowedViews)
├── html/
│   ├── desktop.html             ← NEPROMENJENO
│   ├── mobile.html              ← NEPROMENJENO
│   ├── styles.html              ← NEPROMENJENO
│   ├── scripts.html             ← NEPROMENJENO (bugfix u tački 3.2 preporučen)
│   ├── desktop-v2.html          ← NOVO (651 linija)
│   ├── styles-v2.html           ← NOVO (279 linija)
│   └── scripts-v2.html          ← NOVO (915 linija)
│   └── index.html               ← opcioni update (tačka 3.4)
└── ... (sve ostalo nepromenjeno)
```

---

## 7. Git commit poruke (predlog)

```
feat(ui): add desktop-v2 alternative UI

- New desktop UI accessible via ?view=desktop-v2
- Standalone styles-v2.html and scripts-v2.html (no conflict with existing)
- All 23 API calls verified against WebApp.gs
- Old UI completely untouched
- WebApp.gs: add 'desktop-v2' to allowedViews
```

Za bugfixe iz tačke 3.2:
```
fix(ui): correct ID mismatches in desktop.html

- request-detail-panel → d-request-detail-panel
- detail-panel-body → d-rdp-body
- close-detail-panel-btn → d-rdp-close
- add urgent-alert element to desktop.html
```
