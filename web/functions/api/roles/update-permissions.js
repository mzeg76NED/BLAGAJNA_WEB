import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { USER_ROLES, getAllPermissionIds, getPrivilegesForRole } from '../../_lib/permissions.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function insertAuditLog(env, entityId, newValue, comment, actor, session) {
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
      action: 'UPDATE',
      entity_type: 'ROLE_PERMISSIONS',
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
    const sessionResult = await verifySession(env, sessionId, 'users:assign_roles');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }
    const actor = sessionResult.session.app_user || {};

    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const roleId = String(data.role_id || data.roleId || '').trim();
    const permissionIds = Array.isArray(data.permission_ids)
      ? data.permission_ids.map(String)
      : Array.isArray(data.privileges) ? data.privileges.map(String) : [];

    if (USER_ROLES.indexOf(roleId) === -1) return apiError('Nepoznata rola: ' + roleId, 400);
    if (roleId === 'ADMIN') return apiError('ADMIN rola uvek ima sva prava i ne menja se kroz matricu.', 400);

    const now = new Date().toISOString();
    const allPermissions = await getAllPermissionIds(env);
    const rows = allPermissions.map((permissionId) => ({
      role_id: roleId,
      permission_id: permissionId,
      allowed: permissionIds.indexOf(permissionId) !== -1,
      updated_at: now
    }));

    await supabaseRest(env, '/role_permissions?on_conflict=role_id,permission_id', {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    });

    await insertAuditLog(
      env,
      roleId,
      { role_id: roleId, permissions_count: permissionIds.length },
      'ROLE_PERMISSIONS_UPDATED',
      actor,
      sessionResult.session
    );

    const privileges = await getPrivilegesForRole(env, roleId);
    return apiOk({ role: roleId, privileges });
  } catch (error) {
    return apiError('Izmena prava po roli nije uspela.', error.status || 500);
  }
}
