import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import {
  clearOtherDefaultCurrencies,
  findCurrency,
  isValidCurrencyCode,
  normalizeCurrencyCode,
  normalizeDenominations
} from '../../_lib/currencies.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function insertAuditLog(env, action, entityId, newValue, comment, actor, session) {
  await supabaseRest(env, '/audit_log', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      log_id: makeId('LOG'),
      user: actor.email || actor.user_code || 'system',
      app_user_id: actor.user_id || '',
      app_user_name: actor.full_name || '',
      user_code: actor.user_code || '',
      role: actor.role || '',
      google_session_email: session.google_session_email || '',
      cashbox_id: session.cashbox_id || '',
      shift_id: session.shift_id || '',
      action,
      entity_type: 'CURRENCIES',
      entity_id: entityId,
      old_value: null,
      new_value: newValue || {},
      comment
    })
  });
}

export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }

  try {
    const body = await readJsonBody(context.request);
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, 'currencies:manage');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const code = normalizeCurrencyCode(data.currency_code || data.code);
    const name = String(data.name || '').trim();
    const active = data.active === undefined ? true : Boolean(data.active === true || data.active === 'true');
    const isDefault = Boolean(data.is_default === true || data.is_default === 'true');
    const denominations = normalizeDenominations(data.denominations);

    if (!isValidCurrencyCode(code)) {
      return apiError('Šifra valute mora imati 2-6 slova (npr. RSD, EUR).', 400);
    }
    if (!name) {
      return apiError('Naziv valute je obavezan.', 400);
    }
    if (await findCurrency(env, code)) {
      return apiError('Valuta sa ovom šifrom već postoji.', 409);
    }

    if (isDefault) {
      await clearOtherDefaultCurrencies(env, code);
    }

    const currency = {
      currency_code: code,
      name,
      active,
      is_default: isDefault,
      denominations: denominations.length ? denominations : null
    };

    const rows = await supabaseRest(env, '/currencies', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(currency)
    });
    const created = rows && rows.length ? rows[0] : currency;

    const actor = sessionResult.session.app_user || {};
    await insertAuditLog(env, 'CREATE', created.currency_code, created, 'CURRENCY_CREATED', actor, sessionResult.session);

    return apiOk(created);
  } catch (error) {
    return apiError('Kreiranje valute nije uspelo.', error.status || 500);
  }
}
