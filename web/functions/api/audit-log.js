import { apiError, apiOk, getSessionId } from '../_lib/api.js';
import { verifySession } from '../_lib/auth.js';
import { isSupabaseConfigured } from '../_lib/supabase.js';
import { getAuditLogCore } from '../_lib/reports.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'audit:view');
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const filters = {
      entity_type: url.searchParams.get('entity_type') || '',
      entity_id: url.searchParams.get('entity_id') || '',
      date_from: url.searchParams.get('date_from') || '',
      date_to: url.searchParams.get('date_to') || '',
      limit: url.searchParams.get('limit') || ''
    };
    const rows = await getAuditLogCore(env, filters);
    return apiOk({ rows, count: rows.length });
  } catch (error) {
    return apiError(error.message || 'Pregled audit log-a nije uspeo.', error.status || 500);
  }
}
