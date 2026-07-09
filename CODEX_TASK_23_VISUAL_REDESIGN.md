# CODEX TASK 23 — Globalni vizuelni redesign: desktop-v2

> **Datum:** 2026-06-02  
> **Scope:** `src/html/styles-v2.html` (kompletan rewrite) + `src/html/desktop-v2.html` (strukturalne izmene topbara i detail panela)  
> **Ne diraj:** Ni jedan `.gs` fajl, `scripts-v2.html` (samo manje dorade navedene u sekciji 7), `mobile.html`, `scripts.html`, `styles.html`

---

## 1. Referentni dizajn

Novi vizuelni identitet je profesionalna tamna tema sa sledećim karakteristikama:

- **Tamna pozadina** kao default — ne kao opcioni dark mode, već kao primarni izgled aplikacije
- **Tamno plavi sidebar** (ostaje) — već dobro odgovara novoj temi
- **Gornji topbar** redizajniran: datum/vreme desno, ime korisnika sa avatarom, bell ikona za notifikacije
- **KPI strip** ispod topbara: 6 metričnih kartica u horizontalnom nizu sa velikim brojevima
- **Dvo-panelni layout** kao standardni pattern za sekcije koje imaju listu i detalje
- **Tabele** sa finim granicama, header ćelija u uppercase, hover highlight
- **Detail panel sa tabovima**: Pregled / Valute / Apoeni / Zapisnik
- **Apoeni tabela** sa kolonama: APOEN, KOMADA, OČEKIVANO, POPISANO, RAZLIKA
- **Status badge** "Proknjižen" zeleni pill unutar detail headera
- **Paginacija** komponenta: "Prikazano 1–20 od 28" sa strelicama i selektorom "N po strani"

---

## 2. Kompletan rewrite `styles-v2.html`

**Zameni kompletan sadržaj `styles-v2.html`** sledećim CSS-om. Fajl počinje sa `<style>` i završava sa `</style>`.

