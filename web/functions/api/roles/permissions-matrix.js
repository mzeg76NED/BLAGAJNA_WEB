import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured } from '../../_lib/supabase.js';
import { USER_ROLES, getRolePermissionsMatrix } from '../../_lib/permissions.js';

const MATRIX_VIEW_PRIVILEGES = ['users:create', 'users:update', 'users:assign_roles', 'audit:view'];

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const sessionResult = await verifySession(env, getSessionId(context.request), MATRIX_VIEW_PRIVILEGES);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const matrixByRole = await getRolePermissionsMatrix(env);
    const matrix = USER_ROLES.map((role) => ({
      role,
      privileges: (matrixByRole[role] || []).slice()
    }));

    return apiOk({ matrix });
  } catch (error) {
    return apiError('Pregled matrice prava nije uspeo.', error.status || 500);
  }
}
