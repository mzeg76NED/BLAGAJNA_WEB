import { encodeEq, supabaseRest } from './supabase.js';

const APP_LOGIN_FAILED_LIMIT = 5;
const APP_LOGIN_LOCK_MINUTES = 15;

function isActive(value) {
  return value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1';
}

function normalizeRequiredPermissions(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String).filter(Boolean);
  return [String(input)].filter(Boolean);
}

function sanitizeUser(user, permissions) {
  if (!user) return null;
  return {
    app_user_id: user.user_id || '',
    user_id: user.user_id || '',
    user_code: user.user_code || '',
    email: user.email || '',
    full_name: user.full_name || '',
    role: user.role || 'VIEWER',
    active: isActive(user.active),
    default_cashbox_id: user.default_cashbox_id || '',
    privileges: permissions || [],
    last_login_at: user.last_login_at || '',
    last_logout_at: user.last_logout_at || '',
    last_google_session_email: user.last_google_session_email || ''
  };
}

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function addHours(date, hours) {
  const value = new Date(date);
  value.setHours(value.getHours() + Number(hours || 12));
  return value.toISOString();
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function secureCompare(left, right) {
  const leftValue = String(left || '');
  const rightValue = String(right || '');
  if (leftValue.length !== rightValue.length) return false;
  let diff = 0;
  for (let index = 0; index < leftValue.length; index += 1) {
    diff |= leftValue.charCodeAt(index) ^ rightValue.charCodeAt(index);
  }
  return diff === 0;
}

export async function hashUserPin(pin, salt) {
  const data = new TextEncoder().encode(String(pin) + ':' + String(salt));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(digest);
}

export function makeSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

export function userHasPrivilege(appUser, privilege) {
  if (!appUser || !privilege) return false;
  if (appUser.role === 'ADMIN') return true;
  const privileges = Array.isArray(appUser.privileges) ? appUser.privileges : [];
  return privileges.includes(privilege);
}

export function userHasAnyPrivilege(appUser, privileges) {
  return (privileges || []).some((privilege) => userHasPrivilege(appUser, privilege));
}

async function verifyUserPin(pin, hash, salt) {
  if (!hash || !salt) return false;
  const calculated = await hashUserPin(pin, salt);
  return secureCompare(calculated, hash);
}

function isUserLocked(user) {
  if (!user || !user.locked_until) return false;
  const lockedUntil = new Date(user.locked_until);
  return !Number.isNaN(lockedUntil.getTime()) && lockedUntil.getTime() > Date.now();
}

async function findActiveSession(env, sessionId) {
  const rows = await supabaseRest(
    env,
    '/app_sessions?select=*&session_id=' + encodeEq(sessionId) + '&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function findUserByCode(env, userCode) {
  const normalized = String(userCode || '').trim().toUpperCase();
  const rows = await supabaseRest(
    env,
    '/users?select=*&user_code=' + encodeEq(normalized) + '&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function findUser(env, userId) {
  const rows = await supabaseRest(
    env,
    '/users?select=user_id,email,full_name,role,active,default_cashbox_id,user_code,last_login_at,last_logout_at,last_google_session_email&user_id=' + encodeEq(userId) + '&limit=1'
  );
  return rows && rows.length ? rows[0] : null;
}

async function updateUser(env, userId, updates) {
  const rows = await supabaseRest(env, '/users?user_id=' + encodeEq(userId), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(updates)
  });
  return rows && rows.length ? rows[0] : null;
}

async function listRolePermissions(env, role) {
  const rows = await supabaseRest(
    env,
    '/role_permissions?select=permission_id&allowed=eq.true&role_id=' + encodeEq(role)
  );
  return (rows || []).map((row) => row.permission_id).filter(Boolean).sort();
}

async function insertAuditLog(env, action, entityType, entityId, newValue, comment, user, session) {
  const safeUser = user || {};
  const safeSession = session || {};
  await supabaseRest(env, '/audit_log', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      log_id: makeId('LOG'),
      user: safeUser.email || safeUser.user_code || safeSession.google_session_email || 'system',
      app_user_id: safeUser.user_id || safeUser.app_user_id || safeSession.app_user_id || '',
      app_user_name: safeUser.full_name || '',
      user_code: safeUser.user_code || safeSession.user_code || '',
      role: safeUser.role || safeSession.role || '',
      google_session_email: safeSession.google_session_email || '',
      cashbox_id: safeSession.cashbox_id || safeUser.default_cashbox_id || '',
      shift_id: safeSession.shift_id || '',
      action,
      entity_type: entityType,
      entity_id: entityId || '',
      old_value: null,
      new_value: newValue || {},
      comment: comment || action
    })
  });
}

