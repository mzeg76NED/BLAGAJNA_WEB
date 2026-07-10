import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const url = new URL(context.request.url);
    const sessionResult = await verifySession(env, getSessionId(context.request), 'cash_events:view');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const entityType = String(url.searchParams.get('entity_type') || '').trim();
    const entityId = String(url.searchParams.get('entity_id') || '').trim();
    if (!entityType || !entityId) {
      return apiError('entity_type i entity_id su obavezni.', 400);
    }

    const rows = await supabaseRest(
      env,
      '/documents?select=*&entity_type=' + encodeEq(entityType) + '&entity_id=' + encodeEq(entityId) +
        '&status=neq.CANCELLED&order=created_at.desc'
    );
    return apiOk(rows || []);
  } catch (error) {
    return apiError('Pregled dokumenata nije uspeo.', error.status || 500);
  }
}
