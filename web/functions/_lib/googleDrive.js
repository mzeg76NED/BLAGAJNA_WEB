// FAZA 3s: prilozi (dokumenti) uz cash_events preko Google Drive-a, koristeći Google
// Cloud service account (JWT bearer flow) - Cloudflare Pages Functions nemaju
// googleapis SDK niti Node "crypto", pa se RS256 potpisivanje radi ručno preko Web
// Crypto API-ja (crypto.subtle), a sami HTTP pozivi su obični fetch() ka Google REST
// API-jima (nema posebnog paketa za instalaciju).
//
// Očekivane environment varijable (Cloudflare Pages → Settings → Environment variables):
//   GOOGLE_SERVICE_ACCOUNT_JSON - CEO sadržaj JSON fajla preuzetog sa Google Cloud
//     Console (IAM & Admin → Service Accounts → Keys → Add key → JSON), nalepljen kao
//     jedna vrednost. NE deliti na pojedinačna polja - private_key polje unutar JSON-a
//     već ima ispravno eskejpovane \n karaktere koje JSON.parse ispravno tumači,
//     ručno kopiranje samo private_key stringa lako pokvari te prelome linija.
//   GOOGLE_DRIVE_FOLDER_ID - ID Drive foldera u koji se upload-uju prilozi (folder mora
//     biti DELJEN sa "client_email" iz service account JSON-a, sa Editor pravima -
//     service account nema svoj Drive prostor, pa upload u folder koji mu nije deljen
//     vraća 404/403).
//   GOOGLE_WORKSPACE_DOMAIN (opciono) - domen organizacije (podrazumevano
//     "nedeljkovic.co.rs") - posle upload-a se fajl automatski deli sa "bilo ko na ovom
//     domenu može da pregleda", da korisnici app-a (PIN login, ne Google OAuth) mogu da
//     otvore link bez ručnog deljenja svakog fajla.

function base64UrlFromBytes(bytes) {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlFromString(str) {
  return base64UrlFromBytes(new TextEncoder().encode(str));
}

async function importGoogleServiceAccountKey(pem) {
  const cleaned = String(pem || '')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function getServiceAccount(env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw Object.assign(new Error('GOOGLE_SERVICE_ACCOUNT_JSON nije podešen.'), { status: 503 });
  }
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (error) {
    throw Object.assign(new Error('GOOGLE_SERVICE_ACCOUNT_JSON nije validan JSON.'), { status: 503 });
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw Object.assign(new Error('GOOGLE_SERVICE_ACCOUNT_JSON nema client_email/private_key polja.'), { status: 503 });
  }
  return parsed;
}

async function getGoogleAccessToken(env) {
  const account = getServiceAccount(env);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const unsigned = base64UrlFromString(JSON.stringify(header)) + '.' + base64UrlFromString(JSON.stringify(claims));
  const key = await importGoogleServiceAccountKey(account.private_key);
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );
  const jwt = unsigned + '.' + base64UrlFromBytes(new Uint8Array(signatureBuffer));

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt)
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    const message = (data && (data.error_description || data.error)) || ('HTTP ' + response.status);
    throw Object.assign(new Error('Google OAuth token zahtev nije uspeo: ' + message), { status: 502 });
  }
  return data.access_token;
}

// name/mimeType/base64Data/folderId - base64Data je RAW base64 (bez "data:...;base64,"
// prefiksa - frontend to skida pre slanja, vidi fileToBase64Payload_ u scripts.html).
export async function uploadFileToDrive(env, { name, mimeType, base64Data, folderId }) {
  const accessToken = await getGoogleAccessToken(env);
  const boundary = 'blagajna_' + crypto.randomUUID().replace(/-/g, '');
  const metadata = JSON.stringify({
    name: name || 'dokument',
    parents: folderId ? [folderId] : undefined
  });
  const body = [
    '--' + boundary,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    '--' + boundary,
    'Content-Type: ' + (mimeType || 'application/octet-stream'),
    'Content-Transfer-Encoding: base64',
    '',
    base64Data,
    '--' + boundary + '--'
  ].join('\r\n');

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + accessToken,
        'content-type': 'multipart/related; boundary=' + boundary
      },
      body
    }
  );
  const data = await response.json();
  if (!response.ok) {
    const message = (data && data.error && data.error.message) || ('HTTP ' + response.status);
    throw Object.assign(new Error('Upload na Google Drive nije uspeo: ' + message), { status: 502 });
  }

  // Deljenje sa celom organizacijom - "best effort", ne ruši upload ako zakaže (npr.
  // Workspace admin ograničio deljenje na nivou domena). Fajl u tom slučaju ostaje
  // vidljiv samo service account-u i vlasniku foldera dok se ručno ne podeli.
  try {
    await fetch('https://www.googleapis.com/drive/v3/files/' + data.id + '/permissions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
      body: JSON.stringify({
        role: 'reader',
        type: 'domain',
        domain: env.GOOGLE_WORKSPACE_DOMAIN || 'nedeljkovic.co.rs'
      })
    });
  } catch (error) {
    // ignoriši - fajl je uspešno uploadovan, deljenje je sekundarno
  }

  return data;
}
