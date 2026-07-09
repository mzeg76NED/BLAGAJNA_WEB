import { jsonResponse } from '../_lib/api.js';

export async function onRequestGet(context) {
  const env = context.env || {};
  const body = {
    ok: true,
    service: 'BLAGAJNA WEB migration API',
    backendMode: env.BACKEND_MODE || 'legacy',
    appEnv: env.APP_ENV || 'development',
    version: env.APP_VERSION || 'cloudflare-migration-0.1.0',
    timestamp: new Date().toISOString()
  };

  return jsonResponse(body);
}
