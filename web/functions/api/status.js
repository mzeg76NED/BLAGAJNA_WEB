import { apiOk } from '../_lib/api.js';
import { isSupabaseConfigured, supabaseRest } from '../_lib/supabase.js';

async function countRows(env, table) {
  const rows = await supabaseRest(env, '/' + table + '?select=*&limit=1', {
    headers: {
      prefer: 'count=exact'
    }
  });
  return Array.isArray(rows) ? rows.length : 0;
}

export async function onRequestGet(context) {
  const env = context.env || {};
  const supabaseConfigured = isSupabaseConfigured(env);
  const status = {
    service: 'BLAGAJNA WEB migration API',
    backendMode: env.BACKEND_MODE || 'legacy',
    appEnv: env.APP_ENV || 'development',
    version: env.APP_VERSION || 'cloudflare-migration-0.1.0',
    sourceOfTruth: 'legacy_apps_script',
    supabaseConfigured,
    checks: {
      api: true,
      database: 'not_checked'
    },
    timestamp: new Date().toISOString()
  };

  if (supabaseConfigured && env.STATUS_DB_CHECK === 'true') {
    await countRows(env, 'roles');
    status.checks.database = 'ok';
  }

  return apiOk(status);
}