```css
<style>
/* ╔══════════════════════════════════════════════════════════════╗
   ║  BLAGAJNA WEB — Desktop v2 styles  (Task 23 redesign)       ║
   ╚══════════════════════════════════════════════════════════════╝ */

/* ── Varijable (tamna tema kao default) ────────────────────────── */
:root {
  --v2-bg:          #111827;
  --v2-bg-2:        #1a2236;
  --v2-surface:     #1e2a3a;
  --v2-surface-2:   #243044;
  --v2-border:      rgba(255,255,255,.10);
  --v2-border-2:    rgba(255,255,255,.06);
  --v2-text:        #f1f5f9;
  --v2-text-2:      #94a3b8;
  --v2-text-3:      #4b6180;
  --v2-primary:     #2563eb;
  --v2-primary-d:   #1d4ed8;
  --v2-primary-bg:  rgba(37,99,235,.18);
  --v2-in:          #4ade80;
  --v2-in-bg:       rgba(74,222,128,.12);
  --v2-in-border:   rgba(74,222,128,.25);
  --v2-out:         #f87171;
  --v2-out-bg:      rgba(248,113,113,.12);
  --v2-out-border:  rgba(248,113,113,.25);
  --v2-warn:        #fbbf24;
  --v2-warn-bg:     rgba(251,191,36,.12);
  --v2-warn-border: rgba(251,191,36,.25);
  --v2-nav-bg:      #0d1829;
  --v2-nav-text:    rgba(255,255,255,.55);
  --v2-r:           10px;
  --v2-radius-sm:   6px;
  --v2-radius-md:   8px;
  --v2-shadow:      0 1px 3px rgba(0,0,0,.4);
  --v2-shadow-md:   0 4px 20px rgba(0,0,0,.5);
}

/* ── Reset & base ──────────────────────────────────────────────── */
.dv2-shell *, .dv2-shell *::before, .dv2-shell *::after { box-sizing: border-box; }
.dv2-shell {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  font-size: 13px;
  color: var(--v2-text);
  background: var(--v2-bg);
}
.dv2-shell button { font-family: inherit; cursor: pointer; border: none; background: none; }
.dv2-shell input, .dv2-shell select, .dv2-shell textarea {
  font-family: inherit; font-size: 13px; color: var(--v2-text);
}
.dv2-shell select {
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
}

/* ── Shell layout ──────────────────────────────────────────────── */
.dv2-shell { display: flex; height: 100vh; overflow: hidden; }

/* ── Sidebar nav ───────────────────────────────────────────────── */
.dv2-nav {
  width: 220px;
  background: var(--v2-nav-bg);
  color: #fff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid rgba(255,255,255,.05);
}
.dv2-nav-brand { padding: 16px 14px 14px; border-bottom: 1px solid rgba(255,255,255,.06); }
.dv2-nav-brand-title {
  font-size: 16px; font-weight: 700;
  display: flex; align-items: center; gap: 7px;
  color: #fff; letter-spacing: -.2px;
}
.dv2-nav-brand-title i { color: #60a5fa; font-size: 18px; }
.dv2-nav-brand-user {
  font-size: 11px; color: rgba(255,255,255,.4);
  margin-top: 5px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.dv2-role-chip {
  display: inline-block; margin-top: 7px;
  background: rgba(37,99,235,.35); border-radius: 4px;
  padding: 2px 8px; font-size: 10px; font-weight: 600;
  color: #93c5fd; letter-spacing: .05em;
}
.dv2-nav-section {
  font-size: 10px; font-weight: 600; letter-spacing: .12em;
  text-transform: uppercase; color: rgba(255,255,255,.25);
  padding: 14px 14px 4px;
}
.dv2-nav-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; font-size: 13px;
  color: var(--v2-nav-text);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background .1s, color .1s;
  white-space: nowrap;
}
.dv2-nav-item:hover { background: rgba(255,255,255,.05); color: #fff; }
.dv2-nav-item.active {
  background: rgba(37,99,235,.2);
  color: #fff; font-weight: 600;
  border-left-color: var(--v2-primary);
}
.dv2-nav-item i { font-size: 16px; flex-shrink: 0; }
.dv2-nav-badge {
  margin-left: auto; background: #ef4444; color: #fff;
  border-radius: 99px; min-width: 18px; height: 18px;
  font-size: 10px; font-weight: 700;
  display: none; align-items: center; justify-content: center;
  padding: 0 4px;
}
.dv2-nav-badge.info-badge { background: var(--v2-primary); }
.dv2-nav-badge.visible { display: flex; }
.dv2-nav-bottom {
  margin-top: auto; padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,.06);
}
.dv2-nav-bottom a {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: rgba(255,255,255,.3);
  text-decoration: none; padding: 5px 6px; border-radius: 6px;
}
.dv2-nav-bottom a:hover { color: rgba(255,255,255,.55); }

/* ── Main area ─────────────────────────────────────────────────── */
.dv2-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

/* ── Topbar ────────────────────────────────────────────────────── */
.dv2-topbar {
  display: flex; align-items: stretch;
  background: var(--v2-nav-bg);
  border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0; min-height: 52px;
}
.dv2-kpi {
  padding: 8px 16px; border-right: 1px solid rgba(255,255,255,.06);
  display: flex; flex-direction: column; justify-content: center;
}
.dv2-kpi-val { font-size: 18px; font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
.dv2-kpi-sub { font-size: 10px; color: var(--v2-text-3); margin-top: 1px; font-variant-numeric: tabular-nums; }
.dv2-kpi-lbl { font-size: 10px; color: var(--v2-text-3); text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }
.dv2-kpi-val.v-in   { color: var(--v2-in); }
.dv2-kpi-val.v-out  { color: var(--v2-out); }
.dv2-kpi-val.v-warn { color: var(--v2-warn); }
.dv2-kpi-val.v-ok   { color: var(--v2-in); }
.dv2-kpi-val.v-pri  { color: var(--v2-primary); }
.dv2-kpi-val.v-muted { color: var(--v2-text-2); font-size: 14px; }

.dv2-urgent-kpi {
  display: none; align-items: center; gap: 8px;
  background: rgba(239,68,68,.15); color: #fca5a5;
  padding: 0 14px; cursor: pointer;
  font-size: 12px; font-weight: 600;
  border-right: 1px solid rgba(255,255,255,.06);
}
.dv2-urgent-kpi.visible { display: flex; }
.dv2-urgent-badge {
  background: #ef4444; color: #fff; border-radius: 99px;
  padding: 0 7px; font-size: 11px; font-weight: 700;
}

.dv2-topbar-right {
  margin-left: auto; display: flex; align-items: center;
  gap: 6px; padding: 0 14px;
}
.dv2-chip-select {
  display: flex; align-items: center; gap: 5px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 7px; padding: 5px 10px;
  font-size: 12px; color: var(--v2-text-2);
}
.dv2-chip-select select {
  border: none; background: transparent;
  font-size: 12px; color: var(--v2-text);
  padding: 0 18px 0 0;
}
.dv2-chip-select i { font-size: 14px; color: var(--v2-text-3); }

.dv2-topbar-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 11px; border-radius: 7px;
  font-size: 12px; font-weight: 500;
  border: 1px solid rgba(255,255,255,.1);
  color: var(--v2-text-2);
  background: rgba(255,255,255,.05);
  transition: background .1s;
}
.dv2-topbar-btn:hover { background: rgba(255,255,255,.1); color: var(--v2-text); }

/* Topbar user chip */
.dv2-user-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 99px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.05);
  cursor: default;
}
.dv2-user-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--v2-primary); color: #fff;
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.dv2-user-name { font-size: 12px; font-weight: 500; line-height: 1.2; }
.dv2-user-role { font-size: 10px; color: var(--v2-text-3); }
.dv2-topbar-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.05);
  color: var(--v2-text-2); font-size: 16px;
  transition: background .1s;
}
.dv2-topbar-icon-btn:hover { background: rgba(255,255,255,.1); color: var(--v2-text); }

/* ── Sekcija breadcrumb ────────────────────────────────────────── */
.dv2-section-bar {
  display: flex; align-items: center; gap: 0;
  background: var(--v2-nav-bg);
  border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0; padding: 0 18px;
  overflow-x: auto;
}
.dv2-section-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px; font-size: 13px;
  color: rgba(255,255,255,.4);
  border-bottom: 2px solid transparent;
  white-space: nowrap; cursor: pointer;
  transition: color .1s;
}
.dv2-section-tab:hover { color: rgba(255,255,255,.7); }
.dv2-section-tab.active {
  color: #fff; font-weight: 600;
  border-bottom-color: var(--v2-primary);
}
.dv2-section-tab i { font-size: 15px; }

/* ── Message bar ───────────────────────────────────────────────── */
.dv2-message {
  display: none; padding: 9px 18px;
  font-size: 13px; font-weight: 500;
  align-items: center; gap: 8px; flex-shrink: 0;
}
.dv2-message.show { display: flex; }
.dv2-message.info    { background: rgba(37,99,235,.2); color: #93c5fd; }
.dv2-message.success { background: var(--v2-in-bg); color: var(--v2-in); }
.dv2-message.error   { background: var(--v2-out-bg); color: var(--v2-out); }

/* ── Content ───────────────────────────────────────────────────── */
.dv2-content { flex: 1; overflow: hidden; }
.dv2-section { display: none; height: 100%; overflow-y: auto; padding: 16px 18px; flex-direction: column; gap: 14px; }
.dv2-section.active { display: flex; }

/* ── Cards ─────────────────────────────────────────────────────── */
.v2-card {
  background: var(--v2-surface);
  border: 1px solid var(--v2-border);
  border-radius: var(--v2-r);
}
.v2-card-head {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--v2-border);
  flex-wrap: wrap;
}
.v2-card-title {
  font-size: 13px; font-weight: 600; flex: 1;
  display: flex; align-items: center; gap: 6px;
  min-width: 120px; color: var(--v2-text);
}
.v2-card-title i { color: var(--v2-text-3); font-size: 16px; }
.v2-card-body { padding: 14px; }

/* ── Knjiga layout ─────────────────────────────────────────────── */
.v2-knjiga-layout { display: grid; grid-template-columns: 1fr 260px; gap: 14px; flex: 1; min-height: 0; }
.v2-knjiga-main { display: flex; flex-direction: column; min-height: 0; }
.v2-knjiga-side { display: flex; flex-direction: column; gap: 10px; }
.v2-knjiga-filters { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

/* ── Table ─────────────────────────────────────────────────────── */
.v2-table-wrap { overflow-x: auto; overflow-y: auto; flex: 1; }
.v2-book-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.v2-book-table th {
  background: var(--v2-bg-2);
  padding: 8px 10px; text-align: left;
  font-size: 10px; font-weight: 600;
  color: var(--v2-text-3);
  border-bottom: 1px solid var(--v2-border);
  white-space: nowrap; position: sticky; top: 0;
  text-transform: uppercase; letter-spacing: .06em;
}
.v2-book-table th.num { text-align: right; }
.v2-book-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--v2-border-2);
  vertical-align: middle; font-size: 13px;
  color: var(--v2-text);
}
.v2-book-table tr:hover td { background: var(--v2-bg-2); cursor: pointer; }
.v2-book-table tr.selected td { background: rgba(37,99,235,.15); }
.v2-book-table tr.total-row td {
  background: var(--v2-bg-2); font-weight: 600;
  font-size: 12px; color: var(--v2-text-2);
}
.v2-book-table .cell-in  { text-align: right; color: var(--v2-in); font-weight: 600; }
.v2-book-table .cell-out { text-align: right; color: var(--v2-out); font-weight: 600; }
.v2-book-table .cell-bal { text-align: right; font-weight: 600; }
.v2-book-table .cell-dash { text-align: right; color: var(--v2-text-3); }
.v2-desc-main { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.v2-desc-sub { font-size: 11px; color: var(--v2-text-3); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }

/* ── Status badges ─────────────────────────────────────────────── */
.v2-badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 99px;
  font-size: 10px; font-weight: 600; white-space: nowrap;
}
.v2-badge::before { content: '●'; font-size: 7px; }
.v2-b-posted   { background: var(--v2-in-bg);   color: var(--v2-in); }
.v2-b-locked   { background: rgba(148,163,184,.12); color: var(--v2-text-2); }
.v2-b-reversed { background: rgba(148,163,184,.12); color: var(--v2-text-3); }
.v2-b-paid     { background: var(--v2-in-bg);   color: var(--v2-in); }
.v2-b-wait     { background: var(--v2-warn-bg);  color: var(--v2-warn); }
.v2-b-partial  { background: var(--v2-warn-bg);  color: var(--v2-warn); }
.v2-b-approved { background: var(--v2-in-bg);   color: var(--v2-in); }
.v2-b-rejected { background: var(--v2-out-bg);   color: var(--v2-out); }
.v2-b-cancelled{ background: var(--v2-out-bg);   color: var(--v2-out); }
.v2-b-draft    { background: rgba(148,163,184,.12); color: var(--v2-text-3); }
.v2-b-sub      { background: rgba(37,99,235,.2); color: #93c5fd; }
.v2-b-review   { background: var(--v2-warn-bg);  color: var(--v2-warn); }
.v2-b-urgent   { background: var(--v2-out-bg);   color: var(--v2-out); }
.v2-b-open     { background: var(--v2-in-bg);   color: var(--v2-in); }
.v2-b-closed   { background: rgba(148,163,184,.12); color: var(--v2-text-3); }
.v2-b-diff     { background: var(--v2-warn-bg);  color: var(--v2-warn); }

/* ── Buttons ───────────────────────────────────────────────────── */
.v2-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 7px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; border: 1px solid transparent;
  transition: opacity .12s, background .1s;
}
.v2-btn:disabled { opacity: .4; cursor: not-allowed; }
.v2-btn-primary { background: var(--v2-primary); color: #fff; }
.v2-btn-primary:hover { background: var(--v2-primary-d); }
.v2-btn-in      { background: rgba(74,222,128,.2); color: var(--v2-in); border-color: var(--v2-in-border); }
.v2-btn-out     { background: var(--v2-out-bg); color: var(--v2-out); border-color: var(--v2-out-border); }
.v2-btn-ghost   { background: rgba(255,255,255,.06); color: var(--v2-text-2); border-color: var(--v2-border); }
.v2-btn-ghost:hover { background: rgba(255,255,255,.1); color: var(--v2-text); }
.v2-btn-warn    { background: var(--v2-out-bg); color: var(--v2-out); border-color: var(--v2-out-border); }
.v2-btn-approve { background: rgba(74,222,128,.2); color: var(--v2-in); border-color: var(--v2-in-border); }
.v2-btn-reject  { background: var(--v2-out-bg); color: var(--v2-out); border-color: var(--v2-out-border); }
.v2-btn-icon-sm {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 11px; border-radius: 7px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  border: 1px solid var(--v2-border);
  background: rgba(255,255,255,.05); color: var(--v2-text-2);
}
.v2-btn-icon-sm:hover { background: rgba(255,255,255,.1); color: var(--v2-text); }

/* ── Inputs ────────────────────────────────────────────────────── */
.v2-input {
  width: 100%;
  border: 1px solid var(--v2-border);
  border-radius: var(--v2-radius-md);
  padding: 8px 10px; font-size: 13px;
  background: rgba(255,255,255,.04);
  color: var(--v2-text);
  transition: border-color .1s;
}
.v2-input:focus { outline: none; border-color: var(--v2-primary); background: rgba(255,255,255,.07); }
.v2-input::placeholder { color: var(--v2-text-3); }
select.v2-input { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; padding-right: 24px; }
.v2-input-row { display: flex; gap: 6px; }
.v2-input-row .v2-input { flex: 1; }
.v2-input-row select.v2-input { flex: 0 0 76px; }
.v2-filter {
  border: 1px solid var(--v2-border);
  border-radius: var(--v2-radius-md);
  padding: 5px 10px; font-size: 12px;
  background: rgba(255,255,255,.04);
  color: var(--v2-text);
}
.v2-filter:focus { outline: none; border-color: var(--v2-primary); }
select.v2-filter { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 6px center; padding-right: 22px; appearance: none; -webkit-appearance: none; }
.v2-select { border: 1px solid var(--v2-border); border-radius: var(--v2-radius-md); padding: 5px 10px 5px 10px; font-size: 12px; background: rgba(255,255,255,.04); color: var(--v2-text); appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; padding-right: 24px; }

/* ── Quick form ────────────────────────────────────────────────── */
.v2-qf-toggle { display: flex; background: rgba(255,255,255,.04); border-radius: 8px; padding: 3px; gap: 3px; margin-bottom: 10px; border: 1px solid var(--v2-border); }
.v2-qf-btn { flex: 1; padding: 8px; font-size: 12px; font-weight: 600; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; color: var(--v2-text-3); transition: all .15s; }
.v2-qf-btn.active-in  { background: rgba(74,222,128,.2); color: var(--v2-in); }
.v2-qf-btn.active-out { background: var(--v2-out-bg); color: var(--v2-out); }
.v2-qf-field { margin-bottom: 8px; }
.v2-qf-label { font-size: 11px; color: var(--v2-text-2); margin-bottom: 3px; display: block; font-weight: 500; }
.v2-qf-submit { width: 100%; border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 700; color: #fff; background: var(--v2-primary); display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 4px; transition: background .1s; border: none; }
.v2-qf-submit:hover { background: var(--v2-primary-d); }
.v2-qf-submit.type-out { background: rgba(248,113,113,.25); color: var(--v2-out); }
.v2-permission-card { text-align: center; padding: 16px; color: var(--v2-text-3); font-size: 12px; }

/* ── Detail panel ──────────────────────────────────────────────── */
.v2-detail-panel { display: none; }
.v2-detail-panel.open { display: flex; flex-direction: column; height: 100%; }

/* Detail panel header s metadata chips */
.v2-dp-header {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px; border-bottom: 1px solid var(--v2-border);
  flex-wrap: wrap; flex-shrink: 0;
  background: var(--v2-bg-2);
}
.v2-dp-status { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; }
.v2-dp-chip {
  display: flex; align-items: center; gap: 5px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 6px; padding: 4px 10px;
  font-size: 11px;
}
.v2-dp-chip-label { color: var(--v2-text-3); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
.v2-dp-chip-val { color: var(--v2-text); font-weight: 500; }
.v2-dp-chip i { font-size: 14px; color: var(--v2-text-3); }

/* Detail panel tabs */
.v2-dp-tabs {
  display: flex; align-items: center; gap: 0;
  border-bottom: 1px solid var(--v2-border);
  flex-shrink: 0; background: var(--v2-surface);
  padding: 0 14px;
}
.v2-dp-tab {
  padding: 9px 14px; font-size: 12px; font-weight: 500;
  color: var(--v2-text-3); cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap; transition: color .1s;
}
.v2-dp-tab:hover { color: var(--v2-text-2); }
.v2-dp-tab.active { color: var(--v2-text); border-bottom-color: var(--v2-primary); font-weight: 600; }

/* Detail panel content */
.v2-dp-body { flex: 1; overflow-y: auto; }
.v2-dp-pane { display: none; padding: 14px; }
.v2-dp-pane.active { display: block; }

/* Detail panel close + actions */
.v2-dp-topbar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-bottom: 1px solid var(--v2-border);
  flex-shrink: 0; background: var(--v2-surface);
}
.v2-dp-title { font-size: 14px; font-weight: 600; flex: 1; }
.v2-dp-close {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid var(--v2-border);
  background: rgba(255,255,255,.05);
  color: var(--v2-text-3); font-size: 16px;
  cursor: pointer;
}
.v2-dp-close:hover { background: rgba(255,255,255,.1); color: var(--v2-text); }
.v2-dp-actions-dropdown {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 7px;
  border: 1px solid var(--v2-border);
  background: rgba(255,255,255,.05);
  color: var(--v2-text-2); font-size: 12px; font-weight: 500;
  cursor: pointer;
}
.v2-dp-actions-dropdown:hover { background: rgba(255,255,255,.1); }

/* Detail row (key-value) */
.v2-detail-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 7px 0; border-bottom: 1px solid var(--v2-border-2);
  font-size: 13px;
}
.v2-detail-row:last-child { border-bottom: none; }
.v2-detail-key { color: var(--v2-text-2); flex-shrink: 0; }
.v2-detail-val { font-weight: 500; text-align: right; max-width: 60%; }
.v2-detail-actions { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid var(--v2-border); }

/* ── Apoeni tabela (denomination table) ────────────────────────── */
.v2-denom-section { margin-bottom: 18px; }
.v2-denom-currency-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px 8px;
  font-size: 13px; font-weight: 600; color: var(--v2-text);
  border-bottom: 1px solid var(--v2-border);
}
.v2-denom-currency-flag {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
  background: rgba(255,255,255,.08);
}
.v2-denom-currency-name { flex: 1; }
.v2-denom-currency-sub { font-size: 11px; color: var(--v2-text-3); font-weight: 400; }
.v2-denom-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.v2-denom-table th {
  background: var(--v2-bg-2);
  padding: 6px 12px; text-align: right;
  font-size: 10px; font-weight: 600;
  color: var(--v2-text-3);
  border-bottom: 1px solid var(--v2-border);
  text-transform: uppercase; letter-spacing: .06em;
}
.v2-denom-table th:first-child { text-align: left; }
.v2-denom-table td {
  padding: 7px 12px; text-align: right;
  border-bottom: 1px solid var(--v2-border-2);
  font-variant-numeric: tabular-nums;
  color: var(--v2-text-2);
}
.v2-denom-table td:first-child { text-align: left; color: var(--v2-text); font-weight: 500; }
.v2-denom-table tr:hover td { background: var(--v2-bg-2); }
.v2-denom-table tr.denom-total td {
  background: var(--v2-bg-2); font-weight: 600;
  color: var(--v2-text); border-top: 1px solid var(--v2-border);
  border-bottom: none; font-size: 12px;
}
.v2-denom-table .diff-ok       { color: var(--v2-in); }
.v2-denom-table .diff-shortage { color: var(--v2-out); }
.v2-denom-table .diff-surplus  { color: #60a5fa; }
.v2-denom-grand-total {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  background: var(--v2-bg-2);
  border-top: 1px solid var(--v2-border);
  font-size: 12px; font-weight: 600;
  color: var(--v2-text);
}
.v2-denom-grand-total .gt-label { color: var(--v2-text-2); }
.v2-denom-grand-total .gt-cols { display: flex; gap: 32px; }
.v2-denom-grand-total .gt-item { text-align: right; }
.v2-denom-grand-total .gt-item-label { font-size: 10px; color: var(--v2-text-3); text-transform: uppercase; }

/* ── Paginacija ────────────────────────────────────────────────── */
.v2-pagination {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--v2-border);
  background: var(--v2-surface);
  font-size: 12px; color: var(--v2-text-2);
  flex-shrink: 0;
}
.v2-pagination-info { flex: 1; }
.v2-page-btn {
  display: flex; align-items: center; justify-content: center;
  min-width: 28px; height: 28px; border-radius: 6px;
  font-size: 12px; font-weight: 500;
  border: 1px solid var(--v2-border);
  background: rgba(255,255,255,.05);
  color: var(--v2-text-2); cursor: pointer;
  transition: background .1s;
  padding: 0 6px;
}
.v2-page-btn:hover { background: rgba(255,255,255,.1); color: var(--v2-text); }
.v2-page-btn.active { background: var(--v2-primary); color: #fff; border-color: var(--v2-primary); }
.v2-page-btn:disabled { opacity: .35; cursor: not-allowed; }
.v2-page-size { display: flex; align-items: center; gap: 5px; }
.v2-page-size select {
  background: rgba(255,255,255,.04); border: 1px solid var(--v2-border);
  border-radius: 6px; padding: 3px 22px 3px 8px; font-size: 11px;
  color: var(--v2-text); appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='%2394a3b8' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 5px center;
}

/* ── Entity lists ──────────────────────────────────────────────── */
.v2-two-col { display: grid; grid-template-columns: 1fr 340px; gap: 14px; flex: 1; min-height: 0; }
.v2-entity-list { overflow-y: auto; }
.v2-entity-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-bottom: 1px solid var(--v2-border-2);
  cursor: pointer; transition: background .1s;
}
.v2-entity-row:last-child { border-bottom: none; }
.v2-entity-row:hover { background: var(--v2-bg-2); }
.v2-entity-row.selected { background: var(--v2-primary-bg); border-left: 2px solid var(--v2-primary); }
.v2-entity-id   { font-size: 10px; color: var(--v2-text-3); font-family: monospace; }
.v2-entity-name { font-size: 13px; font-weight: 600; }
.v2-entity-sub  { font-size: 11px; color: var(--v2-text-2); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.v2-entity-right { text-align: right; flex-shrink: 0; }
.v2-entity-amount { font-size: 14px; font-weight: 700; color: var(--v2-out); }

/* ── KPI cards (u sekcijama) ───────────────────────────────────── */
.v2-kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
.v2-kpi-card {
  background: var(--v2-surface); border: 1px solid var(--v2-border);
  border-radius: var(--v2-r); padding: 12px 14px;
}
.v2-kpi-card-val { font-size: 20px; font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
.v2-kpi-card-lbl { font-size: 10px; color: var(--v2-text-3); margin-top: 4px; text-transform: uppercase; letter-spacing: .06em; }
.v2-kpi-card-sub { font-size: 11px; color: var(--v2-text-3); margin-top: 2px; font-variant-numeric: tabular-nums; }

/* ── Forms ─────────────────────────────────────────────────────── */
.v2-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.v2-form-field.span2 { grid-column: 1/-1; }
.v2-form-label { font-size: 11px; color: var(--v2-text-2); margin-bottom: 4px; display: block; font-weight: 500; }
.v2-form-actions { display: flex; gap: 8px; }

/* ── Shift history card ────────────────────────────────────────── */
.v2-shift-card { padding: 10px 14px; border-bottom: 1px solid var(--v2-border-2); }
.v2-shift-card:last-child { border-bottom: none; }
.v2-shift-head { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 3px; }
.v2-shift-id { font-size: 10px; color: var(--v2-text-3); font-family: monospace; }
.v2-shift-who { font-size: 13px; font-weight: 600; flex: 1; }
.v2-shift-meta { font-size: 11px; color: var(--v2-text-3); }

/* ── Audit table ───────────────────────────────────────────────── */
.v2-audit-grid { display: grid; grid-template-columns: 140px 100px 80px 1fr; gap: 8px; padding: 8px 14px; border-bottom: 1px solid var(--v2-border-2); font-size: 12px; align-items: center; }
.v2-audit-grid:hover { background: var(--v2-bg-2); }
.v2-audit-head { background: var(--v2-bg-2); font-weight: 600; font-size: 10px; color: var(--v2-text-3); border-bottom: 1px solid var(--v2-border); text-transform: uppercase; letter-spacing: .06em; }

/* ── Report list ───────────────────────────────────────────────── */
.v2-report-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--v2-border-2); }
.v2-report-row:last-child { border-bottom: none; }
.v2-report-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; background: rgba(255,255,255,.06); color: var(--v2-text-2); }
.v2-report-name { font-size: 13px; font-weight: 600; }
.v2-report-desc { font-size: 11px; color: var(--v2-text-3); }
.v2-report-btn  { margin-left: auto; }

/* ── Empty / loading state ─────────────────────────────────────── */
.v2-empty { text-align: center; padding: 40px 20px; color: var(--v2-text-3); }
.v2-empty i { font-size: 36px; display: block; margin-bottom: 10px; opacity: .4; }
.v2-empty p { font-size: 13px; }
.v2-loading { text-align: center; padding: 40px 20px; color: var(--v2-text-3); }
.v2-loading i { font-size: 28px; display: block; margin-bottom: 8px; }

/* ── Closing preview ───────────────────────────────────────────── */
.v2-closing-preview { background: var(--v2-bg-2); border-radius: 8px; padding: 12px 14px; margin: 4px 14px 0; border: 1px solid var(--v2-border); }
.v2-cp-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
.v2-cp-total { font-weight: 700; border-top: 1px solid var(--v2-border); margin-top: 5px; padding-top: 8px; }

/* ── Modal ─────────────────────────────────────────────────────── */
.v2-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 800; display: none; align-items: center; justify-content: center; }
.v2-modal-overlay.open { display: flex; }
.v2-modal { background: var(--v2-surface); border: 1px solid var(--v2-border); border-radius: 14px; padding: 24px; width: 400px; max-width: 95vw; }
.v2-modal-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
.v2-modal-msg { font-size: 13px; color: var(--v2-text-2); margin-bottom: 14px; line-height: 1.5; }
.v2-modal-input { width: 100%; border: 1px solid var(--v2-border); border-radius: 8px; padding: 9px 12px; font-size: 14px; background: rgba(255,255,255,.04); color: var(--v2-text); margin-bottom: 14px; }
.v2-modal-input:focus { outline: none; border-color: var(--v2-primary); }
.v2-modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

/* ── Clock ─────────────────────────────────────────────────────── */
.v2-clock { font-size: 11px; color: var(--v2-text-3); text-align: right; }
.v2-clock strong { display: block; font-size: 15px; font-weight: 600; color: var(--v2-text-2); font-variant-numeric: tabular-nums; }

/* ── Loading skeleton ──────────────────────────────────────────── */
.v2-skeleton { background: linear-gradient(90deg, var(--v2-border) 25%, var(--v2-bg-2) 50%, var(--v2-border) 75%); background-size: 200% 100%; animation: v2-shimmer 1.4s infinite; border-radius: 4px; height: 14px; margin: 5px 0; }
@keyframes v2-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Spin animation ────────────────────────────────────────────── */
.spin { animation: v2-spin .8s linear infinite; display: inline-block; }
@keyframes v2-spin { to { transform: rotate(360deg); } }

/* ── Optimistički redovi ───────────────────────────────────────── */
.optimistic { opacity: .55; }

/* ── Toast ─────────────────────────────────────────────────────── */
.v2-toast {
  position: fixed; bottom: 20px; right: 20px; z-index: 900;
  display: flex; align-items: center; gap: 8px;
  background: var(--v2-surface); border: 1px solid var(--v2-border);
  border-radius: 10px; padding: 12px 16px;
  font-size: 13px; font-weight: 500; color: var(--v2-text);
  opacity: 0; transform: translateY(8px);
  transition: opacity .25s, transform .25s;
  pointer-events: none; max-width: 340px;
}
.v2-toast.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
.v2-toast.success { border-color: var(--v2-in-border); }
.v2-toast.success i { color: var(--v2-in); }
.v2-toast.error { border-color: var(--v2-out-border); }
.v2-toast.error i { color: var(--v2-out); }

/* ── body override ─────────────────────────────────────────────── */
body:has(.dv2-shell) { margin: 0; padding: 0; overflow: hidden; background: #111827; }
</style>
```

