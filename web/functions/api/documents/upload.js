import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { uploadFileToSupabaseStorage } from '../../_lib/supabaseStorage.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

// FAZA 3s (rev.2): prilog uz proizvoljnu stavku (cash_event, payment_order, payment_request...)
// - fajl ide u Supabase Storage (vidi _lib/supabaseStorage.js, bucket "documents"),
// u documents tabelu se upisuje samo metapodatak + link (file_url), nikad sam sadržaj fajla.
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
    const entityId = String(body.entity_id || '').trim();
    const fileName = String(body.file_name || 'dokument').trim();
    const mimeType = String(body.mime_type || 'application/octet-stream').trim();
    const base64Data = String(body.file_base64 || '');
    const note = body.note ? String(body.note).trim() : '';

    if (!entityType || !entityId) {
      return apiError('entity_type i entity_id su obavezni.', 400);
    }
    if (!base64Data) {
      return apiError('Fajl je obavezan.', 400);
    }
    // ~7MB base64 (~5MB stvarnog fajla) - blagajnički prilozi (skenirane priznanice,
    // fakture) ne treba da su veći od toga; sprečava da neko slučajno pokuša da
    // prikači ogroman fajl koji bi premašio Cloudflare Pages Functions body limit.
    if (base64Data.length > 7 * 1024 * 1024) {
      return apiError('Fajl je prevelik (maksimalno ~5MB).', 413);
    }

    const documentId = makeId('DOC');
    const uploaded = await uploadFileToSupabaseStorage(env, {
      name: fileName,
      mimeType,
      base64Data,
      entityType,
      entityId,
      documentId
    });

    const user = sessionResult.session.app_user || {};
    const record = {
      document_id: documentId,
      created_at: new Date().toISOString(),
      uploaded_by: user.email || user.user_code || 'system',
      entity_type: entityType,
      entity_id: entityId,
      file_name: uploaded.name || fileName,
      file_id: uploaded.path,
      file_url: uploaded.publicUrl,
      mime_type: uploaded.mimeType || mimeType,
      status: 'ACTIVE',
      note: note || null
    };
    const inserted = await supabaseRest(env, '/documents', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(record)
    });

    return apiOk(inserted && inserted.length ? inserted[0] : record);
  } catch (error) {
    return apiError('Prikačivanje dokumenta nije uspelo: ' + (error.message || ''), error.status || 500);
  }
}
