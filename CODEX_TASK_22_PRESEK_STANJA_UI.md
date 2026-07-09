# CODEX TASK 22 — Presek stanja: novi UI (kombinacija tabele i apoena)

> **Datum:** 2026-06-02  
> **Status:** Spreman za implementaciju  
> **Scope:** Nova sekcija `dv2-section-presek` u `desktop-v2.html` + novi backend API + JS u `scripts-v2.html` + CSS u `styles-v2.html`

---

## 1. Cilj

Zameniti postojeći prikaz preseka stanja (koji je trenutno samo dugme "Presek aktivne smene" u sekciji Smena) sa dedikovanom, punom stranicom za pregled svih preseka blagajne.

Dizajn kombinuje:
- **Tabelu grupisanu po smenama** (smena je header sekcija, preseci su redovi ispod nje)
- **Proširive redove** — klik na red otkriva detalje sa apoenima po valutama
- **Pill prikaz apoena** — svaki apoen je vizuelna kartica sa iznosom, brojem komada i ukupnom vrednošću

---

## 2. Fajlovi koje treba izmeniti

| Fajl | Tip izmene |
|---|---|
| `src/WebApp.gs` | Dodati novu funkciju `apiListCashCounts` |
| `src/html/desktop-v2.html` | Dodati navigacioni link + HTML sekciju `dv2-section-presek` |
| `src/html/styles-v2.html` | Dodati CSS za novu sekciju (scope `.ps-*` prefiksi) |
| `src/html/scripts-v2.html` | Dodati JS logiku za učitavanje, renderovanje i proširivanje redova |

**Ne diraj:** `scripts.html`, `styles.html`, `mobile.html`, `desktop.html`, ni jedan `.gs` fajl sem `WebApp.gs`.

---

## 3. Izmena `WebApp.gs`

Dodati novu funkciju **odmah iza** `apiGetCashCountsReport` (linija ~389):

```javascript
function apiListCashCounts(filters) {
  return apiWrap_(function() {
    requireActiveUserWithRole_([
      USER_ROLES.CASHIER,
      USER_ROLES.CASHIER_SUPERVISOR,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
      USER_ROLES.DIRECTOR
    ]);
    filters = filters || {};
    var records = listRecords(SHEET_NAMES.CASH_COUNTS);
    if (filters.cashbox_id) {
      records = records.filter(function(r) { return r.cashbox_id === filters.cashbox_id; });
    }
    if (filters.shift_id) {
      records = records.filter(function(r) { return r.shift_id === filters.shift_id; });
    }
    if (filters.currency) {
      records = records.filter(function(r) { return r.currency === filters.currency; });
    }
    return records
      .sort(function(a, b) {
        return toTime_(b.created_at) - toTime_(a.created_at);
      })
      .slice(0, filters.limit || 200)
      .map(function(r) {
        var parsed = [];
        try { parsed = JSON.parse(r.denominations_json || '[]'); } catch(e) {}
        return {
          count_id:                  r.count_id,
          created_at:                r.created_at,
          posted_at:                 r.posted_at || r.created_at,
          created_by:                r.created_by,
          posted_by:                 r.posted_by || r.created_by,
          count_type:                r.count_type,
          cashbox_id:                r.cashbox_id,
          shift_id:                  r.shift_id || '',
          currency:                  r.currency,
          counted_cash_total:        Number(r.counted_cash_total || 0),
          calculated_balance_before: Number(r.calculated_balance_before || 0),
          difference:                Number(r.difference || 0),
          denominations:             parsed,
          adjustment_event_id:       r.adjustment_event_id || '',
          note:                      r.note || '',
          status:                    r.status
        };
      });
  });
}
```

Napomena: `toTime_` je privatna helpera funkcija dostupna u globalnom GAS scope-u — ne uvoziti je.

---

## 4. Izmena `desktop-v2.html`

### 4.1 Navigacioni link

U levom sidebaru, u sekciji **Upravljanje** (tamo gdje je već `<div class="dv2-nav-item" data-v2-nav="smena">`), dodati novi nav item:

```html
<div class="dv2-nav-item" data-v2-nav="presek" role="button" tabindex="0">
  <i class="ti ti-scale" aria-hidden="true"></i> Presek stanja
</div>
```