---

## 3. Izmene `desktop-v2.html`

### 3.1 Ukloni `data-theme` atribut iz `<html>` taga

Promeni:
```html
<html lang="sr">
```
Ostavi kao što je — ne dodavati `data-theme="dark"` jer novi CSS-om je tamna tema default bez `data-theme`.

### 3.2 Izmeni topbar — dodaj user chip i ikonska dugmad

Pronađi `.dv2-topbar-right` div u `desktop-v2.html` i zameni:

```html
<div class="dv2-topbar-right">
  <div class="dv2-chip-select">
    <i class="ti ti-building-bank" aria-hidden="true"></i>
    <select id="v2-cashbox-select" aria-label="Izaberi blagajnu"></select>
  </div>
  <div class="dv2-chip-select">
    <i class="ti ti-coins" aria-hidden="true"></i>
    <select id="v2-currency-select" aria-label="Izaberi valutu"></select>
  </div>
  <div class="v2-clock">
    <strong id="v2-clock-time">--:--</strong>
    <span id="v2-clock-date"></span>
  </div>
  <button class="dv2-topbar-icon-btn" id="v2-theme-btn" aria-label="Promeni temu">
    <i class="ti ti-moon" aria-hidden="true"></i>
  </button>
  <button class="dv2-topbar-icon-btn" aria-label="Obaveštenja">
    <i class="ti ti-bell" aria-hidden="true"></i>
  </button>
  <div class="dv2-user-chip">
    <div class="dv2-user-avatar" id="v2-user-avatar">MZ</div>
    <div>
      <div class="dv2-user-name" id="v2-nav-user-top">Učitavam...</div>
      <div class="dv2-user-role" id="v2-role-chip-top"></div>
    </div>
  </div>
</div>
```

