import { insertAuditLog } from './audit.js';
import { encodeEq, supabaseRest } from './supabase.js';
import { BusinessError, assertActiveCashbox, assertActiveCurrency, createPaymentOrderFromRequestCore, findRequestById } from './paymentOrders.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

const DIRECT_APPROVAL_LIMITS = {
  RSD: 30000,
  EUR: 100
};

export const OPEN_REVIEW_STATUSES = ['SUBMITTED', 'IN_REVIEW', 'CASHIER_REVIEW', 'ESCALATED_TO_ORDER', 'APPROVED'];

export function getDirectLimit(currency) {
  return DIRECT_APPROVAL_LIMITS[String(currency || 'RSD')] ?? DIRECT_APPROVAL_LIMITS.RSD;
}

export function isWithinDirectLimit(amount, currency) {
  const value = Number(amount || 0);
  return value > 0 && value <= getDirectLimit(currency);
}

export function getApprovalPath(amount, currency) {
  const value = Number(amount || 0);
  if (!(value > 0)) return 'UNDECIDED';
  return isWithinDirectLimit(value, currency) ? 'AUTO_ORDER' : 'PAYMENT_ORDER';
}

function canOwnRequest(request, actor) {
  return request.created_by === actor.email || (actor.user_id && request.requester_user_id === actor.user_id);
}

export async function createPaymentRequestCore(env, data, actor, session) {
  const requestedForName = String(data.requested_for_name || '').trim();
  const purpose = String(data.purpose || '').trim();
  const amount = Number(data.amount || 0);
  const currency = data.currency;
  const priority = data.priority || 'NORMAL';
  const cashboxId = data.preferred_cashbox_id || data.cashbox_id || '';

  if (!requestedForName) throw new BusinessError('requested_for_name je obavezan.', 400);
  if (!purpose) throw new BusinessError('purpose je obavezan.', 400);
  if (!(amount > 0)) throw new BusinessError('amount mora biti veći od nule.', 400);
  await assertActiveCurrency(env, currency);
  if (['NORMAL', 'URGENT', 'VERY_URGENT'].indexOf(priority) === -1) {
    throw new BusinessError('Nepoznat prioritet: ' + priority, 400);
  }
  if (cashboxId) await assertActiveCashbox(env, cashboxId);

  const now = new Date().toISOString();
  const record = {
    request_id: makeId('REQ'),
    created_at: now,
    created_by: actor.email || actor.user_code || '',
    requester_user_id: data.requester_user_id || actor.user_id || null,
    requested_for_name: requestedForName,
    amount,
    currency,
    purpose,
    description: data.description || '',
    preferred_cashbox_id: cashboxId || null,
    needed_by_date: data.needed_by_date || null,
    priority,
    status: 'DRAFT',
    approval_path: getApprovalPath(amount, currency),
    document_status: data.document_status || 'NONE',
    updated_at: now
  };

  const rows = await supabaseRest(env, '/payment_requests', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(record)
  });
  const created = rows && rows.length ? rows[0] : record;

  await insertAuditLog(env, {
    action: 'CREATE',
    entityType: 'PAYMENT_REQUESTS',
    entityId: created.request_id,
    newValue: created,
    comment: 'Payment request created. Request does not affect cashbox balance.',
    actor,
    session
  });

  return created;
}

async function updateRequestWithAudit(env, requestId, before, updates, action, comment, actor, session) {
  const rows = await supabaseRest(env, '/payment_requests?request_id=' + encodeEq(requestId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(updates)
  });
  const updated = rows && rows.length ? rows[0] : Object.assign({}, before, updates);
  await insertAuditLog(env, {
    action,
    entityType: 'PAYMENT_REQUESTS',
    entityId: requestId,
    oldValue: before,
    newValue: updated,
    comment,
    actor,
    session
  });
  return updated;
}