Dodati ga odmah **iza** nav itema za Smenu.

### 4.2 HTML sekcija

Dodati sledeći blok odmah iza zatvarajućeg `</div>` sekcije `dv2-section-smena`:

```html
<!-- ═══ PRESEK STANJA ═══ -->
<div id="dv2-section-presek" class="dv2-section">

  <!-- Toolbar -->
  <div class="ps-toolbar">
    <div class="ps-toolbar-title">
      <i class="ti ti-scale" aria-hidden="true"></i>
      Presek stanja — popis blagajne
    </div>
    <div class="ps-toolbar-actions">
      <select class="v2-select ps-filter-currency" id="ps-filter-currency">
        <option value="">Sve valute</option>
        <option value="RSD">RSD</option>
        <option value="EUR">EUR</option>
      </select>
      <button class="v2-btn v2-btn-ghost" id="ps-refresh-btn" onclick="psLoad()">
        <i class="ti ti-refresh" aria-hidden="true"></i> Osveži
      </button>
    </div>
  </div>

  <!-- Legenda tipova -->
  <div class="ps-legend">
    <span class="ps-badge ps-badge-opening"><i class="ti ti-door-enter" aria-hidden="true"></i> Otvaranje smene</span>
    <span class="ps-badge ps-badge-control"><i class="ti ti-search" aria-hidden="true"></i> Kontrolni presek</span>
    <span class="ps-badge ps-badge-closing"><i class="ti ti-door-exit" aria-hidden="true"></i> Zatvaranje smene</span>
    <span class="ps-badge ps-badge-daily"><i class="ti ti-calendar-check" aria-hidden="true"></i> Dnevni zaključak</span>
  </div>

  <!-- Tabela -->
  <div class="ps-table-wrap">
    <div class="ps-table-head">
      <div class="ps-col-time">Vreme</div>
      <div class="ps-col-type">Tip preseka</div>
      <div class="ps-col-user">Korisnik</div>
      <div class="ps-col-cur">Valuta</div>
      <div class="ps-col-calc">Obračunato</div>
      <div class="ps-col-phys">Popisano</div>
      <div class="ps-col-diff">Razlika</div>
      <div class="ps-col-toggle"></div>
    </div>
    <div id="ps-body">
      <div class="v2-empty" id="ps-empty" style="display:none">
        <i class="ti ti-scale"></i><p>Nema preseka za prikazane filtere.</p>
      </div>
      <div class="v2-loading" id="ps-loading">
        <i class="ti ti-loader-2 spin"></i><p>Učitavam preseke...</p>
      </div>
    </div>
  </div>

</div>
<!-- ═══ /PRESEK STANJA ═══ -->
```

---

## 5. Izmena `styles-v2.html`

Dodati sledeće CSS blokove na kraj fajla, **pre zatvarajućeg** `</style>` taga.