async function createSession(env, user, context = {}) {
  const createdAt = nowIso();
  const session = {
    session_id: makeId('SES'),
    app_user_id: user.user_id,
    user_code: user.user_code || '',
    role: user.role || 'VIEWER',
    google_session_email: context.google_session_email || '',
    cashbox_id: context.cashbox_id || user.default_cashbox_id || null,
    shift_id: context.shift_id || null,
    created_at: createdAt,
    last_seen_at: createdAt,
    expires_at: addHours(createdAt, env.APP_SESSION_HOURS || 12),
    active: true,
    logout_at: null,
    device_label: context.device_label || ''
  };
  const rows = await supabaseRest(env, '/app_sessions', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(session)
  });
  return rows && rows.length ? rows[0] : session;
}

// Sliding session window: every authenticated request pushes expires_at forward
// again, instead of the session hard-expiring exactly APP_SESSION_HOURS after LOGIN
// regardless of activity. Previously expires_at was only ever set once at login time,
// so an actively-working cashier could get "Sesija je istekla" mid-shift even though
// they never stopped using the app - this made a busy shift longer than the session
// window impossible to complete without re-logging in.
async function touchSession(env, sessionId) {
  const now = new Date();
  await supabaseRest(env, '/app_sessions?session_id=' + encodeEq(sessionId), {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      last_seen_at: now.toISOString(),
      expires_at: addHours(now.toISOString(), env.APP_SESSION_HOURS || 12)
    })
  });
}

async function closeSession(env, session) {
  const closedAt = nowIso();
  const rows = await supabaseRest(env, '/app_sessions?session_id=' + encodeEq(session.session_id), {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      active: false,
      logout_at: session.logout_at || closedAt,
      last_seen_at: closedAt
    })
  });
  return rows && rows.length ? rows[0] : { ...session, active: false, logout_at: closedAt, last_seen_at: closedAt };
}

async function handleFailedPinAttempt(env, user, userCode, googleSessionEmail) {
  const failedCount = Number(user.failed_login_count || 0) + 1;
  const updates = {
    failed_login_count: failedCount,
    updated_at: nowIso()
  };
  if (failedCount >= APP_LOGIN_FAILED_LIMIT) {
    updates.locked_until = new Date(Date.now() + APP_LOGIN_LOCK_MINUTES * 60 * 1000).toISOString();
  }
  await updateUser(env, user.user_id, updates);
  await insertAuditLog(
    env,
    'APP_USER_LOGIN_FAILED',
    'USERS',
    user.user_id,
    {
      app_user_id: user.user_id,
      user_code: userCode,
      app_user_name: user.full_name || '',
      role: user.role || '',
      google_session_email: googleSessionEmail || '',
      reason: 'INVALID_PIN'
    },
    'APP_USER_LOGIN_FAILED: INVALID_PIN',
    user,
    { google_session_email: googleSessionEmail || '' }
  );
}

