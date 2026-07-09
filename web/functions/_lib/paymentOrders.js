import { insertAuditLog } from './audit.js';
import { encodeEq, supabaseRest } from './supabase.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

export class BusinessError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const REQUEST_STATUSES_BLOCKING_ORDER = [
  'CANCELLED',
  'REJECTED',
  'RETURNED_FOR_CORRECTION',
  'ORDER_CREATED',
  'CONVERTED_TO_ORDER',
  'PAID'
];

const INVALID_CASHBOX_IDS = ['', 'FROM_REQUEST'];

export async function findRequestById(env, requestId) {
  const rows = await supabaseRest(env, '/payment_requests?select=*&request_id=' + encodeEq(requestId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

export async function findOrderById(env, orderId) {
  const rows = await supabaseRest(env, '/payment_orders?select=*&order_id=' + encodeEq(orderId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

export async function assertActiveCashbox(env, cashboxId) {
  const rows = await supabaseRest(env, '/cashboxes?select=cashbox_id,active&cashbox_id=' + encodeEq(cashboxId) + '&limit=1');
  const cashbox = rows && rows.length ? rows[0] : null;
  if (!cashbox || cashbox.active !== true) {
    throw new BusinessError('Blagajna nije aktivna: ' + cashboxId, 400);
  }
}

export async function assertActiveCurrency(env, currency) {
  const rows = await supabaseRest(env, '/currencies?select=currency_code,active&currency_code=' + encodeEq(currency) + '&limit=1');
  const row = rows && rows.length ? rows[0] : null;
  if (!row || row.active !== true) {
    throw new BusinessError('Valuta nije aktivna: ' + currency, 400);
  }
}

function resolveCashboxId(request, data, actor) {
  const candidates = [
    data.cashbox_id,
    data.preferred_cashbox_id,
    request && request.preferred_cashbox_id,
    data.default_cashbox_id,
    actor && actor.default_cashbox_id,
    'CB_MAIN'
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value && INVALID_CASHBOX_IDS.indexOf(value) === -1) {
      return value;
    }
  }
  throw new BusinessError('Nije moguće odrediti blagajnu za nalog iz zahteva.', 400);
}

export async function assertNoActiveOrderForRequest(env, requestId) {
  const rows = await supabaseRest(
    env,
    '/payment_orders?select=order_id,status&source_request_id=' + encodeEq(requestId)
  );
  const active = (rows || []).filter((order) => order.status !== 'CANCELLED');
  if (active.length) {
    throw new BusinessError('Payment Request already has active payment order: ' + active[0].order_id, 409);
  }
}

export async function createPaymentOrderFromRequestCore(env, requestId, orderData, actor, session) {
  const data = orderData || {};
  const request = await findRequestById(env, requestId);
  if (!request) throw new BusinessError('Payment Request nije pronađen: ' + requestId, 404);

  if (REQUEST_STATUSES_BLOCKING_ORDER.indexOf(request.status) !== -1) {
    throw new BusinessError('Status zahteva ne dozvoljava kreiranje naloga: ' + request.status, 409);
  }
  if (request.linked_order_id) {
    throw new BusinessError('Zahtev već ima povezan nalog: ' + request.linked_order_id, 409);
  }
  await assertNoActiveOrderForRequest(env, requestId);

  const cashboxId = resolveCashboxId(request, data, actor);
  await assertActiveCashbox(env, cashboxId);

  const amountOrdered = Number(data.amount_ordered || request.amount);
  const currency = data.currency || request.currency;
  await assertActiveCurrency(env, currency);
  if (!(amountOrdered > 0)) throw new BusinessError('Iznos naloga mora biti veći od nule.', 400);

  const payToName = String(data.pay_to_name || request.requested_for_name || '').trim();
  const purpose = String(data.purpose || request.purpose || '').trim();
  if (!payToName) throw new BusinessError('pay_to_name je obavezan.', 400);
  if (!purpose) throw new BusinessError('purpose je obavezan.', 400);

  const now = new Date().toISOString();
  const order = {
    order_id: makeId('ORD'),
    created_at: now,
    created_by: actor.email || actor.user_code || '',
    source_request_id: request.request_id,
    linked_request_id: request.request_id,
    order_type: 'FROM_REQUEST',
    cashbox_id: cashboxId,
    pay_to_name: payToName,
    amount_ordered: amountOrdered,
    amount_paid: 0,
    currency,
    purpose,
    description: [request.description, data.description].filter(Boolean).join('\n'),
    due_date: data.due_date || request.needed_by_date || null,
    priority: data.priority || request.priority || 'NORMAL',
    status: 'WAITING_PAYMENT',
    issued_by: actor.email || actor.user_code || '',
    issued_at: now,
    document_status: data.document_status || 'NONE',
    updated_at: now
  };

  const orderRows = await supabaseRest(env, '/payment_orders', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(order)
  });
  const createdOrder = orderRows && orderRows.length ? orderRows[0] : order;

  const requestUpdates = {
    status: 'ORDER_CREATED',
    linked_order_id: createdOrder.order_id,
    approval_path: 'PAYMENT_ORDER',
    updated_at: now
  };
  const requestRows = await supabaseRest(env, '/payment_requests?request_id=' + encodeEq(requestId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(requestUpdates)
  });
  const updatedRequest = requestRows && requestRows.length ? requestRows[0] : Object.assign({}, request, requestUpdates);

  await insertAuditLog(env, {
    action: 'CREATE',
    entityType: 'PAYMENT_ORDERS',
    entityId: createdOrder.order_id,
    newValue: createdOrder,
    comment: 'Payment order created and issued from payment request. Order does not affect cashbox balance.',
    actor,
    session
  });
  await insertAuditLog(env, {
    action: 'UPDATE',
    entityType: 'PAYMENT_REQUESTS',
    entityId: requestId,
    oldValue: request,
    newValue: updatedRequest,
    comment: 'Payment request converted to payment order.',
    actor,
    session
  });

  return createdOrder;
}

export async function createDirectPaymentOrderCore(env, data, actor, session) {
  const cashboxId = String(data.cashbox_id || '').trim();
  const payToName = String(data.pay_to_name || '').trim();
  const purpose = String(data.purpose || '').trim();
  const amountOrdered = Number(data.amount_ordered || 0);
  const currency = data.currency;
  if (!cashboxId) throw new BusinessError('cashbox_id je obavezan.', 400);
  if (!payToName) throw new BusinessError('pay_to_name je obavezan.', 400);
  if (!purpose) throw new BusinessError('purpose je obavezan.', 400);
  if (!(amountOrdered > 0)) throw new BusinessError('amount_ordered mora biti veći od nule.', 400);
  await assertActiveCurrency(env, currency);
  await assertActiveCashbox(env, cashboxId);

  const now = new Date().toISOString();
  const order = {
    order_id: makeId('ORD'),
    created_at: now,
    created_by: actor.email || actor.user_code || '',
    source_request_id: null,
    linked_request_id: null,
    order_type: 'DIRECT_ORDER',
    cashbox_id: cashboxId,
    pay_to_name: payToName,
    amount_ordered: amountOrdered,
    amount_paid: 0,
    currency,
    purpose,
    description: data.description || '',
    due_date: data.due_date || null,
    priority: data.priority || 'NORMAL',
    status: 'DRAFT',
    document_status: data.document_status || 'NONE',
    updated_at: now
  };
  const rows = await supabaseRest(env, '/payment_orders', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(order)
  });
  const created = rows && rows.length ? rows[0] : order;
  await insertAuditLog(env, {
    action: 'CREATE',
    entityType: 'PAYMENT_ORDERS',
    entityId: created.order_id,
    newValue: created,
    comment: 'Direct payment order created. Order does not affect cashbox balance.',
    actor,
    session
  });
  return created;
}

export async function updateDraftPaymentOrderCore(env, orderId, data, actor, session) {
  const order = await findOrderById(env, orderId);
  if (!order) throw new BusinessError('Nalog nije pronađen: ' + orderId, 404);
  if (order.status !== 'DRAFT') throw new BusinessError('Samo DRAFT nalog može da se izmeni.', 409);

  const cashboxId = String(data.cashbox_id || '').trim();
  const payToName = String(data.pay_to_name || '').trim();
  const purpose = String(data.purpose || '').trim();
  const amountOrdered = Number(data.amount_ordered || 0);
  const currency = data.currency;
  if (!cashboxId) throw new BusinessError('cashbox_id je obavezan.', 400);
  if (!payToName) throw new BusinessError('pay_to_name je obavezan.', 400);
  if (!purpose) throw new BusinessError('purpose je obavezan.', 400);
  if (!(amountOrdered > 0)) throw new BusinessError('amount_ordered mora biti veći od nule.', 400);
  await assertActiveCurrency(env, currency);
  await assertActiveCashbox(env, cashboxId);

  const updates = {
    cashbox_id: cashboxId,
    pay_to_name: payToName,
    amount_ordered: amountOrdered,
    currency,
    purpose,
    description: data.description || '',
    due_date: data.due_date || null,
    document_status: data.document_status || order.document_status || 'NONE',
    updated_at: new Date().toISOString()
  };
  const rows = await supabaseRest(env, '/payment_orders?order_id=' + encodeEq(orderId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(updates)
  });
  const updated = rows && rows.length ? rows[0] : Object.assign({}, order, updates);
  await insertAuditLog(env, {
    action: 'UPDATE',
    entityType: 'PAYMENT_ORDERS',
    entityId: orderId,
    oldValue: order,
    newValue: updated,
    comment: 'Draft payment order updated by ' + (actor.email || '') + '.',
    actor,
    session
  });
  return updated;
}

export async function issuePaymentOrderCore(env, orderId, actor, session) {
  const order = await findOrderById(env, orderId);
  if (!order) throw new BusinessError('Nalog nije pronađen: ' + orderId, 404);
  if (order.status !== 'DRAFT') throw new BusinessError('Samo DRAFT nalog može da se odobri.', 409);
  const now = new Date().toISOString();
  const updates = { status: 'WAITING_PAYMENT', issued_by: actor.email || actor.user_code || '', issued_at: now, updated_at: now };
  const rows = await supabaseRest(env, '/payment_orders?order_id=' + encodeEq(orderId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(updates)
  });
  const updated = rows && rows.length ? rows[0] : Object.assign({}, order, updates);
  await insertAuditLog(env, {
    action: 'SUBMIT',
    entityType: 'PAYMENT_ORDERS',
    entityId: orderId,
    oldValue: order,
    newValue: updated,
    comment: 'Payment order approved. Approved order still does not affect balance and must be sent to cashier before payment.',
    actor,
    session
  });
  return updated;
}

export async function listPaymentOrdersCore(env, filters) {
  const rows = await supabaseRest(env, '/payment_orders?select=*&order=created_at.desc');
  let orders = rows || [];
  const allowed = ['status', 'cashbox_id', 'currency', 'order_type', 'source_request_id'];
  Object.keys(filters || {}).forEach((field) => {
    if (allowed.indexOf(field) !== -1 && filters[field]) {
      orders = orders.filter((order) => String(order[field]) === String(filters[field]));
    }
  });
  return orders;
}

export async function getPaymentOrderTimelineCore(env, orderId) {
  const order = await findOrderById(env, orderId);
  if (!order) throw new BusinessError('Nalog nije pronađen: ' + orderId, 404);

  const events = [];
  events.push({ label: 'Nalog kreiran', at: order.created_at, by: order.created_by, tone: '' });
  if (order.issued_at || order.status !== 'DRAFT') {
    events.push({ label: 'Nalog odobren', at: order.issued_at || order.created_at, by: order.issued_by || order.created_by, tone: '' });
  }

  const auditRows = await supabaseRest(
    env,
    '/audit_log?select=timestamp,user,comment&entity_type=eq.PAYMENT_ORDERS&entity_id=' + encodeEq(orderId) + '&order=timestamp.asc'
  );
  (auditRows || []).forEach((log) => {
    const comment = String(log.comment || '');
    if (comment.indexOf('sent to cashier as pending ISPLATA') !== -1) {
      events.push({ label: 'Poslato blagajni na isplatu', at: log.timestamp, by: log.user, tone: 'warning' });
    }
    if (comment.indexOf('Insufficient balance') !== -1) {
      events.push({ label: 'Nedovoljno sredstava za isplatu', at: log.timestamp, by: log.user, tone: 'danger' });
    }
    if (comment.indexOf('cash payment execution') !== -1 || comment.indexOf('Pending ISPLATA executed') !== -1) {
      events.push({ label: 'Stvarna isplata izvršena', at: log.timestamp, by: log.user, tone: 'success' });
    }
  });

  const cashRows = await supabaseRest(
    env,
    '/cash_events?select=status,created_at,created_by,posted_at,posted_by&linked_order_id=' + encodeEq(orderId) + '&event_type=eq.CASH_OUTFLOW'
  );
  (cashRows || []).forEach((event) => {
    if (event.status === 'SUBMITTED') {
      events.push({ label: 'Pending ISPLATA čeka blagajnika', at: event.created_at, by: event.created_by, tone: 'warning' });
    }
    if (event.status === 'POSTED' || event.status === 'LOCKED') {
      events.push({ label: 'CASH_OUTFLOW proknjižen', at: event.posted_at || event.created_at, by: event.posted_by || event.created_by, tone: 'success' });
    }
  });

  if (order.status === 'REJECTED_BY_CASHIER') {
    events.push({ label: 'Odbijen od blagajne', at: order.updated_at || order.created_at, by: order.executed_by || order.issued_by || order.created_by, tone: 'danger' });
  }
  if (order.status === 'CANCELLED') {
    events.push({ label: 'Otkazan', at: order.updated_at || order.created_at, by: order.issued_by || order.created_by, tone: 'danger' });
  }

  return events.sort((left, right) => new Date(left.at || 0) - new Date(right.at || 0));
}