```css
/* ── Presek stanja ─────────────────────────────────────────────── */

.ps-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
  flex-wrap: wrap;
}
.ps-toolbar-title {
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--v2-text);
}
.ps-toolbar-title i { color: var(--v2-text-2); }
.ps-toolbar-actions { display: flex; align-items: center; gap: 8px; }
.ps-filter-currency { min-width: 120px; }

.ps-legend {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.ps-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
}
.ps-badge i { font-size: 12px; }
.ps-badge-opening  { background: #dcfce7; color: #166534; }
.ps-badge-control  { background: #dbeafe; color: #1e40af; }
.ps-badge-closing  { background: #fef3c7; color: #92400e; }
.ps-badge-daily    { background: #fce7f3; color: #9d174d; }

/* Tabela */
.ps-table-wrap {
  border: 0.5px solid var(--v2-border);
  border-radius: var(--v2-radius-md);
  overflow: hidden;
}
.ps-table-head {
  display: grid;
  grid-template-columns: 100px 160px 1fr 70px 120px 120px 110px 36px;
  padding: 8px 14px;
  background: var(--v2-bg);
  border-bottom: 0.5px solid var(--v2-border);
  font-size: 11px;
  font-weight: 500;
  color: var(--v2-text-2);
  text-transform: uppercase;
  letter-spacing: .06em;
}
.ps-table-head > div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ps-col-calc, .ps-col-phys, .ps-col-diff { text-align: right; }

/* Shift group header */
.ps-shift-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px 7px;
  background: var(--v2-bg);
  border-bottom: 0.5px solid var(--v2-border);
  font-size: 11px;
  font-weight: 500;
  color: var(--v2-text-2);
  text-transform: uppercase;
  letter-spacing: .07em;
  position: sticky;
  top: 0;
  z-index: 1;
}
.ps-shift-header::after {
  content: '';
  flex: 1;
  height: 0.5px;
  background: var(--v2-border);
}
.ps-shift-header i { font-size: 13px; }

/* Redovi */
.ps-row { border-bottom: 0.5px solid var(--v2-border); }
.ps-row:last-child { border-bottom: none; }

.ps-row-main {
  display: grid;
  grid-template-columns: 100px 160px 1fr 70px 120px 120px 110px 36px;
  padding: 9px 14px;
  align-items: center;
  cursor: pointer;
  transition: background .1s;
}
.ps-row-main:hover { background: var(--v2-bg); }
.ps-row.ps-expanded .ps-row-main { background: #eff6ff; border-bottom: 0.5px solid var(--v2-border-2); }

.ps-cell { font-size: 12px; color: var(--v2-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ps-cell-time { font-size: 11px; color: var(--v2-text-2); font-variant-numeric: tabular-nums; }
.ps-cell-user { font-size: 11px; color: var(--v2-text-2); }
.ps-cell-mono { font-variant-numeric: tabular-nums; text-align: right; }
.ps-cell-diff { font-variant-numeric: tabular-nums; text-align: right; font-weight: 500; }
.ps-cell-diff.diff-ok       { color: #166534; }
.ps-cell-diff.diff-surplus  { color: #1e40af; }
.ps-cell-diff.diff-shortage { color: #991b1b; }

.ps-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
}
.ps-type-opening { background: #dcfce7; color: #166534; }
.ps-type-control { background: #dbeafe; color: #1e40af; }
.ps-type-closing { background: #fef3c7; color: #92400e; }
.ps-type-daily   { background: #fce7f3; color: #9d174d; }

.ps-chevron { font-size: 15px; color: var(--v2-text-3); transition: transform .18s; display: flex; align-items: center; justify-content: center; }
.ps-row.ps-expanded .ps-chevron { transform: rotate(180deg); }

/* Detalji — prošireni blok */
.ps-detail {
  display: none;
  padding: 14px 16px 16px;
  background: var(--v2-surface);
  border-top: 0.5px solid var(--v2-border-2);
}
.ps-row.ps-expanded .ps-detail { display: block; }

.ps-detail-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  font-size: 11px;
  color: var(--v2-text-2);
}
.ps-detail-meta span { display: flex; align-items: center; gap: 4px; }

/* Summary KPI strip */
.ps-summary-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.ps-kpi {
  background: var(--v2-bg);
  border: 0.5px solid var(--v2-border);
  border-radius: var(--v2-radius-sm);
  padding: 10px 12px;
}
.ps-kpi-label {
  font-size: 10px;
  color: var(--v2-text-2);
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 3px;
}
.ps-kpi-val {
  font-size: 16px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--v2-text);
}
.ps-kpi-val.diff-ok       { color: #166534; }
.ps-kpi-val.diff-surplus  { color: #1e40af; }
.ps-kpi-val.diff-shortage { color: #991b1b; }

/* Denomination section */
.ps-denom-section { margin-top: 4px; }
.ps-denom-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--v2-text-2);
  text-transform: uppercase;
  letter-spacing: .07em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ps-denom-label i { font-size: 13px; }
.ps-pill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 6px;
}
.ps-pill {
  background: var(--v2-bg);
  border: 0.5px solid var(--v2-border);
  border-radius: var(--v2-radius-sm);
  padding: 8px 10px;
  text-align: center;
}
.ps-pill-denom {
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--v2-text);
}
.ps-pill-qty {
  font-size: 10px;
  color: var(--v2-text-2);
  margin-top: 2px;
}
.ps-pill-total {
  font-size: 10px;
  color: var(--v2-text-3);
  font-variant-numeric: tabular-nums;
  margin-top: 1px;
}
.ps-no-denoms {
  font-size: 11px;
  color: var(--v2-text-3);
  padding: 4px 0;
  font-style: italic;
}

/* Korekcija badge */
.ps-correction-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 99px;
  background: #fef3c7;
  color: #92400e;
  font-weight: 500;
  margin-left: 8px;
}
.ps-no-correction-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 99px;
  background: #dcfce7;
  color: #166534;
  font-weight: 500;
  margin-left: 8px;
}
```