Ukloni stari `<div class="dv2-nav-brand-user">` i `<div class="dv2-role-chip">` iz sidebar-a — ti podaci su sada u topbaru. Zadrži `id="v2-nav-user"` i `id="v2-role-chip"` u sidebaru ako ih JS koristi, ali ih možeš sakriti sa `style="display:none"`.

### 3.3 Dodaj KPI sub-linije u topbar

Pronađi existing KPI div sa `id="v2-topbar-balance"` i dodaj `dv2-kpi-sub` span ispod `dv2-kpi-val`:

```html
<div class="dv2-kpi" style="padding-left:18px">
  <div class="dv2-kpi-lbl">Stanje blagajne</div>
  <div class="dv2-kpi-val v-in" id="v2-topbar-balance">—</div>
  <div class="dv2-kpi-sub" id="v2-topbar-balance-sub"></div>
</div>
```

Pattern primeniti konzistentno na sve KPI div-ove u topbaru koji imaju sekundarnu informaciju.

### 3.4 Detail panel — dodaj tab sistem

Svuda u kodu gde postoji `.v2-detail-panel`, izmeni strukturu da ima:
1. Topbar s naslovom, status badge-om, Actions dropdown i X dugmetom
2. Chip-ove za metapodatke (vreme, vrsta, korisnik, valuta, razlika)
3. Tab navigaciju: Pregled / Apoeni / Zapisnik (i Valute gde je primenljivo)
4. Tabbed content panes

