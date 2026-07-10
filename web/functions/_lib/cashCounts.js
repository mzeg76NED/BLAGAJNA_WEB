import { encodeEq, supabaseRest } from './supabase.js';
import { resolveMandatoryCountsForCashbox } from './mandatoryCount.js';

// Cash counts ("Presek stanja") are controlled physical inventory records. They are
// audit evidence and do not change cash event history by themselves - EXCEPT that a
// non-zero difference between the counted physical cash and the calculated live
// balance automatically posts a CORRECTION cash event, exactly like the legacy
// Google Apps Script implementation (CashCounts.gs). This module ports that logic
// faithfully to Postgres; unlike the Sheets version it does not need the
// "misalignment repair" layer since Postgres columns are typed/constrained.

export const CASH_COUNT_TYPES = ['SHIFT_OPENING', 'CASHBOX_COUNT', 'SHIFT_CLOSING', 'DAILY_CLOSING_COUNT'];

export class BusinessError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status || 400;
  }
}

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

function isDateInRange(value, dateFrom, dateTo) {
  const date = String(value || '').slice(0, 10);
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

async function findCashbox(env, cashboxId) {
  const rows = await supabaseRest(env, '/cashboxes?select=cashbox_id,active&cashbox_id=' + encodeEq(cashboxId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function findCurrency(env, currencyCode) {
  const rows = await supabaseRest(env, '/currencies?select=currency_code,active,denominations&currency_code=' + encodeEq(currencyCode) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function findActiveShiftForCashbox(env, cashboxId) {
  const rows = await supabaseRest(env, '/shifts?select=*&cashbox_id=' + encodeEq(cashboxId) + '&status=eq.OPEN&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function getCashboxBalance(env, cashboxId, currency) {
  const rows = await supabaseRest(
    env,
    '/cashbox_balances?select=balance&cashbox_id=' + encodeEq(cashboxId) + '&currency=' + encodeEq(currency) + '&limit=1'
  );
  return rows && rows.length ? Number(rows[0].balance || 0) : 0;
}

async function insertAuditLog(env, action, entityType, entityId, oldValue, newValue, comment, user, session, cashboxId) {
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
      cashbox_id: cashboxId || '',
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

function normalizeDenominationRows(allowedDenominations, rows) {
  const allowed = (allowedDenominations || []).map(String);
  return (rows || [])
    .map((row) => {
      const denomination = Number(row.denomination);
      const quantity = Number(row.quantity || 0);
      if (allowed.length && allowed.indexOf(String(denomination)) === -1) {
        throw new BusinessError('Nepodržan apoen za ovu valutu: ' + denomination, 400);
      }
      if (!(quantity >= 0) || !isFinite(quantity)) {
        throw new BusinessError('Količina apoena mora biti nenegativan broj.', 400);
      }
      return { denomination, quantity };
    })
    .filter((row) => row.quantity > 0);
}

function buildCorrectionEvent(countId, cashboxId, currency, difference, userEmail, now, note) {
  const numericDifference = Number(difference || 0);
  if (Math.abs(numericDifference) <= 0.000001) return null;
  const direction = numericDifference > 0 ? 'IN' : 'OUT';
  const amount = Math.abs(numericDifference);
  const label = numericDifference > 0 ? 'VIŠAK' : 'MANJAK';
  const description = 'PRESEK STANJA - KOREKCIJA - ' + label + ' ' + countId +
    '. Razlika: ' + numericDifference + ' ' + currency +
    (note ? '. Napomena: ' + String(note).trim() : '');
  return {
    event_id: makeId('CEV'),
    created_at: now,
    created_by: userEmail,
    event_date: now,
    event_type: 'CORRECTION',
    cashbox_id: cashboxId,
    currency,
    direction,
    amount,
    linked_request_id: null,
    linked_order_id: null,
    partner_name: 'Presek blagajne',
    description,
    document_status: 'NONE',
    status: 'POSTED',
    posted_by: userEmail,
    posted_at: now,
    locked_by: null,
    locked_at: null,
    reversal_of_event_id: null,
    updated_at: null
  };
}

// data: { cashbox_id, currency, count_type, shift_id?, note, denominations: [{currency, denomination, quantity}], include_all_currencies }
export async function createCashCountsCore(env, data, actor, session) {
  data = data || {};
  const cashboxId = String(data.cashbox_id || '').trim();
  if (!cashboxId) throw new BusinessError('Blagajna je obavezna.', 400);
  const cashbox = await findCashbox(env, cashboxId);
  if (!cashbox || !cashbox.active) throw new BusinessError('Blagajna nije aktivna.', 400);

  const countType = CASH_COUNT_TYPES.includes(data.count_type) ? data.count_type : 'CASHBOX_COUNT';

  const activeShift = await findActiveShiftForCashbox(env, cashboxId);
  if (countType !== 'SHIFT_OPENING' && !activeShift) {
    throw new BusinessError('Presek stanja nije dozvoljen bez aktivne smene.', 409);
  }

  const grouped = {};
  (data.denominations || []).forEach((row) => {
    const currency = row.currency || data.currency;
    if (!currency) return;
    if (!grouped[currency]) grouped[currency] = [];
    grouped[currency].push(row);
  });
  if (data.include_all_currencies) {
    const activeCurrencies = await supabaseRest(env, '/currencies?select=currency_code&active=eq.true');
    (activeCurrencies || []).forEach((row) => {
      if (row.currency_code && !grouped[row.currency_code]) grouped[row.currency_code] = [];
    });
  }
  const currencies = Object.keys(grouped).length ? Object.keys(grouped) : [data.currency || 'RSD'];

  // Snapshot every currency's balance up front, before any correction event from this
  // batch is posted - mirrors the legacy calculateCashboxBalances(cashboxId, currencies)
  // call so one currency's correction can't skew another currency's "before" balance.
  const balances = {};
  for (const currency of currencies) {
    balances[currency] = await getCashboxBalance(env, cashboxId, currency);
  }

  const now = new Date().toISOString();
  const created = [];
  for (const currency of currencies) {
    const currencyRow = await findCurrency(env, currency);
    if (!currencyRow || !currencyRow.active) throw new BusinessError('Valuta nije aktivna: ' + currency, 400);
    const denominations = normalizeDenominationRows(currencyRow.denominations, grouped[currency]);
    const countedCashTotal = denominations.reduce((total, row) => total + row.denomination * row.quantity, 0);
    const calculatedBalance = Number(balances[currency] || 0);
    const difference = countedCashTotal - calculatedBalance;
    const countId = makeId('CNT');
    const actorEmail = actor.email || actor.user_code || '';

    const correctionEvent = buildCorrectionEvent(countId, cashboxId, currency, difference, actorEmail, now, data.note);
    let insertedEvent = null;
    if (correctionEvent) {
      const eventRows = await supabaseRest(env, '/cash_events', {
        method: 'POST',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify(correctionEvent)
      });
      insertedEvent = eventRows && eventRows.length ? eventRows[0] : correctionEvent;
      await insertAuditLog(
        env, 'POST', 'CASH_EVENTS', insertedEvent.event_id, null, insertedEvent,
        'Automatic correction created from cash count: ' + countId, actor, session, cashboxId
      );
    }

    const record = {
      count_id: countId,
      created_at: now,
      created_by: actorEmail,
      count_type: countType,
      cashbox_id: cashboxId,
      shift_id: (activeShift && activeShift.shift_id) || data.shift_id || null,
      currency,
      counted_cash_total: countedCashTotal,
      check_count: 0,
      check_total: 0,
      calculated_balance_before: calculatedBalance,
      difference,
      denominations_json: denominations,
      adjustment_event_id: insertedEvent ? insertedEvent.event_id : null,
      note: data.note || '',
      status: 'POSTED',
      posted_by: actorEmail,
      posted_at: now,
      updated_at: null
    };

    const countRows = await supabaseRest(env, '/cash_counts', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(record)
    });
    const insertedCount = countRows && countRows.length ? countRows[0] : record;
    await insertAuditLog(
      env, 'POST', 'CASH_COUNTS', insertedCount.count_id, null, insertedCount,
      insertedEvent ? 'Cash count posted with automatic balance correction.' : 'Cash count posted without difference.',
      actor, session, cashboxId
    );

    created.push({
      ...insertedCount,
      counted_total: countedCashTotal,
      denominations
    });
  }

  // FAZA 3t: bilo koji presek stanja proknjizen ovde (bez obzira na count_type -
  // standalone "Novi presek", ili presek pri otvaranju/zatvaranju smene) automatski
  // razresava obavezan presek nalog za ovu blagajnu, ako postoji. Poziva se JEDNOM po
  // batch-u (sve valute u ovom pozivu dele isti cashboxId).
  if (created.length) {
    await resolveMandatoryCountsForCashbox(env, cashboxId, created[0].count_id, actor);
  }

  return created;
}

export async function getCashCountsReportCore(env, filters) {
  filters = filters || {};
  let path = '/cash_counts?select=*';
  if (filters.cashbox_id) path += '&cashbox_id=' + encodeEq(filters.cashbox_id);
  if (filters.currency) path += '&currency=' + encodeEq(filters.currency);
  if (filters.shift_id) path += '&shift_id=' + encodeEq(filters.shift_id);
  path += '&order=posted_at.desc.nullslast,created_at.desc&limit=1000';

  const rows = await supabaseRest(env, path);
  return (rows || [])
    .filter((row) => isDateInRange(row.posted_at || row.created_at, filters.date_from, filters.date_to))
    .map((row) => ({
      ...row,
      counted_total: Number(row.counted_cash_total || 0),
      denominations: Array.isArray(row.denominations_json) ? row.denominations_json : []
    }));
}
