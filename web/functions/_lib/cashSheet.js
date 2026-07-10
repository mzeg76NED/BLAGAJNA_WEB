import { encodeEq, supabaseRest } from './supabase.js';
import { scopeCashboxForUser } from './reports.js';
import { getCashCountsReportCore } from './cashCounts.js';

// "Blagajnički list" (cash sheet) - a single-shift or single-day printable summary:
// opening balance, all movements, totals by type, expected vs. physical closing
// balance. Ported field-for-field from Reports.gs getCashSheetReport and its helpers
// (resolveCashSheetScope_, calculateBalanceSnapshotForScope_, isCashSheetInformationalEvent_,
// selectCashSheetPhysicalCount_). This is a read-only report; it never creates, updates
// or deletes anything. Deliberately NOT reusing/modifying the existing, already-working
// api/reports/cash-movements.js endpoint (used by the Knjiga screen) - this module fetches
// and shapes its own event rows so the cash sheet's more involved scoping (shift-range,
// reversal display-flip, merged CASH_COUNT rows) can't regress the cashbook report.

function safeNumber(value) {
  const number = Number(value || 0);
  return isFinite(number) ? number : 0;
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return isFinite(time) ? time : 0;
}

function normalizeDateKey(value) {
  return String(value || '').slice(0, 10);
}