Primer za knjiga detail panel (`#v2-knjiga-detail` ili ekvivalent):

```html
<div class="v2-card v2-detail-panel" id="v2-knjiga-detail">
  <!-- Topbar -->
  <div class="v2-dp-topbar">
    <span class="v2-dp-title">Detalji stavke</span>
    <button class="v2-dp-actions-dropdown" id="v2-knjiga-dp-actions">
      Akcije <i class="ti ti-chevron-down" aria-hidden="true"></i>
    </button>
    <button class="v2-dp-close" id="v2-knjiga-dp-close" aria-label="Zatvori">
      <i class="ti ti-x" aria-hidden="true"></i>
    </button>
  </div>
  <!-- Status + metadata chips -->
  <div class="v2-dp-header" id="v2-knjiga-dp-header">
    <div class="v2-dp-status">
      <span class="v2-badge v2-b-posted" id="v2-knjiga-dp-status">—</span>
    </div>
    <div class="v2-dp-chip">
      <i class="ti ti-clock" aria-hidden="true"></i>
      <div>
        <div class="v2-dp-chip-label">Vreme</div>
        <div class="v2-dp-chip-val" id="v2-knjiga-dp-time">—</div>
      </div>
    </div>
    <div class="v2-dp-chip">
      <i class="ti ti-tag" aria-hidden="true"></i>
      <div>
        <div class="v2-dp-chip-label">Vrsta</div>
        <div class="v2-dp-chip-val" id="v2-knjiga-dp-type">—</div>
      </div>
    </div>
    <div class="v2-dp-chip">
      <i class="ti ti-user" aria-hidden="true"></i>
      <div>
        <div class="v2-dp-chip-label">Korisnik</div>
        <div class="v2-dp-chip-val" id="v2-knjiga-dp-user">—</div>
      </div>
    </div>
    <div class="v2-dp-chip">
      <i class="ti ti-coins" aria-hidden="true"></i>
      <div>
        <div class="v2-dp-chip-label">Valuta</div>
        <div class="v2-dp-chip-val" id="v2-knjiga-dp-cur">—</div>
      </div>
    </div>
    <div class="v2-dp-chip">
      <i class="ti ti-arrows-diff" aria-hidden="true"></i>
      <div>
        <div class="v2-dp-chip-label">Razlika</div>
        <div class="v2-dp-chip-val" id="v2-knjiga-dp-diff">—</div>
      </div>
    </div>
  </div>
  <!-- Tabs -->
  <div class="v2-dp-tabs">
    <div class="v2-dp-tab active" data-dp-tab="pregled">Pregled</div>
    <div class="v2-dp-tab" data-dp-tab="apoeni">Apoeni</div>
    <div class="v2-dp-tab" data-dp-tab="zapisnik">Zapisnik</div>
  </div>
  <!-- Tab panes -->
  <div class="v2-dp-body">
    <div class="v2-dp-pane active" id="v2-knjiga-dp-pregled"></div>
    <div class="v2-dp-pane" id="v2-knjiga-dp-apoeni"></div>
    <div class="v2-dp-pane" id="v2-knjiga-dp-zapisnik"></div>
  </div>
  <!-- Actions footer -->
  <div class="v2-detail-actions" id="v2-knjiga-dp-footer"></div>
</div>
```

