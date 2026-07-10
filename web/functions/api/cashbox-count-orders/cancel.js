import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { MANDATE_COUNT_ROLES, cancelMandatoryCount } from '../../_lib/mandatoryCount.js';

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
      action: 'CANCEL',
      entity_type: 'MANDATORY_CASH_COUNTS',
      entity_id: order.order_id || '',
      old_value: null,
      new_value: order,
      comment: 'Obavezan presek stanja ručno otkazan (bez izvršenog preseka).'
    })
  });
}

// "Sigurnosni ventil" - admin/direktor moze da otkaze nalog izdat greskom, bez da
// korisnik mora da uradi presek. Ne diramo cash_counts/cash_events.
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
      return apiError('Samo Admin ili Direktor mogu da otkažu obavezan presek stanja.', 403);
    }

    const orderId = String(body.order_id || '').trim();
    if (!orderId) return apiError('order_id je obavezan.', 400);

    const cancelled = await cancelMandatoryCount(env, orderId, appUser);
    if (!cancelled) return apiError('Otvoren nalog nije pronađen (možda je već razrešen).', 404);

    await insertAuditLog(env, cancelled, appUser, sessionResult.session);
    return apiOk(cancelled);
  } catch (error) {
    return apiError('Otkazivanje obaveznog preseka nije uspelo: ' + (error.message || ''), error.status || 500);
  }
}