function isDateInRange(value, dateFrom, dateTo) {
  const date = normalizeDateKey(value);
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

function isBalanceAffecting(event) {
  return event.status === 'POSTED' || event.status === 'LOCKED';
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function findShift(env, shiftId) {
  const rows = await supabaseRest(env, '/shifts?select=*&shift_id=' + encodeEq(shiftId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function fetchAllCashEventsAscending(env, cashboxId, currency) {
  let path = '/cash_events?select=*';
  if (cashboxId) path += '&cashbox_id=' + encodeEq(cashboxId);
  if (currency) path += '&currency=' + encodeEq(currency);
  path += '&order=event_date.asc,created_at.asc&limit=5000';
  return (await supabaseRest(env, path)) || [];
}

// --- scope resolution (shift window takes priority over an explicit date range) ---

function resolveScope(filters, shift) {
  if (shift) {
    return {
      openedAt: shift.opened_at,
      closedAt: shift.closed_at || shift.handover_at || '',
      dateFrom: '',
      dateTo: ''
    };
  }
  return {
    openedAt: '',
    closedAt: '',
    dateFrom: filters.date_from || '',
    dateTo: filters.date_to || ''
  };
}

function isEventInScope(event, eventTime, scope) {
  if (scope.openedAt) {
    const opened = toTime(scope.openedAt);
    const closed = scope.closedAt ? toTime(scope.closedAt) : Number.MAX_SAFE_INTEGER;
    return eventTime >= opened && eventTime <= closed;
  }
  return isDateInRange(event.event_date || event.created_at, scope.dateFrom, scope.dateTo);
}

function isEventBeforeScope(event, eventTime, scope) {
  if (scope.openedAt) return eventTime < toTime(scope.openedAt);
  if (!scope.dateFrom) return false;
  return normalizeDateKey(event.event_date || event.created_at) < scope.dateFrom;
}

// Walk the FULL ascending history once: find the running balance the moment the scope
// starts (openingBalance), and the running balance at the last in-scope event
// (closingBalance). hasScopedEvents tells the caller whether any event actually fell
// inside the scope at all (used to decide whether the ledger-derived closing balance
// is trustworthy or whether to fall back to the totals-derived expected balance).
function calculateBalanceSnapshotForScope(eventsAscending, scope) {
  let running = 0;
  let openingBalance = 0;
  let closingBalance = 0;
  let seenScope = false;

  eventsAscending.forEach((event) => {
    const eventTime = toTime(event.event_date || event.created_at);
    const inScope = isEventInScope(event, eventTime, scope);
    if (!seenScope && inScope) {
      openingBalance = running;
      seenScope = true;
    }
    if (isBalanceAffecting(event)) {
      running += event.direction === 'OUT' ? -safeNumber(event.amount) : event.direction === 'IN' ? safeNumber(event.amount) : 0;
    }
    if (inScope) {
      closingBalance = running;
    } else if (!seenScope && isEventBeforeScope(event, eventTime, scope)) {
      openingBalance = running;
      closingBalance = running;
    }
  });

  if (!seenScope) {
    closingBalance = openingBalance;
  }

  return { openingBalance, closingBalance, hasScopedEvents: seenScope };
}

// --- row shaping (mirrors legacy getCashMovementsReport row construction) ---

function buildEventRow(event, index, runningBalance) {
  const amount = safeNumber(event.amount);
  const isReversal = event.event_type === 'REVERSAL' && event.reversal_of_event_id;
  // A reversal is displayed as if it moved cash the OPPOSITE way from its own stored
  // direction, with a negated amount - visually "undoing" the original line on the
  // printed sheet, rather than showing as an extra same-direction movement.
  const displayDirection = isReversal ? (event.direction === 'OUT' ? 'IN' : 'OUT') : event.direction;
  const displayAmount = isReversal ? -amount : amount;
  return {
    event_date: event.event_date || event.created_at || '',
    event_id: event.event_id || '',
    entry_number: index + 1,
    event_type: event.event_type || '',
    direction: event.direction || '',
    amount,
    signed_amount: event.direction === 'OUT' ? -amount : amount,
    display_direction: displayDirection,
    display_amount: displayAmount,
    running_balance: runningBalance === undefined || runningBalance === null ? null : Number(runningBalance),
    cashbox_id: event.cashbox_id || '',
    currency: event.currency || '',
    partner_name: event.partner_name || '',
    description: event.description || '',
    linked_order_id: event.linked_order_id || '',
    reversal_of_event_id: event.reversal_of_event_id || '',
    status: event.status || '',
    document_status: event.document_status || '',
    posted_by: event.posted_by || '',
    posted_at: event.posted_at || '',
    created_by: event.created_by || '',
    created_at: event.created_at || '',
    source_type: 'CASH_EVENT'
  };
}

function cashCountDescription(count) {
  if (count.count_type === 'SHIFT_OPENING') return 'OTVARANJE SMENE - POPIS';
  if (count.count_type === 'SHIFT_CLOSING') return 'ZATVARANJE SMENE - POPIS';
  return 'KONTROLNI PRESEK - POPIS';
}

function buildCountRow(count) {
  return {
    event_date: count.posted_at || count.created_at || '',
    event_id: count.count_id || '',
    entry_number: '',
    event_type: 'CASH_COUNT',
    count_type: count.count_type || '',
    direction: 'COUNT',
    amount: safeNumber(count.counted_cash_total),
    signed_amount: 0,
    display_direction: 'COUNT',
    display_amount: 0,
    running_balance: safeNumber(count.counted_cash_total),
    cashbox_id: count.cashbox_id || '',
    currency: count.currency || '',
    partner_name: 'Presek blagajne',
    description: cashCountDescription(count),
    linked_order_id: '',
    reversal_of_event_id: '',
    status: count.status || '',
    document_status: '',
    posted_by: count.posted_by || count.created_by || '',
    posted_at: count.posted_at || count.created_at || '',
    created_by: count.created_by || '',
    created_at: count.created_at || '',
    source_type: 'CASH_COUNT'
  };
}

// A cash-count-driven CORRECTION event (auto-posted VIŠAK/MANJAK from createCashCountsCore)
// is "informational" for the sheet's totals - it's already reflected via the physical
// count comparison at the bottom of the sheet, so counting it again in total_in/total_out
// would double-count the same discrepancy. Detected the same way the legacy sheet does:
// by the CNT-... count-id reference (or a presek/popis keyword) baked into the description.
function isCashCountCorrectionEvent(event) {
  const text = String(event.description || '') + ' ' + String(event.partner_name || '');
  return /CNT-[A-Za-z0-9-]+/i.test(text) || /presek|popis|po[cč]etak smene|zavr[sš]ni popis/i.test(text);
}

function isInformationalEvent(event) {
  if (!event) return true;
  if (event.source_type === 'CASH_COUNT' || event.event_type === 'CASH_COUNT') return true;
  if (event.event_type === 'CORRECTION') return isCashCountCorrectionEvent(event);
  return false;
}

function selectPhysicalCount(counts, isShiftSheet) {
  const rows = counts || [];
  if (!rows.length) return null;
  if (isShiftSheet) {
    const closing = rows.filter((count) => count.count_type === 'SHIFT_CLOSING');
    if (closing.length) return closing[0];
  }
  return rows[0];
}

export async function getCashSheetReportCore(env, user, filters) {
  filters = filters || {};
  const cashboxId = scopeCashboxForUser(user, filters.cashbox_id);
  const currency = filters.currency || 'RSD';
  const shiftId = String(filters.shift_id || '').trim();

  const shift = shiftId ? await findShift(env, shiftId) : null;
  if (shiftId && !shift) {
    throw Object.assign(new Error('Smena nije pronađena: ' + shiftId), { status: 404 });
  }

  const dateKey = filters.date || filters.closing_date || todayIso();
  const dateFrom = filters.date_from || dateKey;
  const dateTo = filters.date_to || dateKey;

  const allEventsAscending = await fetchAllCashEventsAscending(env, cashboxId, currency);
  const scope = resolveScope({ date_from: dateFrom, date_to: dateTo }, shift);
  const balanceSnapshot = calculateBalanceSnapshotForScope(allEventsAscending, scope);

  // Running balance per event, folded over the FULL ascending history (same idea as
  // reports/cash-movements.js fetchRunningBalances) so each displayed row's running
  // total reflects true chronological order, not just the scoped subset.
  const runningByEventId = {};
  let runningTotal = 0;
  allEventsAscending.forEach((event) => {
    if (isBalanceAffecting(event)) {
      runningTotal += event.direction === 'OUT' ? -safeNumber(event.amount) : event.direction === 'IN' ? safeNumber(event.amount) : 0;
    }
    runningByEventId[event.event_id] = runningTotal;
  });

  const eventRowsAll = allEventsAscending.map((event, index) => buildEventRow(event, index, runningByEventId[event.event_id]));

  const countsAll = await getCashCountsReportCore(env, {
    cashbox_id: cashboxId,
    currency
  });
  const countRowsAll = countsAll
    .filter((count) => !count.adjustment_event_id)
    .map((count) => buildCountRow(count));

  // Scope + sort desc, exactly like getCashMovementsReport: shift range (if any) AND
  // date range both apply, balance-affecting cash events only (count rows always pass).
  const events = eventRowsAll
    .concat(countRowsAll)
    .filter((row) => {
      if (row.source_type === 'CASH_EVENT' && !isBalanceAffecting({ status: row.status })) return false;
      const eventTime = toTime(row.event_date);
      const inShiftRange = shift ? isEventInScope(row, eventTime, scope) : true;
      return inShiftRange && isDateInRange(row.event_date, dateFrom, dateTo);
    })
    .sort((left, right) => toTime(right.event_date) - toTime(left.event_date))
    .slice(0, 500);

  const openingBalances = shift && shift.opening_balance_json && typeof shift.opening_balance_json === 'object'
    ? shift.opening_balance_json
    : {};
  const openingBalance = shift && Object.prototype.hasOwnProperty.call(openingBalances, currency)
    ? safeNumber(openingBalances[currency])
    : balanceSnapshot.openingBalance;

  const totals = events.reduce((result, event) => {
    if (isInformationalEvent(event)) return result;
    const amount = safeNumber(event.display_amount !== undefined ? event.display_amount : event.amount);
    const signed = safeNumber(event.signed_amount);
    if (event.event_type === 'TREASURY_HANDOVER') {
      result.treasury += Math.abs(amount);
    } else if (event.event_type === 'REVERSAL') {
      result.reversal += signed;
    } else if ((event.display_direction || event.direction) === 'IN') {
      result.inflow += Math.abs(amount);
    } else if ((event.display_direction || event.direction) === 'OUT') {
      result.outflow += Math.abs(amount);
    }
    return result;
  }, { inflow: 0, outflow: 0, treasury: 0, surplus: 0, shortage: 0, reversal: 0 });

  const expectedClosingBalance = openingBalance + totals.inflow - totals.outflow - totals.treasury + totals.reversal;

  const counts = await getCashCountsReportCore(env, {
    cashbox_id: cashboxId,
    currency,
    shift_id: shiftId || undefined,
    date_from: dateFrom,
    date_to: dateTo
  });
  const latestCount = selectPhysicalCount(counts, Boolean(shift));
  const physical = latestCount ? safeNumber(latestCount.counted_total) : null;
  const physicalDifference = latestCount ? physical - expectedClosingBalance : null;

  return {
    document_no: 'BL-' + dateKey.replace(/-/g, '') + '-' + (shiftId || 'DAN') + '-' + currency,
    date: dateKey,
    cashbox_id: cashboxId || '',
    currency,
    shift,
    status: latestCount ? (Math.abs(physicalDifference) < 0.000001 ? 'SPREMAN ZA ZAKLJUČENJE' : 'NEUSAGLAŠEN') : 'U TOKU',
    opening_balance: openingBalance,
    total_in: totals.inflow,
    total_out: totals.outflow,
    total_treasury: totals.treasury,
    total_surplus: totals.surplus,
    total_shortage: totals.shortage,
    total_reversal: totals.reversal,
    expected_closing_balance: expectedClosingBalance,
    calculated_closing_balance: expectedClosingBalance,
    ledger_closing_balance: balanceSnapshot.hasScopedEvents ? balanceSnapshot.closingBalance : expectedClosingBalance,
    physical_total: physical,
    difference: latestCount ? physicalDifference : null,
    latest_count: latestCount,
    events
  };
}