---

## 6. Izmena `scripts-v2.html`

### 6.1 Konstante i helperi

Dodati na vrh `scripts-v2.html`, odmah iza bloka `var V2_STATUS_BADGE = {...}`:

```javascript
/* ── Presek stanja konstante ───────────────────────────────────── */
var PS_TYPE_BADGE = {
  'SHIFT_OPENING':        { cls: 'ps-type-opening', icon: 'ti-door-enter',    label: 'Otvaranje smene'   },
  'CASHBOX_COUNT':        { cls: 'ps-type-control', icon: 'ti-search',        label: 'Kontrolni presek'  },
  'SHIFT_CLOSING':        { cls: 'ps-type-closing', icon: 'ti-door-exit',     label: 'Zatvaranje smene'  },
  'DAILY_CLOSING_COUNT':  { cls: 'ps-type-daily',   icon: 'ti-calendar-check',label: 'Dnevni zaključak'  }
};

var PS_LAST_DATA  = [];
var PS_OPEN_ID    = '';
```

### 6.2 Glavna `psLoad()` funkcija

Dodati u `scripts-v2.html` sledeću funkciju:

```javascript
function psLoad() {
  var body    = document.getElementById('ps-body');
  var loading = document.getElementById('ps-loading');
  var empty   = document.getElementById('ps-empty');
  var curFil  = (document.getElementById('ps-filter-currency') || {}).value || '';

  if (loading) loading.style.display = '';
  if (empty)   empty.style.display   = 'none';

  v2CallApi('apiListCashCounts', [{ cashbox_id: V2.session.cashboxId, currency: curFil || undefined }], function(data) {
    PS_LAST_DATA = data || [];
    if (loading) loading.style.display = 'none';
    if (!PS_LAST_DATA.length) {
      if (empty) empty.style.display = '';
      return;
    }
    psRender(PS_LAST_DATA);
  }, { quiet: true });
}
```

### 6.3 Helperi za formatiranje

```javascript
function psFmt(n) {
  var num = Number(n || 0);
  return num.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function psDiffClass(d) {
  var n = Number(d || 0);
  if (Math.abs(n) < 0.001) return 'diff-ok';
  return n > 0 ? 'diff-surplus' : 'diff-shortage';
}

function psDiffLabel(d) {
  var n = Number(d || 0);
  if (Math.abs(n) < 0.001) return 'Usaglašeno';
  return (n > 0 ? '+' : '') + psFmt(n);
}

function psFormatTime(ts) {
  if (!ts) return '—';
  var d = new Date(ts);
  if (isNaN(d)) return String(ts).substring(0, 16).replace('T', ' ');
  var pad = function(n) { return n < 10 ? '0' + n : String(n); };
  return d.getDate() + '.' + (d.getMonth() + 1) + '. ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
```

### 6.4 Renderovanje denomination pillova

```javascript
function psRenderDenomPills(denoms, currency) {
  if (!denoms || !denoms.length) {
    return '<div class="ps-no-denoms">Nema unetih apoena</div>';
  }
  var pills = denoms.map(function(d) {
    var denom = Number(d.denomination || d.d || 0);
    var qty   = Number(d.quantity   || d.q || 0);
    var total = denom * qty;
    return '<div class="ps-pill">'
      + '<div class="ps-pill-denom">' + psFmt(denom) + ' ' + (d.currency || currency) + '</div>'
      + '<div class="ps-pill-qty">' + qty + ' kom</div>'
      + '<div class="ps-pill-total">= ' + psFmt(total) + '</div>'
      + '</div>';
  }).join('');
  return '<div class="ps-pill-grid">' + pills + '</div>';
}
```

### 6.5 Renderovanje jednog reda