Primeniti isti pattern na detail panele za: Nalozi, Zahtevi, Smene.

---

## 4. Izmene `scripts-v2.html`

### 4.1 Avatar inicijali

U JS bootstrap funkciji gde se postavlja `v2-nav-user`, dodati i postavljanje avatara:

```javascript
var avatar = document.getElementById('v2-user-avatar');
if (avatar && data.user && data.user.email) {
  var parts = String(data.user.email).split('@')[0].split('.');
  var initials = parts.map(function(p) { return p.charAt(0).toUpperCase(); }).slice(0,2).join('');
  avatar.textContent = initials || '?';
}
var roleChipTop = document.getElementById('v2-role-chip-top');
if (roleChipTop && data.user) { roleChipTop.textContent = data.user.role || ''; }
var userNameTop = document.getElementById('v2-nav-user-top');
if (userNameTop && data.user) { userNameTop.textContent = data.user.email || ''; }
```

### 4.2 Tab switching u detail panelu

Dodati generičku tab switch funkciju (koristiti za sve detail panele):

```javascript
function v2InitDetailTabs(containerSelector) {
  var container = typeof containerSelector === 'string'
    ? document.querySelector(containerSelector)
    : containerSelector;
  if (!container) return;
  container.querySelectorAll('[data-dp-tab]').forEach(function(tab) {
    tab.addEventListener('click', function() {
      container.querySelectorAll('[data-dp-tab]').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var pane = tab.dataset.dpTab;
      container.querySelectorAll('.v2-dp-pane').forEach(function(p) { p.classList.remove('active'); });
      var target = container.querySelector('#' + container.id + '-' + pane)
        || container.querySelector('[id$="-' + pane + '"]');
      if (target) target.classList.add('active');
    });
  });
}
```

