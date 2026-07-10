import { encodeEq, supabaseRest } from './supabase.js';

// Daily closing workflow, ported from src/DailyClosing.gs. Daily closing records the
// calculated vs. physical balance for one cashbox/currency/date; it does not create cash
// movement and does not change cash event amounts - it only locks the included POSTED
// events (flips them to LOCKED, same status used by reverse.js's LOCKED_REVERSAL_ROLES gate).
export const DAILY_CLOSING_PREPARE_ROLES = ['CASHIER_SUPERVISOR', 'FINANCE', 'DIRECTOR', 'ADMIN', 'CASHIER'];
export const DAILY_CLOSING_CLOSE_ROLES = ['CASHIER_SUPERVISOR', 'FINANCE', 'DIRECTOR', 'ADMIN'];

export class BusinessError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status || 400;
  }
}

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

function normalizeDateKey(dateValue) {
  if (!dateValue) throw new BusinessError('closing_date je obavezan.', 400);
  const text = String(dateValue).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new BusinessError('Nevažeći closing_date: ' + dateValue, 400);
  return parsed.toISOString().slice(0, 10);
}

async function assertActiveCashbox(env, cashboxId) {
  const rows = await supabaseRest(env, '/cashboxes?select=cashbox_id&cashbox_id=' + encodeEq(cashboxId) + '&active=eq.true&limit=1');
  if (!rows || !rows.length) throw new BusinessError('Blagajna nije aktivna ili ne postoji.', 400);
}

async function assertActiveCurrency(env, currency) {
  const rows = await supabaseRest(env, '/currencies?select=currency_code&currency_code=' + encodeEq(currency) + '&active=eq.true&limit=1');
  if (!rows || !rows.length) throw new BusinessError('Valuta nije aktivna ili ne postoji.', 400);
}

async function buildContext(env, cashboxId, currency, closingDate) {
  const cleanCashboxId = String(cashboxId || '').trim();
  const cleanCurrency = String(currency || '').trim();
  if (!cleanCashboxId) throw new BusinessError('Blagajna je obavezna.', 400);
  if (!cleanCurrency) throw new BusinessError('Valuta je obavezna.', 400);
  await assertActiveCashbox(env, cleanCashboxId);
  await assertActiveCurrency(env, cleanCurrency);
  return {
    cashboxId: cleanCashboxId,
    currency: cleanCurrency,
    closingDate: normalizeDateKey(closingDate)
  };
}

async function findDailyClosing(env, cashboxId, currency, closingDate) {
  const rows = await supabaseRest(
    env,
    '/daily_closing?select=*&cashbox_id=' + encodeEq(cashboxId) +
      '&currency=' + encodeEq(currency) +
      '&closing_date=' + encodeEq(closingDate) +
      '&status=neq.CANCELLED&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function findOpenShift(env, cashboxId) {
  const rows = await supabaseRest(env, '/shifts?select=shift_id&cashbox_id=' + encodeEq(cashboxId) + '&status=eq.OPEN&limit=1');
  return rows && rows.length ? rows[0] : null;
}

// Balance-affecting cash events: POSTED or LOCKED (mirrors isCashEventBalanceAffecting
// from legacy CashEvents.gs / the cashbox_balances view definition).
async function calculateOpeningBalanceBeforeDate(env, cashboxId, currency, closingDateKey) {
  const rows = await supabaseRest(
    env,
    '/cash_events?select=amount,direction,event_date,status&cashbox_id=' + encodeEq(cashboxId) +
      '&currency=' + encodeEq(currency) +
      '&status=in.(POSTED,LOCKED)&order=event_date.asc&limit=10000'
  );
  return (rows || []).reduce((balance, event) => {
    const dateKey = String(event.event_date || '').slice(0, 10);
    if (dateKey >= closingDateKey) return balance;
    const amount = Number(event.amount || 0);
    if (event.direction === 'IN') return balance + amount;
    if (event.direction === 'OUT') return balance - amount;
    return balance;
  }, 0);
}

async function getCashEventsForDate(env, cashboxId, currency, closingDateKey) {
  const rows = await supabaseRest(
    env,
    '/cash_events?select=*&cashbox_id=' + encodeEq(cashboxId) +
      '&currency=' + encodeEq(currency) +
      '&status=eq.POSTED&order=event_date.asc&limit=10000'
  );
  return (rows || []).filter((event) => String(event.event_date || '').slice(0, 10) === closingDateKey);
}

function calculateDailyTotals(events) {
  return (events || []).reduce((totals, event) => {
    const amount = Number(event.amount || 0);
    if (event.direction === 'IN') totals.total_in += amount;
    else if (event.direction === 'OUT') totals.total_out += amount;
    return totals;
  }, { total_in: 0, total_out: 0 });
}

async function buildDailyClosingPreview(env, cashboxId, currency, closingDateKey) {
  const openingBalance = await calculateOpeningBalanceBeforeDate(env, cashboxId, currency, closingDateKey);
  const events = await getCashEventsForDate(env, cashboxId, currency, closingDateKey);
  const totals = calculateDailyTotals(events);
  const calculatedBalance = openingBalance + totals.total_in - totals.total_out;
  return {
    cashbox_id: cashboxId,
    currency,
    closing_date: closingDateKey,
    opening_balance: openingBalance,
    total_in: totals.total_in,
    total_out: totals.total_out,
    calculated_balance: calculatedBalance,
    included_event_count: events.length,
    included_events: events
  };
}

export async function prepareDailyClosingCore(env, user, data) {
  if (!DAILY_CLOSING_PREPARE_ROLES.includes(user && user.role)) {
    throw new BusinessError('Nemate ovlašćenje za pregled dnevnog zaključka.', 403);
  }
  const context = await buildContext(env, data.cashbox_id, data.currency, data.closing_date);
  const existing = await findDailyClosing(env, context.cashboxId, context.currency, context.closingDate);
  if (existing) {
    throw new BusinessError(
      'Dnevni zaključak već postoji za ovu blagajnu/valutu/datum: ' + context.cashboxId + '/' + context.currency + '/' + context.closingDate,
      409
    );
  }
  return buildDailyClosingPreview(env, context.cashboxId, context.currency, context.closingDate);
}

async function insertAuditLog(env, action, entityType, entityId, oldValue, newValue, comment, user, session) {
  await supabaseRest(env, '/audit_log', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      log_id: makeId('LOG'),
      user: user.email || user.user_code || 'system',
      app_user_id: user.user_id || user.app_user_id || '',
      app_user_name: user.full_name || '',
      user_code: user.user_code || '',
      role: user.role || '',
      google_session_email: (session && session.google_session_email) || '',
      cashbox_id: (newValue && newValue.cashbox_id) || '',
      shift_id: (session && session.shift_id) || '',
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue || null,
      new_value: newValue || {},
      comment
    })
  });
}

