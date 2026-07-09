function getSupabaseConfig(env = {}) {
  const url = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '';
  return { url, key };
}

export function isSupabaseConfigured(env = {}) {
  const config = getSupabaseConfig(env);
  return Boolean(config.url && config.key);
}

export async function supabaseRest(env, path, init = {}) {
  const config = getSupabaseConfig(env);
  if (!config.url || !config.key) {
    throw new Error('Supabase environment is not configured.');
  }

  const headers = new Headers(init.headers || {});
  headers.set('apikey', config.key);
  headers.set('authorization', 'Bearer ' + config.key);
  headers.set('accept', 'application/json');
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(config.url + '/rest/v1' + path, {
    ...init,
    headers
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data && (data.message || data.error) ? (data.message || data.error) : 'Supabase REST request failed.';
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

export function encodeEq(value) {
  return 'eq.' + encodeURIComponent(String(value || ''));
}
