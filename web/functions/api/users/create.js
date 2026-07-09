import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { hashUserPin, makeSalt, verifySession } from '../../_lib/auth.js';
import { encodeEq, isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';
import { USER_ROLES, getPrivilegesForRole } from '../../_lib/permissions.js';
import { normalizeEmail, normalizeUserCode, sanitizeUser } from '../../_lib/users.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

async function findByEmail(env, email) {
  const rows = await supabaseRest(env, '/users?select=user_id&email=' + encodeEq(email) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
}

async function findByUserCode(env, userCode) {
  const rows = await supabaseRest(env, '/users?select=user_id&user_code=' + encodeEq(userCode) + '&limit=1');
  return rows && rows.length ? rows[0] : null;
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
      entity_type: 'USERS',
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
    const sessionResult = await verifySession(env, sessionId, 'users:create');
    if (!sessionResult.ok) {
      return apiError(sessionResult.error, sessionResult.status);
    }

    const data = body.data && typeof body.data === 'object' ? body.data : body;
    const email = normalizeEmail(data.email);
    const fullName = String(data.full_name || '').trim();
    const role = String(data.role || '').trim();
    const userCode = normalizeUserCode(data.user_code);
    const initialPin = String(data.initial_pin !== undefined ? data.initial_pin : data.pin || '');

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return apiError('Unesite validan email korisnika.', 400);
    if (!fullName) return apiError('Ime i prezime su obavezni.', 400);
    if (USER_ROLES.indexOf(role) === -1) return apiError('Nepoznata rola: ' + role, 400);
    if (userCode && !/^[A-Za-z0-9._-]{2,40}$/.test(userCode)) {
      return apiError('Korisnički kod sme da sadrži slova, brojeve, tačku, donju crtu ili crticu.', 400);
    }
    if (!/^\d{4,}$/.test(initialPin)) return apiError('Početni PIN mora imati najmanje 4 cifre.', 400);

    if (await findByEmail(env, email)) return apiError('Korisnik sa ovim emailom već postoji.', 409);
    if (userCode && (await findByUserCode(env, userCode))) return apiError('Korisnički kod već postoji.', 409);

    const now = new Date().toISOString();
    const salt = makeSalt();
    const pinHash = await hashUserPin(initialPin, salt);
    const user = {
      user_id: makeId('USR'),
      email,
      full_name: fullName,
      role,
      active: data.active === undefined ? true : Boolean(data.active === true || data.active === 'true'),
      default_cashbox_id: data.default_cashbox_id || null,
      user_code: userCode || null,
      pin_hash: pinHash,
      pin_salt: salt,
      failed_login_count: 0,
      locked_until: null,
      created_at: now,
      updated_at: now
    };

    const rows = await supabaseRest(env, '/users', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify(user)
    });
    const created = rows && rows.length ? rows[0] : user;

    const actor = sessionResult.session.app_user || {};
    await insertAuditLog(env, 'CREATE', created.user_id, sanitizeUser(created), 'USER_CREATED', actor, sessionResult.session);
    await insertAuditLog(env, 'USER_PIN_SET', created.user_id, { user_id: created.user_id }, 'USER_PIN_SET', actor, sessionResult.session);
    await insertAuditLog(env, 'USER_APP_LOGIN_ENABLED', created.user_id, { user_id: created.user_id }, 'USER_APP_LOGIN_ENABLED', actor, sessionResult.session);

    const privileges = await getPrivilegesForRole(env, created.role);
    return apiOk(Object.assign(sanitizeUser(created), { privileges }));
  } catch (error) {
    return apiError('Kreiranje korisnika nije uspelo.', error.status || 500);
  }
}
