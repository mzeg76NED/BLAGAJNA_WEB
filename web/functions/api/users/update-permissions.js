import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { userHasPrivilege, verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { USER_ROLES, getPrivilegesForRole } from '../../_lib/permissions.js';
import { isActiveValue, normalizeUserCode, sanitizeUser } from '../../_lib/users.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function findById(env, userId) {
  const rows = await supabaseRest(env, '/users?select=*&user_id=' + encodeEq(userId) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function findByUserCode(env, userCode) {
  const rows = await supabaseRest(env, '/users?select=user_id&user_code=' + encodeEq(userCode) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function countOtherActiveAdmins(env, userId) {
  const rows = await supabaseRest(
    env,
    '/users?select=user_id&role=eq.ADMIN&active=eq.true&user_id=neq.' + encodeURIComponent(userId)
  );
  return rows ? rows.length : 0;
}

async function insertAuditLog(env, action, entityId, oldValue, newValue, comment, actor, session) {
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
      old_value: oldValue || null,
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
    const sessionResult = await verifySession(env, sessionId, ['users:update', 'users:assign_roles', 'users:disable']);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }
    const actor = sessionResult.session.app_user || {};

    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const userId = String(data.user_id || data.userId || '').trim();
    if (!userId) return apiError('userId je obavezan.', 400);

    const before = await findById(env, userId);
    if (!before) return apiError('Korisnik nije pronađen: ' + userId, 404);

    const updates = {};
    const auditLabels = [];

    if (Object.prototype.hasOwnProperty.call(data, 'full_name')) {
      if (!userHasPrivilege(actor, 'users:update')) return apiError('Nemate ovlašćenje za izmenu korisnika.', 403);
      const fullName = String(data.full_name || '').trim();
      if (!fullName) return apiError('Ime i prezime su obavezni.', 400);
      updates.full_name = fullName;
      auditLabels.push('USER_UPDATED');
    }

    if (Object.prototype.hasOwnProperty.call(data, 'user_code')) {
      if (!userHasPrivilege(actor, 'users:update')) return apiError('Nemate ovlašćenje za izmenu korisnika.', 403);
      const userCode = normalizeUserCode(data.user_code);
      if (userCode) {
        const existing = await findByUserCode(env, userCode);
        if (existing && existing.user_id !== userId) return apiError('Korisnički kod već postoji: ' + userCode, 409);
      }
      updates.user_code = userCode || null;
      auditLabels.push('USER_CODE_CHANGED');
    }

    if (Object.prototype.hasOwnProperty.call(data, 'role')) {
      if (!userHasPrivilege(actor, 'users:assign_roles')) return apiError('Nemate ovlašćenje za dodelu rola.', 403);
      const role = String(data.role || '').trim();
      if (USER_ROLES.indexOf(role) === -1) return apiError('Nepoznata rola: ' + role, 400);
      updates.role = role;
      auditLabels.push('USER_ROLE_CHANGED');
    }

    if (Object.prototype.hasOwnProperty.call(data, 'active')) {
      const nextActive = data.active === true || data.active === 'true';
      const wasActive = isActiveValue(before.active);
      if (wasActive && !nextActive) {
        if (!userHasPrivilege(actor, 'users:disable')) return apiError('Nemate ovlašćenje za deaktiviranje korisnika.', 403);
        auditLabels.push('USER_DISABLED');
      } else {
        if (!userHasPrivilege(actor, 'users:update')) return apiError('Nemate ovlašćenje za izmenu korisnika.', 403);
        auditLabels.push('USER_ACTIVE_CHANGED');
      }
      updates.active = nextActive;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'default_cashbox_id')) {
      if (!userHasPrivilege(actor, 'users:update')) return apiError('Nemate ovlašćenje za izmenu korisnika.', 403);
      updates.default_cashbox_id = data.default_cashbox_id || null;
      auditLabels.push('USER_CASHBOX_ACCESS_CHANGED');
    }

    if (Object.keys(updates).length === 0) {
      return apiError('Nema izmena za čuvanje.', 400);
    }

    // Guard against locking the pilot out: never leave the system without an active ADMIN.
    const willBeAdmin = (updates.role || before.role) === 'ADMIN';
    const willBeActive = updates.active !== undefined ? updates.active : isActiveValue(before.active);
    const wasActiveAdmin = before.role === 'ADMIN' && isActiveValue(before.active);
    if (wasActiveAdmin && !(willBeAdmin && willBeActive)) {
      const otherActiveAdmins = await countOtherActiveAdmins(env, userId);
      if (otherActiveAdmins === 0) {
        return apiError('Ne možete ukloniti poslednjeg aktivnog ADMIN korisnika.', 409);
      }
    }

    updates.updated_at = new Date().toISOString();
    const rows = await supabaseRest(env, '/users?user_id=' + encodeEq(userId), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(updates)
    });
    const updated = rows && rows.length ? rows[0] : Object.assign({}, before, updates);

    await insertAuditLog(env, 'UPDATE', userId, sanitizeUser(before), sanitizeUser(updated), auditLabels.join('; '), actor, sessionResult.session);

    const privileges = await getPrivilegesForRole(env, updated.role);
    return apiOk(Object.assign(sanitizeUser(updated), { privileges }));
  } catch (error) {
    return apiError('Izmena korisnika nije uspela.', error.status || 500);
  }
}