export async function submitPaymentRequestCore(env, requestId, actor, session) {
  const request = await findRequestById(env, requestId);
  if (!request) throw new BusinessError('Zahtev nije pronađen: ' + requestId, 404);
  if (request.status !== 'DRAFT') throw new BusinessError('Zahtev nije u statusu DRAFT.', 409);
  if (!canOwnRequest(request, actor)) throw new BusinessError('Nemate pravo da šaljete ovaj zahtev.', 403);

  if (!request.requested_for_name || !(Number(request.amount) > 0) || !request.purpose) {
    throw new BusinessError('Zahtev nije kompletan za slanje.', 400);
  }
  if (!request.description || String(request.description).trim().length < 10) {
    throw new BusinessError('Opis mora imati najmanje 10 karaktera.', 400);
  }
  if (request.preferred_cashbox_id) await assertActiveCashbox(env, request.preferred_cashbox_id);

  const now = new Date().toISOString();
  const submitted = await updateRequestWithAudit(
    env,
    requestId,
    request,
    { status: 'SUBMITTED', approval_path: getApprovalPath(request.amount, request.currency), updated_at: now },
    'SUBMIT',
    'Payment request submitted for review.',
    actor,
    session
  );

  if (isWithinDirectLimit(submitted.amount, submitted.currency)) {
    await createPaymentOrderFromRequestCore(
      env,
      requestId,
      { cashbox_id: submitted.preferred_cashbox_id || actor.default_cashbox_id, auto_from_request: true },
      actor,
      session
    );
    return findRequestById(env, requestId);
  }

  return updateRequestWithAudit(
    env,
    requestId,
    submitted,
    { status: 'ESCALATED_TO_ORDER', approval_path: 'PAYMENT_ORDER', updated_at: new Date().toISOString() },
    'UPDATE',
    'Payment request exceeds limit and waits for higher approval before payment order creation.',
    actor,
    session
  );
}

export async function updatePaymentRequestCore(env, requestId, data, actor, session) {
  const request = await findRequestById(env, requestId);
  if (!request) throw new BusinessError('Zahtev nije pronađen: ' + requestId, 404);
  if (request.status !== 'DRAFT') throw new BusinessError('Samo DRAFT zahtev može da se izmeni.', 409);
  if (!canOwnRequest(request, actor)) throw new BusinessError('Nemate pravo da izmenite ovaj zahtev.', 403);

  const updates = {};
  if (data.requested_for_name !== undefined) {
    const value = String(data.requested_for_name || '').trim();
    if (!value) throw new BusinessError('requested_for_name je obavezan.', 400);
    updates.requested_for_name = value;
  }
  if (data.amount !== undefined) {
    const value = Number(data.amount);
    if (!(value > 0)) throw new BusinessError('amount mora biti veći od nule.', 400);
    updates.amount = value;
  }
  if (data.currency !== undefined) {
    await assertActiveCurrency(env, data.currency);
    updates.currency = data.currency;
  }
  if (data.purpose !== undefined) {
    const value = String(data.purpose || '').trim();
    if (!value) throw new BusinessError('purpose je obavezan.', 400);
    updates.purpose = value;
  }
  if (data.description !== undefined) updates.description = data.description || '';
  if (data.preferred_cashbox_id !== undefined || data.cashbox_id !== undefined) {
    const cashboxId = data.preferred_cashbox_id || data.cashbox_id || '';
    if (cashboxId) await assertActiveCashbox(env, cashboxId);
    updates.preferred_cashbox_id = cashboxId || null;
  }
  if (data.needed_by_date !== undefined) updates.needed_by_date = data.needed_by_date || null;
  if (data.priority !== undefined) {
    if (['NORMAL', 'URGENT', 'VERY_URGENT'].indexOf(data.priority) === -1) {
      throw new BusinessError('Nepoznat prioritet: ' + data.priority, 400);
    }
    updates.priority = data.priority;
  }
  if (data.document_status !== undefined) updates.document_status = data.document_status;

  const nextAmount = updates.amount !== undefined ? updates.amount : request.amount;
  const nextCurrency = updates.currency !== undefined ? updates.currency : request.currency;
  updates.approval_path = getApprovalPath(nextAmount, nextCurrency);
  updates.updated_at = new Date().toISOString();

  return updateRequestWithAudit(
    env,
    requestId,
    request,
    updates,
    'UPDATE',
    'Payment request draft updated. Request does not affect cashbox balance.',
    actor,
    session
  );
}