Pozvati `v2InitDetailTabs` za svaki detail panel pri inicijalizaciji.

### 4.3 Apoeni tabela render helper

Dodati globalnu funkciju za renderovanje apoena tabele (koristi se u Presek stanja, Smena, i svuda gdje su apoeni):

```javascript
function v2RenderDenomTable(denominations, currency, calculatedBalance) {
  if (!denominations || !denominations.length) {
    return '<div style="padding:12px;font-size:12px;color:var(--v2-text-3)">Nema unetih apoena za ' + currency + '</div>';
  }
  var totalCounted = denominations.reduce(function(s, d) {
    return s + Number(d.denomination || d.d || 0) * Number(d.quantity || d.q || 0);
  }, 0);
  var diff = calculatedBalance !== undefined ? (totalCounted - calculatedBalance) : null;
  var rows = denominations.map(function(d) {
    var denom = Number(d.denomination || d.d || 0);
    var qty   = Number(d.quantity   || d.q || 0);
    var total = denom * qty;
    return '<tr>'
      + '<td>' + v2Fmt(denom) + ' ' + currency + '</td>'
      + '<td>' + qty + '</td>'
      + '<td>' + v2Fmt(calculatedBalance !== undefined ? 0 : 0) + '</td>'
      + '<td>' + v2Fmt(total) + '</td>'
      + '<td class="' + (diff !== null ? (Math.abs(diff) < 0.001 ? 'diff-ok' : diff > 0 ? 'diff-surplus' : 'diff-shortage') : '') + '">—</td>'
      + '</tr>';
  }).join('');
  var totalCls = diff !== null ? (Math.abs(diff) < 0.001 ? 'diff-ok' : diff > 0 ? 'diff-surplus' : 'diff-shortage') : '';
  return '<table class="v2-denom-table">'
    + '<thead><tr><th>Apoen</th><th>Komada</th><th>Očekivano</th><th>Popisano</th><th>Razlika</th></tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '<tfoot><tr class="denom-total">'
    + '<td>Ukupno ' + currency + '</td>'
    + '<td>' + denominations.reduce(function(s,d){return s+Number(d.quantity||d.q||0);},0) + '</td>'
    + '<td>' + (calculatedBalance !== undefined ? v2Fmt(calculatedBalance) : '—') + '</td>'
    + '<td>' + v2Fmt(totalCounted) + '</td>'
    + '<td class="' + totalCls + '">' + (diff !== null ? (diff >= 0 ? '+' : '') + v2Fmt(diff) : '—') + '</td>'
    + '</tr></tfoot>'
    + '</table>';
}
```