export async function loginAppUser(env, credentials = {}) {
  const userCode = String(credentials.user_code || credentials.userCode || '').trim().toUpperCase();
  const pin = String(credentials.pin || '');
  const googleSessionEmail = String(credentials.google_session_email || credentials.googleSessionEmail || '').trim();
  if (!userCode || !pin) {
    return {
      ok: false,
      status: 400,
      error: 'Unesite korisnički kod i PIN.'
    };
  }

  const user = await findUserByCode(env, userCode);
  if (!user) {
    await insertAuditLog(
      env,
      'APP_USER_LOGIN_FAILED',
      'USERS',
      '',
      { user_code: userCode, google_session_email: googleSessionEmail, reason: 'UNKNOWN_USER_CODE' },
      'APP_USER_LOGIN_FAILED: UNKNOWN_USER_CODE',
      null,
      { user_code: userCode, google_session_email: googleSessionEmail }
    );
    return {
      ok: false,
      status: 401,
      error: 'Neispravan korisnički kod ili PIN.'
    };
  }

  if (!isActive(user.active)) {
    await insertAuditLog(
      env,
      'APP_USER_LOGIN_FAILED',
      'USERS',
      user.user_id,
      { user_code: userCode, reason: 'USER_INACTIVE' },
      'APP_USER_LOGIN_FAILED: USER_INACTIVE',
      user,
      { google_session_email: googleSessionEmail }
    );
    return {
      ok: false,
      status: 403,
      error: 'Korisnik nije aktivan.'
    };
  }

  if (isUserLocked(user)) {
    await insertAuditLog(
      env,
      'APP_USER_LOGIN_FAILED',
      'USERS',
      user.user_id,
      { user_code: userCode, reason: 'USER_LOCKED' },
      'APP_USER_LOGIN_FAILED: USER_LOCKED',
      user,
      { google_session_email: googleSessionEmail }
    );
    return {
      ok: false,
      status: 423,
      error: 'Korisnik je privremeno zaključan zbog pogrešnih pokušaja prijave.'
    };
  }

  if (!user.pin_hash || !user.pin_salt) {
    await insertAuditLog(
      env,
      'APP_USER_LOGIN_FAILED',
      'USERS',
      user.user_id,
      { user_code: userCode, reason: 'PIN_NOT_SET' },
      'APP_USER_LOGIN_FAILED: PIN_NOT_SET',
      user,
      { google_session_email: googleSessionEmail }
    );
    return {
      ok: false,
      status: 403,
      error: 'PIN nije postavljen za korisnika.'
    };
  }

  const pinOk = await verifyUserPin(pin, user.pin_hash, user.pin_salt);
  if (!pinOk) {
    await handleFailedPinAttempt(env, user, userCode, googleSessionEmail);
    return {
      ok: false,
      status: 401,
      error: 'Neispravan korisnički kod ili PIN.'
    };
  }

  const updatedUser = await updateUser(env, user.user_id, {
    failed_login_count: 0,
    locked_until: null,
    last_login_at: nowIso(),
    last_google_session_email: googleSessionEmail || null,
    updated_at: nowIso()
  });
  const session = await createSession(env, updatedUser || user, {
    google_session_email: googleSessionEmail,
    cashbox_id: credentials.cashbox_id || credentials.cashboxId || '',
    shift_id: credentials.shift_id || credentials.shiftId || '',
    device_label: credentials.device_label || credentials.deviceLabel || ''
  });
  const permissions = await listRolePermissions(env, (updatedUser || user).role || 'VIEWER');
  const safeSession = {
    active: true,
    session_id: session.session_id || '',
    session_expires_at: session.expires_at || '',
    google_session_email: session.google_session_email || '',
    cashbox_id: session.cashbox_id || (updatedUser || user).default_cashbox_id || '',
    shift_id: session.shift_id || '',
    app_user: sanitizeUser(updatedUser || user, permissions)
  };

  await insertAuditLog(
    env,
    'APP_USER_LOGIN',
    'APP_SESSIONS',
    session.session_id,
    safeSession,
    'APP_USER_LOGIN',
    updatedUser || user,
    session
  );

  return {
    ok: true,
    session: safeSession
  };
}

