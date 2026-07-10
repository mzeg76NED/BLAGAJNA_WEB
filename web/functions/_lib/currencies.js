import { encodeEq, supabaseRest } from './supabase.js';

export function normalizeCurrencyCode(value) {
  return String(value || '').trim().toUpperCase();
}

export function isValidCurrencyCode(code) {
  return /^[A-ZČĆŽŠĐ]{2,6}$/.test(code);
}

// Prihvata niz brojeva (ili CSV string "5000,2000,1000") i vraca ociscen niz
// pozitivnih celih brojeva, dedup i sortiran opadajuce - isti format koji
// front-end getClientDenominations_() ocekuje.
export function normalizeDenominations(input) {
  let values = input;
  if (typeof values === 'string') {
    values = values.split(',');
  }
  if (!Array.isArray(values)) return [];
  const cleaned = values
    .map((value) => Number(String(value).replace(',', '.').trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.round(value));
  return Array.from(new Set(cleaned)).sort((a, b) => b - a);
}

// Kad se valuta postavi kao podrazumevana (is_default = true), sve ostale
// moraju biti skinute sa is_default kako bi ostalo tacno 0 ili 1 default valuta.
export async function clearOtherDefaultCurrencies(env, exceptCode) {
  await supabaseRest(env, '/currencies?is_default=eq.true&currency_code=neq.' + encodeURIComponent(exceptCode), {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ is_default: false })
  });
}

export async function findCurrency(env, code) {
  const rows = await supabaseRest(env, '/currencies?select=*&currency_code=' + encodeEq(code) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}
