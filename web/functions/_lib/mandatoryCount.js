import { encodeEq, supabaseRest } from './supabase.js';

// FAZA 3t: obavezan presek stanja - vidi napomenu uz "mandatory_cash_counts" tabelu u
// supabase/migrations/202607090001_initial_schema.sql. Ovaj modul je JEDINO mesto koje
// zna kako se nalog izdaje/otkazuje/razresava - svi akcioni endpoint-i (cash-events/*,
// payment-orders/execute-pending, shifts/close, daily-closing/close) samo pozivaju
// assertCashboxNotLocked() pre nego sto upisu bilo sta, a cashCounts.js poziva
// resolveMandatoryCountsForCashbox() posle uspesnog preseka.

export const MANDATE_COUNT_ROLES = ['ADMIN', 'DIRECTOR'];

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

// Fail-open po dizajnu (WRITE putanje - issue/cancel - i dalje bacaju normalno): ako
// mandatory_cash_counts tabela jos ne postoji (SQL migracija nije pokrenuta) ili neki
// drugi neocekivan Supabase problem, tretiramo blagajnu kao NEzakljucanu umesto da
// srusimo /api/cashboxes i sve akcione endpoint-e koji ovo pozivaju pre svakog upisa -
// bezbednije je "funkcija privremeno neaktivna" nego "cela aplikacija ne radi" dok
// korisnik ne pokrene migraciju.
export async function findOpenMandatoryCount(env, cashboxId) {
  if (!cashboxId) return null;
  try {
    const rows = await supabaseRest(
      env,
      '/mandatory_cash_counts?select=*&cashbox_id=' + encodeEq(cashboxId) + '&status=eq.OPEN&limit=1'
    );
    return rows && rows.length ? rows[0] : null;
  } catch (error) {
    return null;
  }
}

// Baca 423 (Locked) gresku sa citljivom porukom ako je blagajna zakljucana - pozvati
// pre bilo koje akcije koja pomera gotovinu na toj blagajni.
export async function assertCashboxNotLocked(env, cashboxId) {
  const open = await findOpenMandatoryCount(env, cashboxId);
  if (open) {
    const parts = ['Blagajna je zaključana - obavezan je presek stanja pre nastavka rada.'];
    if (open.requested_by) parts.push('Naložio: ' + open.requested_by + '.');
    if (open.note) parts.push('Napomena: ' + open.note);
    throw Object.assign(new Error(parts.join(' ')), { status: 423 });
  }
}

// Idempotentno - ako vec postoji OPEN nalog za tu blagajnu, vraca njega umesto duplikata
// (partial unique index bi svakako odbio drugi insert, ali ovako izbegavamo 409 na
// dupli klik u UI-ju).
export async function issueMandatoryCount(env, cashboxId, actor, note) {
  const existing = await findOpenMandatoryCount(env, cashboxId);
  if (existing) return existing;

  const record = {
    order_id: makeId('MCC'),
    cashbox_id: cashboxId,
    status: 'OPEN',
    requested_by: (actor && (actor.email || actor.user_code)) || 'system',
    requested_at: new Date().toISOString(),
    note: note ? String(note).trim() : null
  };
  const rows = await supabaseRest(env, '/mandatory_cash_counts', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(record)
  });
  return rows && rows.length ? rows[0] : record;
}

// Rucno otkazivanje od strane admina/direktora (bez preseka) - "sigurnosni ventil" ako
// je nalog izdat greskom.
export async function cancelMandatoryCount(env, orderId, actor) {
  const rows = await supabaseRest(
    env,
    '/mandatory_cash_counts?order_id=' + encodeEq(orderId) + '&status=eq.OPEN',
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'CANCELLED',
        resolved_by: (actor && (actor.email || actor.user_code)) || 'system',
        resolved_at: new Date().toISOString()
      })
    }
  );
  return rows && rows.length ? rows[0] : null;
}

// Poziva se iz cashCounts.js posle SVAKOG uspesno proknjizenog preseka (bilo kog
// count_type-a - CASHBOX_COUNT sa standalone "Novi presek" forme, ali i SHIFT_OPENING
// presek pri otvaranju smene, jer to je isto tako "presek stanja po standardnoj
// proceduri"). Nema efekta ako nema OPEN naloga za tu blagajnu.
export async function resolveMandatoryCountsForCashbox(env, cashboxId, countId, actor) {
  const open = await findOpenMandatoryCount(env, cashboxId);
  if (!open) return null;
  const rows = await supabaseRest(
    env,
    '/mandatory_cash_counts?order_id=' + encodeEq(open.order_id),
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'DONE',
        resolved_by: (actor && (actor.email || actor.user_code)) || 'system',
        resolved_at: new Date().toISOString(),
        resolved_count_id: countId || null
      })
    }
  );
  return rows && rows.length ? rows[0] : open;
}

export async function listOpenMandatoryCountsByCashbox(env) {
  try {
    const rows = await supabaseRest(env, '/mandatory_cash_counts?select=*&status=eq.OPEN');
    const byCashbox = {};
    (rows || []).forEach((row) => {
      byCashbox[row.cashbox_id] = row;
    });
    return byCashbox;
  } catch (error) {
    return {};
  }
}
