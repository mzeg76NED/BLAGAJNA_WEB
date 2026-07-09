import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { hashUserPin, makeSalt, verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { getPrivilegesForRole } from '../../_lib/permissions.js';
import { sanitizeUser } from '../../_lib/users.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function findById(env, userId) {
  const rows = await supabaseRest(env, '/users?select=*&user_id=' + encodeEq(userId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function insertAuditLog(env, action, entityId, newValue, comment, actor, session) {
  await supabaseRest(env, '/audit_log', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      log_id: makeId('LOG'),
      user: actor.email || actor.user_code || 'system',
      app_user_id: actor.user_id || '',
      app_user_name: actor.full_name || '',
      user_code: actor.user_code || '',
      role: actor.role || '',
      google_session_email: session.google_session_email || '',
      cashbox_id: session.cashbox_id || '',
      shift_id: session.shift_id || '',
      action,
      entity_type: 'USERS',
      entity_id: entityId,
      old_value: null,
      new_value: newValue || {},
      comment
    })
  });
}

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, ['users:update', 'users:assign_roles']);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }
    const actor = sessionResult.session.app_user || {};

    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const userId = String(data.user_id || data.userId || '').trim();
    const pin = String(data.pin || '');
    if (!userId) return apiError('userId je obavezan.', 400);
    if (!/^\d{4,}$/.test(pin)) return apiError('PIN mora imati najmanje 4 cifre.', 400);

    const before = await findById(env, userId);
    if (!before) return apiError('Korisnik nije pronađen: ' + userId, 404);

    const salt = makeSalt();
    const pinHash = await hashUserPin(pin, salt);
    const updates = {
      pin_hash: pinHash,
      pin_salt: salt,
      failed_login_count: 0,
      locked_until: null,
      updated_at: new Date().toISOString()
    };
    const rows = await supabaseRest(env, '/users?user_id=' + encodeEq(userId), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(updates)
    });
    const updated = rows && rows.length ? rows[0] : Object.assign({}, before, updates);

    await insertAuditLog(env, 'USER_PIN_RESET', userId, { user_id: userId }, 'USER_PIN_RESET', actor, sessionResult.session);
    if (!before.pin_hash || !before.pin_salt) {
      await insertAuditLog(env, 'USER_APP_LOGIN_ENABLED', userId, { user_id: userId }, 'USER_APP_LOGIN_ENABLED', actor, sessionResult.session);
    }

    const privileges = await getPrivilegesForRole(env, updated.role);
    return apiOk(Object.assign(sanitizeUser(updated), { privileges }));
  } catch (error) {
    return apiError('Reset PIN-a nije uspeo.', error.status || 500);
  }
}
