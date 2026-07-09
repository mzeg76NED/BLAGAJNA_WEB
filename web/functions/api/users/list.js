import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { getRolePermissionsMatrix } from '../../_lib/permissions.js';
import { isActiveValue, sanitizeUser } from '../../_lib/users.js';

const USERS_ADMIN_PRIVILEGES = ['users:create', 'users:update', 'users:assign_roles'];

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), USERS_ADMIN_PRIVILEGES);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const roleFilter = String(url.searchParams.get('role') || '').trim();
    const activeFilterRaw = url.searchParams.get('active');
    const queryFilter = String(url.searchParams.get('query') || '').trim().toLowerCase();

    const rows = await supabaseRest(
      env,
      '/users?select=user_id,user_code,email,full_name,role,active,default_cashbox_id,last_login_at,last_logout_at,failed_login_count,locked_until,last_google_session_email,created_at,updated_at&order=email.asc'
    );

    const matrix = await getRolePermissionsMatrix(env);

    let users = (rows || []).filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (activeFilterRaw !== null && activeFilterRaw !== undefined && activeFilterRaw !== '') {
        if (isActiveValue(user.active) !== isActiveValue(activeFilterRaw)) return false;
      }
      if (queryFilter) {
        const haystack = [user.email, user.full_name, user.user_code].join(' ').toLowerCase();
        if (haystack.indexOf(queryFilter) === -1) return false;
      }
      return true;
    });

    users = users
      .map((user) => Object.assign(sanitizeUser(user), { privileges: matrix[user.role] || [] }))
      .sort((left, right) => String(left.email || '').localeCompare(String(right.email || '')));

    return apiOk({ users });
  } catch (error) {
    return apiError('Pregled korisnika nije uspeo.', error.status || 500);
  }
}
