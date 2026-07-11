import { encodeEq, supabaseRest } from './supabase.js';

// Najave uplate (payment announcements). A "najava" is a heads-up that a payment of a
// given amount is expected from a partner - it does NOT touch the cashbox balance by
// itself (it is not a cash_event), but it IS shown in the cashbook (Knjiga) as an
// informational row, the same way CASH_COUNT rows are merged into the cash sheet.
//
// Workflow (per user's explicit spec, 2026-07-10):
//   1. ANNOUNCER (or CASHIER, or an elevated role) creates a najava: amount, partner,
//      purpose - status OPEN.
//   2. Someone with payment_announcements:match posts "UPLATA" against it: enters the
//      ACTUAL amount received. This books as a NORMAL cash inflow (CASH_INFLOW), for
//      the actual amount - that is what actually happened in the drawer.
//   3. If actual != announced, the difference is recorded as its own CORRECTION event
//      (VIŠAK if actual > announced, MANJAK if actual < announced) - mirrors the exact
//      pattern used for Presek stanja (cash count) differences in cashCounts.js.
//   4. The announcement is marked MATCHED, remembering both event ids + the difference.

export class BusinessError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status || 400;
  }
}

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

function safeNumber(value) {
  const number = Number(value || 0);
  return isFinite(number) ? number : 0;
}

// ANNOUNCER and ASSISTANT_CASHIER are just as cashbox-bound as CASHIER - none of them
// should be able to browse another cashbox's announcements via a query param.
export function scopeCashboxForAnnouncements(user, requestedCashboxId) {
  const boundRoles = ['CASHIER', 'ANNOUNCER', 'ASSISTANT_CASHIER'];
  if (user && boundRoles.includes(user.role) && user.default_cashbox_id) {
    if (requestedCashboxId && requestedCashboxId !== user.default_cashbox_id) {
      throw new BusinessError('Možete videti najave samo za svoju podrazumevanu blagajnu.', 403);
    }
    return user.default_cashbox_id;
  }
  return requestedCashboxId || '';
}

