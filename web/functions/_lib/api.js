export function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');

  return new Response(JSON.stringify(body), {
    ...init,
    headers
  });
}

export function apiOk(data = {}) {
  return jsonResponse({
    success: true,
    data
  });
}

export function apiError(message, status = 400, details) {
  const body = {
    success: false,
    error: message || 'Greška u API pozivu.'
  };
  if (details !== undefined) {
    body.details = details;
  }
  return jsonResponse(body, { status });
}

export async function readJsonBody(request) {
  if (!request || request.method === 'GET' || request.method === 'HEAD') {
    return {};
  }
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return {};
  }
  return request.json();
}

export function getBearerToken(request) {
  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function getSessionId(request, body = {}) {
  return getBearerToken(request) ||
    request.headers.get('x-app-session-id') ||
    request.headers.get('x-session-id') ||
    body.session_id ||
    body.sessionId ||
    '';
}
