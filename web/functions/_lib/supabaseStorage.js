// FAZA 3s (rev.2 - 2026-07-10): prilozi (dokumenti) preko Supabase Storage-a umesto
// Google Drive-a (korisnik nema volje za Google Cloud service account setup, a ima vec
// Supabase projekat konfigurisan za bazu). Koristi ISTE kredencijale kao supabaseRest
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) - nema novog naloga niti novih env
// varijabli, samo treba JEDNOM napraviti bucket u Supabase Dashboard-u (vidi uputstvo
// u docs/migration/13_MIGRATION_STATUS.md, FAZA 3s).

function getStorageConfig(env = {}) {
  const url = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '';
  return { url, key };
}

function sanitizeFileName(name) {
  const cleaned = String(name || 'dokument')
    .trim()
    .replace(/[^\w.\-]+/g, '_')
    .slice(0, 120);
  return cleaned || 'dokument';
}

// entityType/entityId/documentId čine putanju unutar bucket-a (npr.
// "CASH_EVENT/EVT-123/DOC-abc-racun.pdf") - grupisano po stavci radi lakšeg
// snalaženja direktno u Supabase Dashboard-u. base64Data je RAW base64 (bez
// "data:...;base64," prefiksa - frontend to skida pre slanja, vidi
// fileToBase64Payload_ u scripts.html).
export async function uploadFileToSupabaseStorage(env, { name, mimeType, base64Data, entityType, entityId, documentId }) {
  const { url, key } = getStorageConfig(env);
  if (!url || !key) {
    throw Object.assign(new Error('Supabase environment is not configured.'), { status: 503 });
  }

  const bucket = env.SUPABASE_DOCUMENTS_BUCKET || 'documents';
  const safeName = sanitizeFileName(name);
  const path = [entityType || 'MISC', entityId || 'unknown', documentId + '-' + safeName]
    .map((part) => encodeURIComponent(part))
    .join('/');

  let bytes;
  try {
    const binary = atob(base64Data);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  } catch (error) {
    throw Object.assign(new Error('Fajl nije validan base64.'), { status: 400 });
  }

  const response = await fetch(url + '/storage/v1/object/' + bucket + '/' + path, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + key,
      apikey: key,
      'content-type': mimeType || 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: bytes
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || ('HTTP ' + response.status);
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || message;
    } catch (error) {
      // odgovor nije JSON - koristi sirov tekst iznad
    }
    const isMissingBucket = response.status === 400 && /bucket/i.test(message) && /not found|not exist/i.test(message);
    throw Object.assign(
      new Error('Upload u Supabase Storage nije uspeo: ' + message + (isMissingBucket ? ' (napravi bucket "' + bucket + '" u Supabase Dashboard → Storage)' : '')),
      { status: isMissingBucket ? 503 : 502 }
    );
  }

  return {
    path,
    publicUrl: url + '/storage/v1/object/public/' + bucket + '/' + path,
    name: safeName,
    mimeType: mimeType || 'application/octet-stream'
  };
}