```javascript
function psRenderRow(count) {
  var typeMeta  = PS_TYPE_BADGE[count.count_type] || { cls: 'ps-type-control', icon: 'ti-scale', label: count.count_type };
  var dc        = psDiffClass(count.difference);
  var diffLabel = psDiffLabel(count.difference);
  var hasAdj    = !!count.adjustment_event_id;
  var corrChip  = hasAdj
    ? '<span class="ps-correction-chip"><i class="ti ti-adjustments-alt" aria-hidden="true"></i>Korigovano</span>'
    : '<span class="ps-no-correction-chip"><i class="ti ti-check" aria-hidden="true"></i>Bez razlike</span>';

  var denomsHtml = psRenderDenomPills(count.denominations, count.currency);

  var row = document.createElement('div');
  row.className = 'ps-row';
  row.dataset.countId = count.count_id;

  row.innerHTML =
    '<div class="ps-row-main">'
    + '<div class="ps-cell ps-cell-time">' + psFormatTime(count.posted_at) + '</div>'
    + '<div class="ps-cell">'
    +   '<span class="ps-type-badge ' + typeMeta.cls + '">'
    +     '<i class="ti ' + typeMeta.icon + '" aria-hidden="true"></i>' + typeMeta.label
    +   '</span>'
    + '</div>'
    + '<div class="ps-cell ps-cell-user">' + (count.posted_by || count.created_by || '—') + '</div>'
    + '<div class="ps-cell" style="font-weight:500">' + count.currency + '</div>'
    + '<div class="ps-cell ps-cell-mono">' + psFmt(count.calculated_balance_before) + '</div>'
    + '<div class="ps-cell ps-cell-mono">' + psFmt(count.counted_cash_total) + '</div>'
    + '<div class="ps-cell ps-cell-diff ' + dc + '">' + diffLabel + '</div>'
    + '<div class="ps-cell ps-chevron"><i class="ti ti-chevron-down" aria-hidden="true"></i></div>'
    + '</div>'
    + '<div class="ps-detail">'
    +   '<div class="ps-detail-meta">'
    +     '<span><i class="ti ti-hash" aria-hidden="true"></i>' + count.count_id + '</span>'
    +     (count.shift_id ? '<span><i class="ti ti-transfer" aria-hidden="true"></i>' + count.shift_id + '</span>' : '')
    +     (count.note ? '<span><i class="ti ti-message" aria-hidden="true"></i>' + count.note + '</span>' : '')
    +     corrChip
    +   '</div>'
    +   '<div class="ps-summary-strip">'
    +     '<div class="ps-kpi"><div class="ps-kpi-label">Obračunato</div><div class="ps-kpi-val">' + psFmt(count.calculated_balance_before) + '</div></div>'
    +     '<div class="ps-kpi"><div class="ps-kpi-label">Popisano</div><div class="ps-kpi-val">' + psFmt(count.counted_cash_total) + '</div></div>'
    +     '<div class="ps-kpi"><div class="ps-kpi-label">Razlika</div><div class="ps-kpi-val ' + dc + '">' + diffLabel + '</div></div>'
    +   '</div>'
    +   '<div class="ps-denom-section">'
    +     '<div class="ps-denom-label"><i class="ti ti-coins" aria-hidden="true"></i>Popisani apoeni — ' + count.currency + '</div>'
    +     denomsHtml
    +   '</div>'
    + '</div>';

  row.querySelector('.ps-row-main').addEventListener('click', function() {
    var wasOpen = row.classList.contains('ps-expanded');
    document.querySelectorAll('.ps-row.ps-expanded').forEach(function(r) { r.classList.remove('ps-expanded'); });
    if (!wasOpen) row.classList.add('ps-expanded');
  });

  return row;
}
```

### 6.6 Glavna `psRender()` funkcija sa grupiranjem po smenama

