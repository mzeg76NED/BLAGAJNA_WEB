import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import {
  clearOtherDefaultCurrencies,
  findCurrency,
  normalizeCurrencyCode,
  normalizeDenominations
} from '../../_lib/currencies.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function insertAuditLog(env, action, entityId, oldValue, newValue, comment, actor, session) {
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
      old_value: oldValue || null,
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

    const code = normalizeCurrencyCode(body.currency_code || body.code);
    if (!code) {
      return apiError('Nedostaje šifra valute.', 400);
    }
    const existing = await findCurrency(env, code);
    if (!existing) {
      return apiError('Valuta nije pronađena: ' + code, 404);
    }

    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const updates = {};
    if (data.name !== undefined) {
      const name = String(data.name || '').trim();
      if (!name) return apiError('Naziv valute je obavezan.', 400);
      updates.name = name;
    }
    if (data.active !== undefined) {
      updates.active = Boolean(data.active === true || data.active === 'true');
    }
    if (data.denominations !== undefined) {
      const denominations = normalizeDenominations(data.denominations);
      updates.denominations = denominations.length ? denominations : null;
    }
    if (data.is_default !== undefined) {
      updates.is_default = Boolean(data.is_default === true || data.is_default === 'true');
    }

    if (updates.is_default === true) {
      await clearOtherDefaultCurrencies(env, code);
    }
    if (updates.is_default === false && existing.is_default === true) {
      return apiError('Mora postojati bar jedna podrazumevana valuta - postavite drugu kao podrazumevanu umesto uklanjanja.', 400);
    }

    if (!Object.keys(updates).length) {
      return apiOk(existing);
    }

    const rows = await supabaseRest(env, '/currencies?currency_code=' + encodeEq(code), {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(updates)
    });
    const updated = rows && rows.length ? rows[0] : Object.assign({}, existing, updates);

    const actor = sessionResult.session.app_user || {};
    await insertAuditLog(env, 'UPDATE', code, existing, updated, 'CURRENCY_UPDATED', actor, sessionResult.session);

    return apiOk(updated);
  } catch (error) {
    return apiError('Izmena valute nije uspela.', error.status || 500);
  }
}