async function lockCashEventsForClosing(env, events, closingId, actorEmail) {
  const now = new Date().toISOString();
  const lockedEventIds = [];
  for (const event of events || []) {
    if (event.status !== 'POSTED') continue;
    const rows = await supabaseRest(env, '/cash_events?event_id=' + encodeEq(event.event_id), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ status: 'LOCKED', locked_by: actorEmail, locked_at: now, updated_at: now })
    });
    const updated = rows && rows.length ? rows[0] : { ...event, status: 'LOCKED' };
    lockedEventIds.push(updated.event_id);
  }
  return { closing_id: closingId, locked_event_count: lockedEventIds.length, locked_event_ids: lockedEventIds };
}

export async function closeDailyCashboxCore(env, user, session, data) {
  if (!DAILY_CLOSING_CLOSE_ROLES.includes(user && user.role)) {
    throw new BusinessError('Nemate ovlašćenje za zaključavanje dana.', 403);
  }
  const context = await buildContext(env, data.cashbox_id, data.currency, data.closing_date);
  const physicalBalance = Number(data.physical_balance);
  if (!Number.isFinite(physicalBalance) || physicalBalance < 0) {
    throw new BusinessError('Fizičko stanje mora biti nenegativan broj.', 400);
  }

  const openShift = await findOpenShift(env, context.cashboxId);
  if (openShift) {
    throw new BusinessError('Blagajna ima otvorenu smenu. Zatvorite smenu pre dnevnog zaključka.', 409);
  }

  const existing = await findDailyClosing(env, context.cashboxId, context.currency, context.closingDate);
  if (existing) {
    throw new BusinessError(
      'Dnevni zaključak već postoji za ovu blagajnu/valutu/datum: ' + context.cashboxId + '/' + context.currency + '/' + context.closingDate,
      409
    );
  }

  const preview = await buildDailyClosingPreview(env, context.cashboxId, context.currency, context.closingDate);
  const difference = physicalBalance - preview.calculated_balance;
  const now = new Date().toISOString();
  const actorEmail = user.email || user.user_code || '';
  const closing = {
    closing_id: makeId('DCL'),
    closing_date: context.closingDate,
    cashbox_id: context.cashboxId,
    currency: context.currency,
    opening_balance: preview.opening_balance,
    total_in: preview.total_in,
    total_out: preview.total_out,
    calculated_balance: preview.calculated_balance,
    physical_balance: physicalBalance,
    difference,
    status: Math.abs(difference) > 0.000001 ? 'CLOSED_WITH_DIFFERENCE' : 'CLOSED',
    closed_by: actorEmail,
    closed_at: now,
    locked_by: null,
    locked_at: null,
    note: data.note || '',
    updated_at: null
  };

  const rows = await supabaseRest(env, '/daily_closing', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(closing)
  });
  const created = rows && rows.length ? rows[0] : closing;

  const lockSummary = await lockCashEventsForClosing(env, preview.included_events, created.closing_id, actorEmail);

  await insertAuditLog(env, 'CREATE', 'DAILY_CLOSING', created.closing_id, null, created,
    'Daily closing created. Closing does not create cash movement.', user, session);
  await insertAuditLog(env, 'LOCK', 'CASH_EVENTS', created.closing_id, null, lockSummary,
    'Daily closing locked included posted cash events.', user, session);

  return {
    closing: created,
    summary: {
      included_event_count: preview.included_event_count,
      locked_event_count: lockSummary.locked_event_count,
      locked_event_ids: lockSummary.locked_event_ids
    }
  };
}