export async function approvePaymentRequestCore(env, requestId, approvalData, actor, session) {
  const request = await findRequestById(env, requestId);
  if (!request) throw new BusinessError('Zahtev nije pronađen: ' + requestId, 404);
  if (OPEN_REVIEW_STATUSES.indexOf(request.status) === -1) {
    throw new BusinessError('Zahtev nije u statusu koji dozvoljava odobravanje.', 409);
  }

  const now = new Date().toISOString();
  const approved = await updateRequestWithAudit(
    env,
    requestId,
    request,
    {
      status: 'APPROVED',
      approval_path: getApprovalPath(request.amount, request.currency),
      reviewed_by: actor.email || actor.user_code || '',
      reviewed_at: now,
      rejection_reason: '',
      updated_at: now
    },
    'APPROVE',
    'Payment request approved. Approval does not create payment order and does not affect balance.',
    actor,
    session
  );

  const data = approvalData || {};
  await createPaymentOrderFromRequestCore(
    env,
    requestId,
    { cashbox_id: data.cashbox_id || approved.preferred_cashbox_id || actor.default_cashbox_id, auto_from_request: true },
    actor,
    session
  );
  return findRequestById(env, requestId);
}

export async function rejectPaymentRequestCore(env, requestId, reason, actor, session) {
  const request = await findRequestById(env, requestId);
  if (!request) throw new BusinessError('Zahtev nije pronađen: ' + requestId, 404);
  if (OPEN_REVIEW_STATUSES.indexOf(request.status) === -1) {
    throw new BusinessError('Zahtev nije u statusu koji dozvoljava odbijanje.', 409);
  }
  const reasonText = String(reason || '').trim();
  if (!reasonText) throw new BusinessError('Razlog odbijanja je obavezan.', 400);
  const now = new Date().toISOString();
  return updateRequestWithAudit(
    env,
    requestId,
    request,
    { status: 'REJECTED', reviewed_by: actor.email || actor.user_code || '', reviewed_at: now, rejection_reason: reasonText, updated_at: now },
    'REJECT',
    'Payment request rejected.',
    actor,
    session
  );
}

export async function returnPaymentRequestForCorrectionCore(env, requestId, note, actor, session) {
  const request = await findRequestById(env, requestId);
  if (!request) throw new BusinessError('Zahtev nije pronađen: ' + requestId, 404);
  if (OPEN_REVIEW_STATUSES.indexOf(request.status) === -1) {
    throw new BusinessError('Zahtev nije u statusu koji dozvoljava vraćanje na korekciju.', 409);
  }
  const noteText = String(note || '').trim();
  if (!noteText) throw new BusinessError('Napomena je obavezna.', 400);
  const now = new Date().toISOString();
  return updateRequestWithAudit(
    env,
    requestId,
    request,
    { status: 'RETURNED_FOR_CORRECTION', reviewed_by: actor.email || actor.user_code || '', reviewed_at: now, returned_for_correction_reason: noteText, updated_at: now },
    'UPDATE',
    'Payment request returned for correction.',
    actor,
    session
  );
}

export async function listMyPaymentRequestsCore(env, actor) {
  if (!actor.email) return [];
  const rows = await supabaseRest(
    env,
    '/payment_requests?select=*&created_by=' + encodeEq(actor.email) + '&order=created_at.desc'
  );
  return rows || [];
}

export async function listRequestsForApprovalCore(env) {
  const rows = await supabaseRest(env, '/payment_requests?select=*&order=created_at.desc');
  return (rows || [])
    .filter((record) => OPEN_REVIEW_STATUSES.indexOf(record.status) !== -1)
    .sort((left, right) => {
      const leftUrgent = left.priority === 'URGENT' || left.priority === 'VERY_URGENT' ? 1 : 0;
      const rightUrgent = right.priority === 'URGENT' || right.priority === 'VERY_URGENT' ? 1 : 0;
      if (leftUrgent !== rightUrgent) return rightUrgent - leftUrgent;
      return new Date(right.created_at) - new Date(left.created_at);
    });
}

export async function listPaymentRequestsCore(env, filters, actor) {
  const rows = await supabaseRest(env, '/payment_requests?select=*&order=created_at.desc');
  let records = rows || [];

  if (actor.role === 'REQUESTER') {
    records = records.filter((record) => record.created_by === actor.email || record.requester_user_id === actor.user_id);
  }

  const data = filters || {};
  ['status', 'currency', 'preferred_cashbox_id', 'approval_path', 'linked_order_id'].forEach((field) => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      records = records.filter((record) => record[field] === data[field]);
    }
  });
  if (data.cashbox_id) {
    records = records.filter((record) => record.preferred_cashbox_id === data.cashbox_id);
  }

  return records.map((record) => Object.assign({}, record, {
    approval_path: record.approval_path || getApprovalPath(record.amount, record.currency),
    cashbox_id: record.cashbox_id || record.preferred_cashbox_id || ''
  }));
}
