import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { MANDATE_COUNT_ROLES, issueMandatoryCount } from '../../_lib/mandatoryCount.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function insertAuditLog(env, order, user, session) {
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
      cashbox_id: order.cashbox_id || '',
      shift_id: (session && session.shift_id) || '',
      action: 'CREATE',
      entity_type: 'MANDATORY_CASH_COUNTS',
      entity_id: order.order_id || '',
      old_value: null,
      new_value: order,
      comment: 'Zadat obavezan presek stanja - blagajna zaključana do preseka.'
    })
  });
}

// FAZA 3t: samo ADMIN/DIREKTOR mogu da zadaju obavezan presek stanja za konkretnu
// blagajnu - namerno hardkodovana rola (ne generic permission matrix) jer je korisnik
// eksplicitno trazio da to bude ogranicevo na ove dve role, ne na bilo koju rolu kojoj
// admin naknadno dodeli permisiju kroz Korisnici/Prava ekran.
export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, []);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const appUser = sessionResult.session.app_user || {};
    if (!MANDATE_COUNT_ROLES.includes(appUser.role)) {
      return apiError('Samo Admin ili Direktor mogu da zadaju obavezan presek stanja.', 403);
    }

    const cashboxId = String(body.cashbox_id || '').trim();
    const note = body.note ? String(body.note).trim() : '';
    if (!cashboxId) return apiError('Blagajna je obavezna.', 400);

    const rows = await supabaseRest(env, '/cashboxes?select=cashbox_id,name,active&cashbox_id=' + encodeEq(cashboxId) + '&limit=1');
    const cashbox = rows && rows[0];
    if (!cashbox || !cashbox.active) return apiError('Blagajna nije aktivna ili ne postoji.', 400);

    const order = await issueMandatoryCount(env, cashboxId, appUser, note);
    await insertAuditLog(env, order, appUser, sessionResult.session);

    return apiOk(order);
  } catch (error) {
    return apiError('Zadavanje obaveznog preseka nije uspelo: ' + (error.message || ''), error.status || 500);
  }
}
