// Shared sign convention for cash_events balance math.
//
// A "storno" (reversal) event is stored with the SAME `direction` as the event it
// corrects - e.g. a storno of an "uplata" (IN) is itself also stored as IN - so that it
// renders in the same Uplata/Isplata column as the original on the Knjiga screen
// (Uplata 100 / Storno uplata -100, both in the Uplata column). See
// web/functions/api/cash-events/reverse.js for where these are created.
//
// Because the stored direction no longer tells you which way the money actually moved
// for a reversal row, every place that folds cash_events into a running balance or a
// total (the `cashbox_balances` SQL view, this file, cashSheet.js, dailyClosing.js,
// api/reports/cash-movements.js) needs to invert the normal direction-based sign when
// event_type === 'REVERSAL'. These two helpers are the single source of truth for that
// so the rule can't drift out of sync between call sites again.

export function cashEventDelta(event) {
  if (!event) return 0;
  const amount = Number(event.amount || 0);
  if (!amount) return 0;
  const base = event.direction === 'OUT' ? -amount : event.direction === 'IN' ? amount : 0;
  return event.event_type === 'REVERSAL' ? -base : base;
}

export function cashEventDisplayAmount(event) {
  if (!event) return 0;
  const amount = Number(event.amount || 0);
  return event.event_type === 'REVERSAL' ? -amount : amount;
}