### 4.4 Paginacija helper

```javascript
function v2RenderPagination(containerId, currentPage, totalItems, pageSize, onPageChange) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  var from = (currentPage - 1) * pageSize + 1;
  var to   = Math.min(currentPage * pageSize, totalItems);
  var pages = '';
  for (var p = 1; p <= totalPages && p <= 7; p++) {
    pages += '<button class="v2-page-btn' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
  }
  container.innerHTML =
    '<span class="v2-pagination-info">Prikazano ' + from + '–' + to + ' od ' + totalItems + '</span>'
    + '<button class="v2-page-btn" data-page="' + (currentPage - 1) + '" '
    +   (currentPage <= 1 ? 'disabled' : '') + '><i class="ti ti-chevron-left" aria-hidden="true"></i></button>'
    + pages
    + '<button class="v2-page-btn" data-page="' + (currentPage + 1) + '" '
    +   (currentPage >= totalPages ? 'disabled' : '') + '><i class="ti ti-chevron-right" aria-hidden="true"></i></button>'
    + '<span class="v2-page-size"><select onchange="(' + onPageChange.toString() + ')(this.value)">'
    + [10,20,50].map(function(s){return '<option value="'+s+'"'+(s===pageSize?' selected':'')+'>'+s+' po strani</option>';}).join('')
    + '</select></span>';
  container.querySelectorAll('[data-page]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var pg = parseInt(btn.dataset.page);
      if (pg >= 1 && pg <= totalPages) onPageChange(pageSize, pg);
    });
  });
}
```

---

## 5. Napomene o light mode

Novi CSS ne koristi `[data-theme="dark"]` selektor — tamna tema je jedina tema. `data-theme` toggle dugme može ostati u HTML-u ali nema vizuelnog efekta. Ako u budućnosti treba light mode, biće implementiran u posebnom tasku.

---

## 6. Šta NE raditi

- Ne menjati nijedan `.gs` fajl
- Ne menjati `scripts.html`, `styles.html`, `desktop.html`, `mobile.html`
- Ne dodavati nove `<link>` ili `<script>` tagove u `desktop-v2.html` (Tabler Icons je već uključen)
- Ne koristiti `localStorage`
- Ne koristiti `-filled` Tabler ikone

---

## 7. Verifikacija

Pokrenuti na `?view=desktop-v2` i proveriti:

1. Cela aplikacija ima tamnu pozadinu (#111827) — bez bele pozadine ni u jednom delu
2. Topbar prikazuje: stanje blagajne, naloge, smenu, promet dana — sa odgovarajućim bojama (zelena/crvena/žuta)
3. Topbar desno prikazuje: blagajna select, valuta select, sat, bell ikona, user chip sa inicijalima
4. Sidebar nav: aktivan item ima plavu levu bordu + blagi plavi background highlight
5. Knjiga tabela: header ćelije u uppercase, hover highlight, selected row ima plavi tint
6. Status badge ima dot prefix (●) i zaobljene ivice
7. Dugmad: ghost button ima providnu pozadinu, hover beli tint; primary button je plav
8. Detail panel (ako je otvoren): prikazuje topbar + chips + tabove + tabbed content
9. Tabele sa apoenima koriste 5 kolona: Apoen, Komada, Očekivano, Popisano, Razlika
10. Dark mode toggle nema efekta (tamna je jedina tema) — dugme može ostati ali nije funkcionalno
