import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { deleteFileFromSupabaseStorage } from '../../_lib/supabaseStorage.js';

// FAZA 3t: "briši" opcija u dijalogu Dokumenti na Knjizi - soft-delete DB reda (status
// CANCELLED, isto kao ostali entity_type-ovi u ovoj tabeli) da se list.js automatski
// ne prikazuje (već filtrira status=neq.CANCELLED), plus best-effort brisanje samog
// fajla iz Supabase Storage-a da se ne gomila prostor. Ista permisija kao upload/list -
// ko vidi/prikačuje dokumenta uz stavku, može i da ih ukloni.
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

    const documentId = String(body.document_id || '').trim();
    if (!documentId) return apiError('document_id je obavezan.', 400);

    const rows = await supabaseRest(env, '/documents?select=*&document_id=' + encodeEq(documentId) + '&limit=1');
    const doc = rows && rows[0];
    if (!doc) return apiError('Dokument nije pronađen.', 404);
    if (doc.status === 'CANCELLED') return apiOk(doc);

    const updated = await supabaseRest(env, '/documents?document_id=' + encodeEq(documentId), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ status: 'CANCELLED' })
    });

    if (doc.file_id) {
      try {
        await deleteFileFromSupabaseStorage(env, doc.file_id);
      } catch (error) {
        // best effort - DB red je vec obrisan, fajl moze ostati siroce u Storage-u
      }
    }

    return apiOk(updated && updated.length ? updated[0] : { ...doc, status: 'CANCELLED' });
  } catch (error) {
    return apiError('Brisanje dokumenta nije uspelo: ' + (error.message || ''), error.status || 500);
  }
}
