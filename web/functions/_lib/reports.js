import { encodeEq, supabaseRest } from './supabase.js';

// Read-only operational reports, ported from src/Reports.gs. Reports must not create,
// update or delete business records. Postgres has typed/constrained columns so, unlike
// the legacy Sheets version, these do not need any row-shape "misalignment repair" layer.

function safeNumber(value) {
  const number = Number(value || 0);
  return isFinite(number) ? number : 0;
}

function isDateInRange(value, dateFrom, dateTo) {
  const date = String(value || '').slice(0, 10);
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

// A CASHIER may only see reports scoped to their own default cashbox - mirrors legacy
// normalizeReportFilters_. Other roles are unrestricted at the report-filter level (the
// underlying queries are already scoped by whatever cashbox_id/currency filter is passed).
// Exported so other report modules (e.g. cashSheet.js) can reuse the same access rule.
export function scopeCashboxForUser(user, requestedCashboxId) {
  if (user && user.role === 'CASHIER' && user.default_cashbox_id) {
    if (requestedCashboxId && requestedCashboxId !== user.default_cashbox_id) {
      throw Object.assign(new Error('Blagajnik može da vidi izveštaje samo za svoju podrazumevanu blagajnu.'), { status: 403 });
    }
    return user.default_cashbox_id;
  }
  return requestedCashboxId || '';
}

function sortByPriorityAndDate(rows) {
  return rows.slice().sort((left, right) => {
    const leftUrgent = left.priority === 'URGENT' || left.priority === 'VERY_URGENT' ? 1 : 0;
    const rightUrgent = right.priority === 'URGENT' || right.priority === 'VERY_URGENT' ? 1 : 0;
    if (leftUrgent !== rightUrgent) return rightUrgent - leftUrgent;
    return String(right.created_at || '').localeCompare(String(left.created_at || ''));
  });
}

export async function getOpenPaymentRequestsReportCore(env, user, filters) {
  // Legacy getOpenPaymentRequestsReport does not filter by cashbox_id (requests aren't
  // tied to a cashbox until they become an order) - scopeCashboxForUser is called only
  // for its CASHIER-role access-check side effect, mirroring normalizeReportFilters_.
  scopeCashboxForUser(user, filters.cashbox_id);
  let path = "/payment_requests?select=request_id,ref_no,created_at,created_by,requested_for_name,amount,currency,purpose,priority,status,document_status&status=in.(DRAFT,SUBMITTED,IN_REVIEW,APPROVED)";
  if (filters.currency) path += '&currency=' + encodeEq(filters.currency);
  path += '&order=created_at.desc&limit=500';
  const rows = await supabaseRest(env, path);
  return sortByPriorityAndDate(rows || []);
}

export async function getRequestsForApprovalReportCore(env, user, filters) {
  scopeCashboxForUser(user, filters.cashbox_id);
  let path = "/payment_requests?select=request_id,ref_no,created_at,created_by,requested_for_name,amount,currency,purpose,priority,status,document_status&status=in.(SUBMITTED,IN_REVIEW)";
  if (filters.currency) path += '&currency=' + encodeEq(filters.currency);
  path += '&order=created_at.desc&limit=500';
  const rows = await supabaseRest(env, path);
  return sortByPriorityAndDate(rows || []);
}

export async function getOrdersWaitingPaymentReportCore(env, user, filters) {
  const cashboxId = scopeCashboxForUser(user, filters.cashbox_id);
  let path = "/payment_orders?select=order_id,ref_no,source_request_id,cashbox_id,pay_to_name,amount_ordered,amount_paid,currency,purpose,due_date,priority,status,document_status&status=in.(WAITING_PAYMENT,PARTIALLY_PAID)";
  if (cashboxId) path += '&cashbox_id=' + encodeEq(cashboxId);
  if (filters.currency) path += '&currency=' + encodeEq(filters.currency);
  path += '&order=created_at.desc&limit=500';
  const rows = await supabaseRest(env, path);
  const mapped = (rows || []).map((order) => ({
    order_id: order.order_id,
    ref_no: order.ref_no || null,
    source_request_id: order.source_request_id,
    cashbox_id: order.cashbox_id,
    pay_to_name: order.pay_to_name,
    amount_ordered: safeNumber(order.amount_ordered),
    amount_paid: safeNumber(order.amount_paid),
    remaining_amount: safeNumber(order.amount_ordered) - safeNumber(order.amount_paid),
    currency: order.currency,
    purpose: order.purpose,
    due_date: order.due_date,
    priority: order.priority,
    status: order.status,
    document_status: order.document_status
  }));
  return sortByPriorityAndDate(mapped);
}

export async function getExecutedPaymentsReportCore(env, user, filters) {
  const cashboxId = scopeCashboxForUser(user, filters.cashbox_id);
  let path = "/cash_events?select=event_id,event_date,cashbox_id,currency,amount,partner_name,description,linked_order_id,linked_request_id,status,document_status,posted_by,posted_at&event_type=eq.CASH_OUTFLOW&status=in.(POSTED,LOCKED)";
  if (cashboxId) path += '&cashbox_id=' + encodeEq(cashboxId);
  if (filters.currency) path += '&currency=' + encodeEq(filters.currency);
  path += '&order=event_date.desc&limit=500';
  const rows = await supabaseRest(env, path);
  const partnerText = String(filters.pay_to_name || filters.partner_name || '').toLowerCase();
  return (rows || [])
    .filter((row) => !partnerText || String(row.partner_name || '').toLowerCase().includes(partnerText))
    .filter((row) => isDateInRange(row.event_date, filters.date_from, filters.date_to));
}

export async function getCorrectionsAndReversalsReportCore(env, user, filters) {
  const cashboxId = scopeCashboxForUser(user, filters.cashbox_id);
  let path = "/cash_events?select=event_id,event_date,event_type,cashbox_id,currency,direction,amount,reversal_of_event_id,description,status,posted_by,posted_at&or=(event_type.eq.CORRECTION,event_type.eq.REVERSAL,status.eq.REVERSED)";
  if (cashboxId) path += '&cashbox_id=' + encodeEq(cashboxId);
  if (filters.currency) path += '&currency=' + encodeEq(filters.currency);
  path += '&order=event_date.desc&limit=500';
  const rows = await supabaseRest(env, path);
  return (rows || []).filter((row) => isDateInRange(row.event_date, filters.date_from, filters.date_to));
}

export async function getDailyClosingReportCore(env, user, filters) {
  const cashboxId = scopeCashboxForUser(user, filters.cashbox_id);
  let path = "/daily_closing?select=closing_id,closing_date,cashbox_id,currency,opening_balance,total_in,total_out,calculated_balance,physical_balance,difference,status,closed_by,closed_at";
  if (cashboxId) path += '&cashbox_id=' + encodeEq(cashboxId);
  if (filters.currency) path += '&currency=' + encodeEq(filters.currency);
  if (filters.status) path += '&status=' + encodeEq(filters.status);
  path += '&order=closing_date.desc&limit=500';
  const rows = await supabaseRest(env, path);
  return (rows || []).filter((row) => isDateInRange(row.closing_date, filters.date_from, filters.date_to));
}

export async function getDifferencesReportCore(env, user, filters) {
  const closings = (await getDailyClosingReportCore(env, user, filters))
    .filter((closing) => Math.abs(safeNumber(closing.difference)) > 0.000001)
    .map((closing) => ({
      source_type: 'DAILY_CLOSING',
      source_id: closing.closing_id,
      date: closing.closing_date,
      cashbox_id: closing.cashbox_id,
      currency: closing.currency,
      calculated_balance: safeNumber(closing.calculated_balance),
      physical_balance: safeNumber(closing.physical_balance),
      difference: safeNumber(closing.difference),
      status: closing.status
    }));

  const cashboxId = scopeCashboxForUser(user, filters.cashbox_id);
  let shiftPath = "/shifts?select=shift_id,cashbox_id,status,opened_at,closed_at,handover_at,difference_json";
  if (cashboxId) shiftPath += '&cashbox_id=' + encodeEq(cashboxId);
  const shifts = await supabaseRest(env, shiftPath);
  const shiftDifferences = (shifts || [])
    .filter((shift) => hasShiftDifference(shift))
    .map((shift) => ({
      source_type: 'SHIFT',
      source_id: shift.shift_id,
      date: shift.closed_at || shift.handover_at || shift.opened_at,
      cashbox_id: shift.cashbox_id,
      currency: '',
      calculated_balance: '',
      physical_balance: '',
      difference: shift.difference_json,
      status: shift.status
    }));

  return closings.concat(shiftDifferences);
}

function hasShiftDifference(shift) {
  if (!shift.difference_json) return false;
  const diff = typeof shift.difference_json === 'object' ? shift.difference_json : (() => {
    try { return JSON.parse(shift.difference_json); } catch { return null; }
  })();
  if (!diff) return false;
  return Object.keys(diff).some((currency) => Math.abs(safeNumber(diff[currency])) > 0.000001);
}

export async function getMissingDocumentsReportCore(env, user, filters) {
  const cashboxId = scopeCashboxForUser(user, filters.cashbox_id);

  let requestPath = "/payment_requests?select=request_id,created_at,purpose,amount,currency,document_status&document_status=eq.MISSING";
  if (filters.currency) requestPath += '&currency=' + encodeEq(filters.currency);
  const requests = await supabaseRest(env, requestPath);

  let orderPath = "/payment_orders?select=order_id,created_at,purpose,amount_ordered,currency,cashbox_id,document_status&document_status=eq.MISSING";
  if (cashboxId) orderPath += '&cashbox_id=' + encodeEq(cashboxId);
  if (filters.currency) orderPath += '&currency=' + encodeEq(filters.currency);
  const orders = await supabaseRest(env, orderPath);

  let eventPath = "/cash_events?select=event_id,event_date,description,amount,currency,cashbox_id,document_status&document_status=eq.MISSING";
  if (cashboxId) eventPath += '&cashbox_id=' + encodeEq(cashboxId);
  if (filters.currency) eventPath += '&currency=' + encodeEq(filters.currency);
  const events = await supabaseRest(env, eventPath);

  const rows = [];
  (requests || []).forEach((row) => rows.push({
    entity_type: 'PAYMENT_REQUEST', entity_id: row.request_id, date: row.created_at,
    description: row.purpose, amount: safeNumber(row.amount), currency: row.currency, document_status: row.document_status
  }));
  (orders || []).forEach((row) => rows.push({
    entity_type: 'PAYMENT_ORDER', entity_id: row.order_id, date: row.created_at,
    description: row.purpose, amount: safeNumber(row.amount_ordered), currency: row.currency, document_status: row.document_status
  }));
  (events || []).forEach((row) => rows.push({
    entity_type: 'CASH_EVENT', entity_id: row.event_id, date: row.event_date,
    description: row.description, amount: safeNumber(row.amount), currency: row.currency, document_status: row.document_status
  }));
  return rows;
}

export async function getAuditExceptionsReportCore(env, user, filters) {
  const range = { dateFrom: filters.date_from || '', dateTo: filters.date_to || '' };

  const rejectedRequests = await supabaseRest(
    env,
    "/payment_requests?select=request_id,created_at,purpose,status&status=in.(REJECTED,CANCELLED)"
  );
  const rejectedOrders = await supabaseRest(
    env,
    "/payment_orders?select=order_id,created_at,purpose,status&status=in.(REJECTED_BY_CASHIER,CANCELLED)"
  );
  const cancelledDocuments = await supabaseRest(
    env,
    "/documents?select=document_id,created_at,file_name,status&status=eq.CANCELLED"
  );
  const correctionsAndReversals = await getCorrectionsAndReversalsReportCore(env, user, filters);
  const differences = await getDifferencesReportCore(env, user, filters);

  const rows = [];
  (rejectedRequests || [])
    .filter((row) => isDateInRange(row.created_at, range.dateFrom, range.dateTo))
    .forEach((row) => rows.push({
      exception_type: 'REJECTED_REQUEST', entity_type: 'PAYMENT_REQUEST', entity_id: row.request_id,
      date: row.created_at, description: row.purpose || '', status: row.status
    }));
  (rejectedOrders || [])
    .filter((row) => isDateInRange(row.created_at, range.dateFrom, range.dateTo))
    .forEach((row) => rows.push({
      exception_type: 'PAYMENT_ORDER_EXCEPTION', entity_type: 'PAYMENT_ORDER', entity_id: row.order_id,
      date: row.created_at, description: row.purpose || '', status: row.status
    }));
  (cancelledDocuments || [])
    .filter((row) => isDateInRange(row.created_at, range.dateFrom, range.dateTo))
    .forEach((row) => rows.push({
      exception_type: 'CANCELLED_DOCUMENT', entity_type: 'DOCUMENT', entity_id: row.document_id,
      date: row.created_at, description: row.file_name || '', status: row.status
    }));
  correctionsAndReversals.forEach((event) => rows.push({
    exception_type: event.event_type === 'CORRECTION' ? 'CORRECTION_EVENT' : 'REVERSAL_EVENT',
    entity_type: 'CASH_EVENT', entity_id: event.event_id, date: event.event_date,
    description: event.description, status: event.status
  }));
  differences.forEach((item) => rows.push({
    exception_type: 'DIFFERENCE', entity_type: item.source_type, entity_id: item.source_id,
    date: item.date, description: 'Difference: ' + item.difference, status: item.status
  }));
  return rows;
}

export async function getAuditLogCore(env, filters) {
  filters = filters || {};
  let path = '/audit_log?select=log_id,timestamp,user,app_user_name,user_code,role,cashbox_id,shift_id,action,entity_type,entity_id,comment';
  if (filters.entity_type) path += '&entity_type=' + encodeEq(filters.entity_type);
  if (filters.entity_id) path += '&entity_id=' + encodeEq(filters.entity_id);
  path += '&order=timestamp.desc&limit=' + (Number(filters.limit) > 0 && Number(filters.limit) <= 1000 ? Number(filters.limit) : 200);
  const rows = await supabaseRest(env, path);
  return (rows || []).filter((row) => isDateInRange(row.timestamp, filters.date_from, filters.date_to));
}

export async function getManagementDashboardSummaryCore(env, user, filters) {
  filters = filters || {};
  const cashboxId = scopeCashboxForUser(user, filters.cashbox_id);
  const dateKey = filters.date || new Date().toISOString().slice(0, 10);

  const cashboxes = await supabaseRest(env, '/cashboxes?select=cashbox_id,name&active=eq.true');
  const scopedCashboxes = (cashboxes || []).filter((c) => !cashboxId || c.cashbox_id === cashboxId);
  const cashboxIds = scopedCashboxes.map((c) => c.cashbox_id);
  const currencies = await supabaseRest(env, '/currencies?select=currency_code&active=eq.true');
  const scopedCurrencies = (currencies || []).filter((c) => !filters.currency || c.currency_code === filters.currency);

  const balanceRows = await supabaseRest(env, '/cashbox_balances?select=cashbox_id,currency,balance');
  const balanceIndex = {};
  (balanceRows || []).forEach((row) => { balanceIndex[row.cashbox_id + '|' + row.currency] = Number(row.balance || 0); });
  const balances = [];
  scopedCashboxes.forEach((cashbox) => {
    scopedCurrencies.forEach((currency) => {
      balances.push({
        cashbox_id: cashbox.cashbox_id,
        cashbox_name: cashbox.name || cashbox.cashbox_id,
        currency: currency.currency_code,
        balance: Number(balanceIndex[cashbox.cashbox_id + '|' + currency.currency_code] || 0)
      });
    });
  });

  const openRequests = await supabaseRest(env, "/payment_requests?select=currency&status=in.(DRAFT,SUBMITTED,IN_REVIEW,APPROVED)");
  const requestsForApproval = await supabaseRest(env, "/payment_requests?select=currency&status=in.(SUBMITTED,IN_REVIEW)");
  const ordersWaiting = await supabaseRest(env, "/payment_orders?select=currency,cashbox_id&status=in.(WAITING_PAYMENT,PARTIALLY_PAID)");
  const openShifts = await supabaseRest(env, "/shifts?select=cashbox_id&status=eq.OPEN");
  const dailyClosings = await supabaseRest(env, "/daily_closing?select=cashbox_id,currency,closing_date");
  const reversalEvents = await supabaseRest(env, "/cash_events?select=cashbox_id,currency,event_type,status,event_date,created_at");

  const missingDocuments = await getMissingDocumentsReportCore(env, user, filters);
  const differences = await getDifferencesReportCore(env, user, filters);

  const currencyFilterOk = (currency) => !filters.currency || currency === filters.currency;

  return {
    balances,
    openRequestsCount: (openRequests || []).filter((r) => currencyFilterOk(r.currency)).length,
    requestsForApprovalCount: (requestsForApproval || []).filter((r) => currencyFilterOk(r.currency)).length,
    ordersWaitingPaymentCount: (ordersWaiting || []).filter((o) => cashboxIds.includes(o.cashbox_id) && currencyFilterOk(o.currency)).length,
    missingDocumentsCount: missingDocuments.length,
    openShiftsCount: (openShifts || []).filter((s) => cashboxIds.includes(s.cashbox_id)).length,
    dailyClosingsTodayCount: (dailyClosings || []).filter((c) =>
      cashboxIds.includes(c.cashbox_id) && currencyFilterOk(c.currency) && String(c.closing_date || '').slice(0, 10) === dateKey
    ).length,
    differencesCount: differences.length,
    reversalsTodayCount: (reversalEvents || []).filter((e) =>
      cashboxIds.includes(e.cashbox_id) &&
      (!filters.currency || e.currency === filters.currency) &&
      (e.event_type === 'REVERSAL' || e.status === 'REVERSED') &&
      String(e.event_date || e.created_at || '').slice(0, 10) === dateKey
    ).length
  };
}