async function findCashbox(env, cashboxId) {
  const rows = await supabaseRest(env, '/cashboxes?select=cashbox_id,active&cashbox_id=' + encodeEq(cashboxId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function findCurrency(env, currencyCode) {
  const rows = await supabaseRest(env, '/currencies?select=currency_code,active&currency_code=' + encodeEq(currencyCode) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function findOpenShift(env, cashboxId) {
  const rows = await supabaseRest(env, '/shifts?select=shift_id&cashbox_id=' + encodeEq(cashboxId) + '&status=eq.OPEN&limit=1');
  return rows && rows.length ? rows[0] : null;
}

export async function findAnnouncement(env, announcementId) {
  const rows = await supabaseRest(env, '/payment_announcements?select=*&announcement_id=' + encodeEq(announcementId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function insertAuditLog(env, action, entityId, oldValue, newValue, comment, actor, session, cashboxId) {
  await supabaseRest(env, '/audit_log', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      log_id: makeId('LOG'),
      user: actor.email || actor.user_code || 'system',
      app_user_id: actor.user_id || actor.app_user_id || '',
      app_user_name: actor.full_name || '',
      user_code: actor.user_code || '',
      role: actor.role || '',
      google_session_email: (session && session.google_session_email) || '',
      cashbox_id: cashboxId || '',
      shift_id: (session && session.shift_id) || '',
      action,
      entity_type: 'PAYMENT_ANNOUNCEMENTS',
      entity_id: entityId,
      old_value: oldValue || null,
      new_value: newValue || {},
      comment
    })
  });
}

// data: { cashbox_id, currency, announced_amount, partner_name, purpose, note }
export async function createAnnouncementCore(env, data, actor, session) {
  data = data || {};
  const cashboxId = String(data.cashbox_id || session.cashbox_id || '').trim();
  const currency = String(data.currency || '').trim();
  const announcedAmount = safeNumber(data.announced_amount);
  const partnerName = String(data.partner_name || '').trim();

  if (!cashboxId) throw new BusinessError('Blagajna je obavezna.', 400);
  if (!currency) throw new BusinessError('Valuta je obavezna.', 400);
  if (!(announcedAmount > 0)) throw new BusinessError('Najavljeni iznos mora biti veći od nule.', 400);
  if (!partnerName) throw new BusinessError('Naziv uplatioca je obavezan.', 400);

  const cashbox = await findCashbox(env, cashboxId);
  if (!cashbox || !cashbox.active) throw new BusinessError('Blagajna nije aktivna.', 400);
  const currencyRow = await findCurrency(env, currency);
  if (!currencyRow || !currencyRow.active) throw new BusinessError('Valuta nije aktivna.', 400);

  const now = new Date().toISOString();
  const announcement = {
    announcement_id: makeId('ANN'),
    created_at: now,
    created_by: actor.email || actor.user_code || '',
    cashbox_id: cashboxId,
    currency,
    announced_amount: announcedAmount,
    partner_name: partnerName,
    purpose: String(data.purpose || '').trim() || null,
    note: String(data.note || '').trim() || null,
    // FAZA 3w: nova najava je NACRT (DRAFT), ne odmah OPEN - vidljiva je samo svom
    // autoru dok se eksplicitno ne "posalje u blagajnu" (vidi sendAnnouncementToCashierCore).
    // Do tada ne proizvodi nikakvu akciju i ne pojavljuje se u Knjizi/kod blagajnika.
    status: 'DRAFT'
  };

  const rows = await supabaseRest(env, '/payment_announcements', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(announcement)
  });
  const created = rows && rows.length ? rows[0] : announcement;
  await insertAuditLog(env, 'CREATE', created.announcement_id, null, created, 'PAYMENT_ANNOUNCEMENT_CREATED', actor, session, cashboxId);
  return created;
}

// data: { announced_amount, partner_name, purpose, note, currency }
// `canOverride` is decided by the caller (endpoint layer, which already knows via
// verifySession whether the actor holds payment_announcements:match) - a supervisor
// with :match may edit/send on the original author's behalf; a plain :create-only
// actor (ANNOUNCER) may only touch their own drafts.
// Editable only while DRAFT or RETURNED (not yet sent, or sent back for revision) -
// once OPEN/MATCHED/CANCELLED the item is either live for the cashier or finished, and
// per spec "kada se pošalje na blagajnu nema više menjanja niti ažuriranja".
export async function updateAnnouncementCore(env, announcementId, data, actor, session, canOverride) {
  data = data || {};
  const announcement = await findAnnouncement(env, announcementId);
  if (!announcement) throw new BusinessError('Najava nije pronađena: ' + announcementId, 404);
  if (!['DRAFT', 'RETURNED'].includes(announcement.status)) {
    throw new BusinessError('Najava se može menjati samo dok je nacrt ili vraćena na doradu (trenutni status: ' + announcement.status + ').', 409);
  }
  const email = actor.email || actor.user_code || '';
  if (announcement.created_by !== email && !canOverride) {
    throw new BusinessError('Možete menjati samo sopstvene najave.', 403);
  }

  const updates = { updated_at: new Date().toISOString() };
  if (data.announced_amount !== undefined) {
    const amount = safeNumber(data.announced_amount);
    if (!(amount > 0)) throw new BusinessError('Najavljeni iznos mora biti veći od nule.', 400);
    updates.announced_amount = amount;
  }
  if (data.partner_name !== undefined) {
    const partnerName = String(data.partner_name || '').trim();
    if (!partnerName) throw new BusinessError('Naziv uplatioca je obavezan.', 400);
    updates.partner_name = partnerName;
  }
  if (data.purpose !== undefined) updates.purpose = String(data.purpose || '').trim() || null;
  if (data.note !== undefined) updates.note = String(data.note || '').trim() || null;
  if (data.currency !== undefined && String(data.currency).trim()) {
    const currencyRow = await findCurrency(env, String(data.currency).trim());
    if (!currencyRow || !currencyRow.active) throw new BusinessError('Valuta nije aktivna.', 400);
    updates.currency = String(data.currency).trim();
  }

  const rows = await supabaseRest(env, '/payment_announcements?announcement_id=' + encodeEq(announcementId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(updates)
  });
  const updated = rows && rows.length ? rows[0] : Object.assign({}, announcement, updates);
  await insertAuditLog(env, 'UPDATE', announcementId, announcement, updated, 'PAYMENT_ANNOUNCEMENT_UPDATED', actor, session, announcement.cashbox_id);
  return updated;
}

// DRAFT/RETURNED -> OPEN. From this point the announcement is visible to whoever has
// payment_announcements:view/:match and can be matched against a real inflow.
export async function sendAnnouncementToCashierCore(env, announcementId, actor, session, canOverride) {
  const announcement = await findAnnouncement(env, announcementId);
  if (!announcement) throw new BusinessError('Najava nije pronađena: ' + announcementId, 404);
  if (!['DRAFT', 'RETURNED'].includes(announcement.status)) {
    throw new BusinessError('Najava je već poslata u blagajnu (trenutni status: ' + announcement.status + ').', 409);
  }
  const email = actor.email || actor.user_code || '';
  if (announcement.created_by !== email && !canOverride) {
    throw new BusinessError('Možete slati u blagajnu samo sopstvene najave.', 403);
  }

  const now = new Date().toISOString();
  const updates = {
    status: 'OPEN',
    sent_by: email,
    sent_at: now,
    updated_at: now
  };
  const rows = await supabaseRest(env, '/payment_announcements?announcement_id=' + encodeEq(announcementId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(updates)
  });
  const updated = rows && rows.length ? rows[0] : Object.assign({}, announcement, updates);
  await insertAuditLog(env, 'SEND', announcementId, announcement, updated, 'PAYMENT_ANNOUNCEMENT_SENT_TO_CASHIER', actor, session, announcement.cashbox_id);
  return updated;
}

// OPEN -> RETURNED (blagajnik/supervizor odbija najavu i vraća je autoru na doradu,
// umesto da je upari) - postaje ponovo editabilna za autora, treba je ponovo poslati.
export async function returnAnnouncementForRevisionCore(env, announcementId, reason, actor, session) {
  const announcement = await findAnnouncement(env, announcementId);
  if (!announcement) throw new BusinessError('Najava nije pronađena: ' + announcementId, 404);
  if (announcement.status !== 'OPEN') {
    throw new BusinessError('Samo najava koja čeka uplatu (OPEN) može biti vraćena na doradu (trenutni status: ' + announcement.status + ').', 409);
  }

  const now = new Date().toISOString();
  const updates = {
    status: 'RETURNED',
    returned_by: actor.email || actor.user_code || '',
    returned_at: now,
    return_reason: String(reason || '').trim() || null,
    updated_at: now
  };
  const rows = await supabaseRest(env, '/payment_announcements?announcement_id=' + encodeEq(announcementId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(updates)
  });
  const updated = rows && rows.length ? rows[0] : Object.assign({}, announcement, updates);
  await insertAuditLog(env, 'RETURN', announcementId, announcement, updated, 'PAYMENT_ANNOUNCEMENT_RETURNED_FOR_REVISION', actor, session, announcement.cashbox_id);
  return updated;
}

// filters: { cashbox_id, currency, status, created_by, date_from, date_to }
// `created_by` is set by the caller (api/payment-announcements/list.js) when the acting
// user only has payment_announcements:create (the ANNOUNCER role) - they may not browse
// everyone's announcements, but they SHOULD be able to see the ones they themselves
// submitted (including DRAFT/RETURNED - that IS their working list), otherwise a najava
// disappears into a void the moment it's created with no way to confirm it went through.
//
// FAZA 3w: without an explicit status AND without a specific created_by filter (e.g. the
// Knjiga merge, or a supervisor's unscoped browse), DRAFT/RETURNED rows are hidden
// entirely - per spec they "don't exist yet" for anyone but their author until sent.
export async function listAnnouncementsCore(env, user, filters) {
  filters = filters || {};
  const cashboxId = scopeCashboxForAnnouncements(user, filters.cashbox_id);
  let path = '/payment_announcements?select=*';
  if (cashboxId) path += '&cashbox_id=' + encodeEq(cashboxId);
  if (filters.currency) path += '&currency=' + encodeEq(filters.currency);
  if (filters.created_by) path += '&created_by=' + encodeEq(filters.created_by);
  if (filters.status) {
    path += '&status=' + encodeEq(filters.status);
  } else if (!filters.created_by) {
    path += '&status=in.(OPEN,MATCHED,CANCELLED)';
  }
  if (filters.date_from) path += '&created_at=gte.' + encodeEq(filters.date_from + 'T00:00:00');
  if (filters.date_to) path += '&created_at=lte.' + encodeEq(filters.date_to + 'T23:59:59.999');
  path += '&order=created_at.desc&limit=500';
  return (await supabaseRest(env, path)) || [];
}

function buildCorrectionEvent(cashboxId, currency, difference, userEmail, now, announcementRef) {
  const numericDifference = Number(difference || 0);
  if (Math.abs(numericDifference) <= 0.000001) return null;
  const direction = numericDifference > 0 ? 'IN' : 'OUT';
  const amount = Math.abs(numericDifference);
  const label = numericDifference > 0 ? 'VIŠAK' : 'MANJAK';
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
    partner_name: 'Najava uplate',
    description: 'NAJAVA UPLATE - KOREKCIJA - ' + label + ' po najavi ' + announcementRef + '. Razlika: ' + numericDifference + ' ' + currency,
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

// data: { actual_amount, note }
export async function matchAnnouncementCore(env, announcementId, data, actor, session) {
  data = data || {};
  const announcement = await findAnnouncement(env, announcementId);
  if (!announcement) throw new BusinessError('Najava nije pronađena: ' + announcementId, 404);
  if (announcement.status !== 'OPEN') throw new BusinessError('Najava nije u statusu OPEN (trenutni status: ' + announcement.status + ').', 409);

  const actualAmount = safeNumber(data.actual_amount);
  if (!(actualAmount > 0)) throw new BusinessError('Iznos uplate mora biti veći od nule.', 400);

  const openShift = await findOpenShift(env, announcement.cashbox_id);
  if (!openShift) throw new BusinessError('Uplata po najavi zahteva otvorenu smenu na ovoj blagajni.', 409);

  const now = new Date().toISOString();
  const userEmail = actor.email || actor.user_code || '';
  const note = String(data.note || '').trim();
  const announcementRef = announcement.ref_no ? ('#' + announcement.ref_no) : announcementId;

  const mainEvent = {
    event_id: makeId('CEV'),
    created_at: now,
    created_by: userEmail,
    event_date: now,
    event_type: 'CASH_INFLOW',
    cashbox_id: announcement.cashbox_id,
    currency: announcement.currency,
    direction: 'IN',
    amount: actualAmount,
    linked_request_id: null,
    linked_order_id: null,
    partner_name: announcement.partner_name,
    description: 'UPLATA PO NAJAVI ' + announcementRef + (announcement.purpose ? ' - ' + announcement.purpose : '') + (note ? '. Napomena: ' + note : ''),
    document_status: 'NONE',
    status: 'POSTED',
    posted_by: userEmail,
    posted_at: now,
    locked_by: null,
    locked_at: null,
    reversal_of_event_id: null,
    updated_at: null
  };

  const mainRows = await supabaseRest(env, '/cash_events', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(mainEvent)
  });
  const mainCreated = mainRows && mainRows.length ? mainRows[0] : mainEvent;
  await insertAuditLog(env, 'POST', mainCreated.event_id, null, mainCreated, 'PAYMENT_ANNOUNCEMENT_MATCH_INFLOW', actor, session, announcement.cashbox_id);

  const difference = actualAmount - safeNumber(announcement.announced_amount);
  const correctionEvent = buildCorrectionEvent(announcement.cashbox_id, announcement.currency, difference, userEmail, now, announcementRef);
  let correctionCreated = null;
  if (correctionEvent) {
    const correctionRows = await supabaseRest(env, '/cash_events', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(correctionEvent)
    });
    correctionCreated = correctionRows && correctionRows.length ? correctionRows[0] : correctionEvent;
    await insertAuditLog(env, 'POST', correctionCreated.event_id, null, correctionCreated, 'PAYMENT_ANNOUNCEMENT_MATCH_CORRECTION', actor, session, announcement.cashbox_id);
  }

  const updates = {
    status: 'MATCHED',
    matched_cash_event_id: mainCreated.event_id,
    matched_correction_event_id: correctionCreated ? correctionCreated.event_id : null,
    matched_amount: actualAmount,
    difference,
    matched_by: userEmail,
    matched_at: now,
    updated_at: now
  };
  const updatedRows = await supabaseRest(env, '/payment_announcements?announcement_id=' + encodeEq(announcementId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(updates)
  });
  const updated = updatedRows && updatedRows.length ? updatedRows[0] : Object.assign({}, announcement, updates);
  await insertAuditLog(env, 'MATCH', announcementId, announcement, updated, 'PAYMENT_ANNOUNCEMENT_MATCHED', actor, session, announcement.cashbox_id);

  return { announcement: updated, cash_event: mainCreated, correction_event: correctionCreated };
}

export async function cancelAnnouncementCore(env, announcementId, reason, actor, session) {
  const announcement = await findAnnouncement(env, announcementId);
  if (!announcement) throw new BusinessError('Najava nije pronađena: ' + announcementId, 404);
  // FAZA 3w: otkazivanje dozvoljeno u bilo kom stanju PRE uparivanja (DRAFT/OPEN/
  // RETURNED) - nakon MATCHED je vec proizvela stvarno knjizenje i ne moze se otkazati.
  if (!['DRAFT', 'OPEN', 'RETURNED'].includes(announcement.status)) {
    throw new BusinessError('Najava u statusu ' + announcement.status + ' ne može biti otkazana.', 409);
  }

  const now = new Date().toISOString();
  const updates = {
    status: 'CANCELLED',
    cancelled_by: actor.email || actor.user_code || '',
    cancelled_at: now,
    cancel_reason: String(reason || '').trim() || null,
    updated_at: now
  };
  const rows = await supabaseRest(env, '/payment_announcements?announcement_id=' + encodeEq(announcementId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(updates)
  });
  const updated = rows && rows.length ? rows[0] : Object.assign({}, announcement, updates);
  await insertAuditLog(env, 'CANCEL', announcementId, announcement, updated, 'PAYMENT_ANNOUNCEMENT_CANCELLED', actor, session, announcement.cashbox_id);
  return updated;
}