export async function logoutAppUser(env, sessionId) {
  if (!sessionId) {
    return {
      ok: false,
      status: 400,
      error: 'Nedostaje session_id.'
    };
  }
  const session = await findActiveSession(env, sessionId);
  if (!session) {
    return {
      ok: false,
      status: 404,
      error: 'App session not found: ' + sessionId
    };
  }
  const user = session.app_user_id ? await findUser(env, session.app_user_id) : null;
  const closed = await closeSession(env, session);
  if (user) {
    await updateUser(env, user.user_id, {
      last_logout_at: nowIso(),
      updated_at: nowIso()
    });
  }
  const permissions = user ? await listRolePermissions(env, user.role || 'VIEWER') : [];
  const safeSession = {
    active: false,
    session_id: closed.session_id || '',
    session_expires_at: closed.expires_at || '',
    google_session_email: closed.google_session_email || '',
    cashbox_id: closed.cashbox_id || '',
    shift_id: closed.shift_id || '',
    app_user: sanitizeUser(user, permissions)
  };

  await insertAuditLog(
    env,
    'APP_USER_LOGOUT',
    'APP_SESSIONS',
    sessionId,
    safeSession,
    'APP_USER_LOGOUT',
    user,
    closed
  );

  return {
    ok: true,
    session: safeSession
  };
}

export async function switchAppUser(env, credentials = {}) {
  const previousSessionId = credentials.session_id || credentials.previous_session_id || credentials.previousSessionId || '';
  let previousSession = null;
  if (previousSessionId) {
    previousSession = await findActiveSession(env, previousSessionId);
    if (previousSession) {
      await closeSession(env, previousSession);
    }
  }

  const result = await loginAppUser(env, credentials);
  if (!result.ok) return result;

  await insertAuditLog(
    env,
    'APP_USER_SWITCH',
    'APP_SESSIONS',
    result.session.session_id,
    {
      previous_session_id: previousSessionId,
      next_session_id: result.session.session_id
    },
    'APP_USER_SWITCH',
    result.session.app_user,
    {
      session_id: result.session.session_id,
      google_session_email: result.session.google_session_email,
      cashbox_id: result.session.cashbox_id,
      shift_id: result.session.shift_id
    }
  );

  return result;
}

export async function verifySession(env, sessionId, requiredPermissions) {
  if (!sessionId) {
    return {
      ok: false,
      status: 401,
      error: 'Sesija je istekla. Prijavite se ponovo.'
    };
  }

  const session = await findActiveSession(env, sessionId);
  if (!session || !isActive(session.active)) {
    return {
      ok: false,
      status: 401,
      error: 'Sesija je istekla. Prijavite se ponovo.'
    };
  }

  const expiresAt = new Date(session.expires_at);
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      status: 401,
      error: 'Sesija je istekla. Prijavite se ponovo.'
    };
  }

  const user = await findUser(env, session.app_user_id);
  if (!user || !isActive(user.active)) {
    return {
      ok: false,
      status: 401,
      error: 'Sesija je istekla. Prijavite se ponovo.'
    };
  }

  const role = user.role || session.role || 'VIEWER';
  const permissions = await listRolePermissions(env, role);
  const required = normalizeRequiredPermissions(requiredPermissions);
  const hasPermission = role === 'ADMIN' ||
    required.length === 0 ||
    required.some((permission) => permissions.includes(permission));

  if (!hasPermission) {
    return {
      ok: false,
      status: 403,
      error: 'Nemate ovlašćenje za ovu akciju.'
    };
  }

  await touchSession(env, session.session_id);

  return {
    ok: true,
    session: {
      active: true,
      session_id: session.session_id || '',
      session_expires_at: session.expires_at || '',
      google_session_email: session.google_session_email || '',
      cashbox_id: session.cashbox_id || user.default_cashbox_id || '',
      shift_id: session.shift_id || '',
      app_user: sanitizeUser(user, permissions)
    }
  };
}
