import { apiError, apiOk, getSessionId } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

// Valute su deljena konfiguracija - svaki prijavljeni korisnik sme da ih vidi
// (koristi se i za popunjavanje select-ova u formama), zato nema posebne
// privilegije uslovljene za GET, samo validna sesija.
export async function onRequestGet(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const sessionResult = await verifySession(env, getSessionId(context.request), []);
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const rows = await supabaseRest(
      env,
      '/currencies?select=currency_code,name,active,is_default,denominations&order=currency_code.asc'
    );

    const currencies = (rows || []).map((row) => ({
      currency_code: row.currency_code,
      name: row.name || row.currency_code,
      active: row.active !== false,
      is_default: row.is_default === true,
      denominations: Array.isArray(row.denominations) ? row.denominations : []
    }));

    return apiOk({ currencies });
  } catch (error) {
    return apiError('Pregled valuta nije uspeo.', error.status || 500);
  }
}
