import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

const CHUNK_SIZE = 150; // drzi PostgREST "in.()" upit u razumnoj duzini URL-a

// FAZA 3t: batch provera "koje od ovih stavki imaju bar jedan aktivan prilog" - koristi
// se za spajalicu na Knjizi (jedan poziv za CEO ucitan spisak, umesto poziva po redu).
// Vraca SAMO listu entity_id-jeva koji imaju prilog (frontend gradi Set iz toga).
export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'cash_events:view');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const entityType = String(body.entity_type || '').trim();
    const entityIds = Array.isArray(body.entity_ids)
      ? [...new Set(body.entity_ids.map((id) => String(id || '').trim()).filter(Boolean))]
      : [];
    if (!entityType) return apiError('entity_type je obavezan.', 400);
    if (!entityIds.length) return apiOk([]);

    const withDocuments = new Set();
    for (let i = 0; i < entityIds.length; i += CHUNK_SIZE) {
      const chunk = entityIds.slice(i, i + CHUNK_SIZE);
      const inList = chunk.map((id) => encodeURIComponent(id)).join(',');
      const rows = await supabaseRest(
        env,
        '/documents?select=entity_id&entity_type=' + encodeEq(entityType) +
          '&entity_id=in.(' + inList + ')&status=neq.CANCELLED'
      );
      (rows || []).forEach((row) => { if (row.entity_id) withDocuments.add(row.entity_id); });
    }

    return apiOk([...withDocuments]);
  } catch (error) {
    return apiError('Provera priloga nije uspela: ' + (error.message || ''), error.status || 500);
  }
}