```javascript
function psRender(data) {
  var body = document.getElementById('ps-body');
  if (!body) return;

  var loading = document.getElementById('ps-loading');
  var empty   = document.getElementById('ps-empty');
  if (loading) loading.style.display = 'none';

  body.innerHTML = '';
  if (!data || !data.length) {
    if (empty) empty.style.display = '';
    return;
  }

  /* Grupisati po shift_id */
  var groups     = [];
  var groupIndex = {};
  data.forEach(function(count) {
    var key = count.shift_id || '__NO_SHIFT__';
    if (!Object.prototype.hasOwnProperty.call(groupIndex, key)) {
      groupIndex[key] = groups.length;
      groups.push({ shift_id: key, counts: [] });
    }
    groups[groupIndex[key]].counts.push(count);
  });

  groups.forEach(function(group) {
    /* Shift header */
    var hdr = document.createElement('div');
    hdr.className = 'ps-shift-header';
    var shiftLabel = group.shift_id === '__NO_SHIFT__' ? 'Bez smene' : group.shift_id;
    var firstTime  = psFormatTime(group.counts[0] && group.counts[0].posted_at);
    var lastTime   = psFormatTime(group.counts[group.counts.length - 1] && group.counts[group.counts.length - 1].posted_at);
    hdr.innerHTML = '<i class="ti ti-transfer" aria-hidden="true"></i>'
      + '<span>' + shiftLabel + '</span>'
      + '<span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--v2-text-3)">'
      + lastTime + ' – ' + firstTime
      + '</span>';
    body.appendChild(hdr);

    /* Redovi preseka */
    group.counts.forEach(function(count) {
      body.appendChild(psRenderRow(count));
    });
  });
}
```

### 6.7 Filter — event listener

Dodati u `DOMContentLoaded` handler (tamo gdje su i ostali event listeneri za bootstrap):

```javascript
var psCurFilter = document.getElementById('ps-filter-currency');
if (psCurFilter) {
  psCurFilter.addEventListener('change', function() { psLoad(); });
}
```

### 6.8 Auto-load kad se sekcija otvori

U postojećoj `v2GoTo()` funkciji (ili ekvivalentnoj funkciji koja prebacuje sekcije), dodati:

```javascript
if (section === 'presek' && !PS_LAST_DATA.length) {
  psLoad();
}
```

Ako `v2GoTo` nije ime funkcije, pronađi funkciju koja prikazuje sekcije (`data-v2-nav`) i dodaj ovaj uslov u njen body.

---

## 7. Jezičko pravilo

- Svi labeli vidljivi korisniku: srpski, latinično
- Nazivi funkcija i JS varijable: engleski
- Komentari u kodu: engleski

---

## 8. Vizuelna pravila

- Ne koristiti `-filled` varijantu Tabler ikona
- Tabler Icons su već učitani u `desktop-v2.html` sa CDN v3.19.0 — ne dodavati novi `<link>`
- CSS varijable za boje: koristiti postojeće `--v2-*` varijable iz `styles-v2.html`
- Za razlike (surplus/shortage/ok) koristiti CSS klase `diff-ok`, `diff-surplus`, `diff-shortage` definisane u koraku 5

---

## 9. Šta NE raditi

- Ne menjati `scripts.html`, `styles.html`, `desktop.html`, `mobile.html`
- Ne menjati nijedan `.gs` fajl sem `WebApp.gs`
- Ne brisati postojeću sekciju `dv2-section-smena` — njen "Presek aktivne smene" dugme ostaje
- Ne uvoziti nove eksterne biblioteke ni CDN linkove
- Ne koristiti `localStorage`

---

## 10. Verifikacija posle implementacije

Pokrenuti u browseru na `?view=desktop-v2` i proveriti:

1. U levom sidebaru, u sekciji Upravljanje, pojavljuje se "Presek stanja"
2. Klik na "Presek stanja" prikazuje sekciju — spinner, zatim tabela ili "Nema preseka"
3. Redovi su grupisani po smenama sa header sekcijom koja prikazuje shift_id i vremenski raspon
4. Svaki red prikazuje: vreme, tip (badge sa ikonom), korisnik, valuta, obračunato, popisano, razlika (u boji)
5. Klik na red otvara detalje ispod: ID, shift, napomena, KPI strip (3 broja), apoeni kao pill kartice
6. Klik na isti red ponovo zatvara detalje
7. Klik na drugi red zatvara prethodni i otvara novi
8. Filter "Sve valute / RSD / EUR" osvežava tabelu
9. "Osveži" dugme ponovo poziva API
10. Dark mode: `<html data-theme="dark">` — proveriti da sve boje ostaju čitljive
