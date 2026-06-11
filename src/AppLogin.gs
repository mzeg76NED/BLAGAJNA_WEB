/**
 * Internal application login helpers.
 *
 * Phase 1 adds the backend session model only. Business flows still use the
 * existing current-user path until the UI lock and audit integration phases.
 */
const APP_LOGIN_SESSION_HOURS_ = 12;
const APP_LOGIN_FAILED_LIMIT_ = 5;
const APP_LOGIN_LOCK_MINUTES_ = 15;
var CURRENT_APP_SESSION_CONTEXT_ = null;

function generatePinSalt() {
  return Utilities.getUuid();
}

function hashUserPin(pin, salt) {
  assertNonEmptyString(String(pin || ''), 'pin');
  assertNonEmptyString(String(salt || ''), 'salt');
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(pin) + ':' + String(salt),
    Utilities.Charset.UTF_8
  );
  return bytesToHex_(digest);
}

function verifyUserPin(pin, hash, salt) {
  if (!hash || !salt) {
    return false;
  }
  const calculated = hashUserPin(pin, salt);
  return secureCompare_(calculated, String(hash));
}

function loginAppUser(userCode, pin, context) {
  ensureUsersAppLoginColumns();
  ensureAppSessionsSheet();
  ensureAuditAppContextColumns();
  const normalizedCode = normalizeUserCode_(userCode);
  assertNonEmptyString(String(pin || ''), 'pin');
  const loginContext = context || {};
  const googleSessionEmail = getCurrentUserEmail();
  const user = getUserByCode_(normalizedCode);

  if (!user) {
    writeAppLoginFailedAudit_(normalizedCode, googleSessionEmail, 'UNKNOWN_USER_CODE');
    throw new Error('Neispravan korisnički kod ili PIN.');
  }
  if (!isTruthy_(user.active)) {
    writeAppLoginFailedAudit_(normalizedCode, googleSessionEmail, 'USER_INACTIVE', user);
    throw new Error('Korisnik nije aktivan.');
  }
  if (isUserLoginLocked_(user)) {
    writeAppLoginFailedAudit_(normalizedCode, googleSessionEmail, 'USER_LOCKED', user);
    throw new Error('Korisnik je privremeno zaključan zbog pogrešnih pokušaja prijave.');
  }
  if (!user.pin_hash || !user.pin_salt) {
    writeAppLoginFailedAudit_(normalizedCode, googleSessionEmail, 'PIN_NOT_SET', user);
    throw new Error('PIN nije postavljen za korisnika.');
  }
  if (!verifyUserPin(pin, user.pin_hash, user.pin_salt)) {
    handleFailedPinAttempt_(user, normalizedCode, googleSessionEmail);
    throw new Error('Neispravan korisnički kod ili PIN.');
  }

  const now = getCurrentTimestamp_();
  const userUpdates = {
    failed_login_count: 0,
    locked_until: '',
    last_login_at: now,
    last_google_session_email: googleSessionEmail,
    updated_at: now
  };
  const updatedUser = updateRecordById(SHEET_NAMES.USERS, 'user_id', user.user_id, userUpdates);
  const session = createAppSessionRecord_(updatedUser, googleSessionEmail, loginContext, now);

  writeAuditLog(
    AUDIT_ACTIONS.APP_USER_LOGIN,
    SHEET_NAMES.APP_SESSIONS,
    session.session_id,
    null,
    buildSafeAppSessionForApi_(session, updatedUser),
    'APP_USER_LOGIN'
  );

  return buildSafeAppSessionForApi_(session, updatedUser);
}

function logoutAppUser(sessionId) {
  ensureAppSessionsSheet();
  ensureAuditAppContextColumns();
  assertNonEmptyString(String(sessionId || ''), 'sessionId');
  const match = findRecordById(SHEET_NAMES.APP_SESSIONS, 'session_id', sessionId);
  if (!match) {
    throw new Error('App session not found: ' + sessionId);
  }

  const before = match.record;
  const now = getCurrentTimestamp_();
  const updated = closeAppSession_(before, now);
  const user = updated.app_user_id ? getUserById_(updated.app_user_id) : null;
  if (user) {
    updateRecordById(SHEET_NAMES.USERS, 'user_id', user.user_id, {
      last_logout_at: now,
      updated_at: now
    });
  }

  writeAuditLog(
    AUDIT_ACTIONS.APP_USER_LOGOUT,
    SHEET_NAMES.APP_SESSIONS,
    sessionId,
    before,
    buildSafeAppSessionForApi_(updated, user),
    'APP_USER_LOGOUT'
  );

  return buildSafeAppSessionForApi_(updated, user);
}

function getCurrentAppSession(sessionId) {
  ensureAppSessionsSheet();
  assertNonEmptyString(String(sessionId || ''), 'sessionId');
  const match = findRecordById(SHEET_NAMES.APP_SESSIONS, 'session_id', sessionId);
  if (!match) {
    return { active: false, session_id: sessionId };
  }

  const session = match.record;
  const now = getCurrentTimestamp_();
  if (!isTruthy_(session.active)) {
    return buildSafeAppSessionForApi_(session, getUserById_(session.app_user_id));
  }
  if (isSessionExpired_(session, now)) {
    const expired = closeAppSession_(session, now);
    writeAuditLog(
      AUDIT_ACTIONS.APP_SESSION_EXPIRED,
      SHEET_NAMES.APP_SESSIONS,
      session.session_id,
      session,
      buildSafeAppSessionForApi_(expired, getUserById_(expired.app_user_id)),
      'APP_SESSION_EXPIRED'
    );
    return Object.assign(buildSafeAppSessionForApi_(expired, getUserById_(expired.app_user_id)), {
      expired: true
    });
  }

  const updated = updateRecordById(SHEET_NAMES.APP_SESSIONS, 'session_id', session.session_id, {
    last_seen_at: now
  });
  return buildSafeAppSessionForApi_(updated, getUserById_(updated.app_user_id));
}

function switchAppUser(userCode, pin, context) {
  ensureAppSessionsSheet();
  ensureAuditAppContextColumns();
  const switchContext = context || {};
  const previousSessionId = switchContext.session_id || switchContext.previous_session_id || '';
  let previousSession = null;
  if (previousSessionId) {
    const previousMatch = findRecordById(SHEET_NAMES.APP_SESSIONS, 'session_id', previousSessionId);
    previousSession = previousMatch ? previousMatch.record : null;
    if (previousSession && isTruthy_(previousSession.active)) {
      closeAppSession_(previousSession, getCurrentTimestamp_());
    }
  }

  const nextSession = loginAppUser(userCode, pin, switchContext);
  writeAuditLog(
    AUDIT_ACTIONS.APP_USER_SWITCH,
    SHEET_NAMES.APP_SESSIONS,
    nextSession.session_id,
    previousSession,
    nextSession,
    'APP_USER_SWITCH'
  );
  return nextSession;
}

function requireAppSession(sessionId, requiredPrivileges) {
  ensureAppSessionsSheet();
  if (!sessionId) {
    throw new Error('Sesija je istekla. Prijavite se ponovo.');
  }
  const match = findRecordById(SHEET_NAMES.APP_SESSIONS, 'session_id', sessionId);
  if (!match || !isTruthy_(match.record.active)) {
    throw new Error('Sesija je istekla. Prijavite se ponovo.');
  }

  const now = getCurrentTimestamp_();
  const session = match.record;
  if (isSessionExpired_(session, now)) {
    const expired = closeAppSession_(session, now);
    writeAuditLog(
      AUDIT_ACTIONS.APP_SESSION_EXPIRED,
      SHEET_NAMES.APP_SESSIONS,
      session.session_id,
      session,
      buildSafeAppSessionForApi_(expired, getUserById_(expired.app_user_id)),
      'APP_SESSION_EXPIRED'
    );
    throw new Error('Sesija je istekla. Prijavite se ponovo.');
  }

  const user = getUserById_(session.app_user_id);
  if (!user || !isTruthy_(user.active)) {
    throw new Error('Sesija je istekla. Prijavite se ponovo.');
  }

  const role = user.role || USER_ROLES.VIEWER;
  const privileges = getPrivilegesForRole_(role);
  const required = normalizeRequiredPrivileges_(requiredPrivileges);
  if (required.length && !required.some(function(privilege) { return privileges.indexOf(privilege) !== -1; }) && role !== USER_ROLES.ADMIN) {
    throw new Error('Nemate ovlašćenje za ovu akciju.');
  }

  updateRecordById(SHEET_NAMES.APP_SESSIONS, 'session_id', session.session_id, {
    last_seen_at: now
  });

  return {
    session_id: session.session_id,
    app_user_id: user.user_id || '',
    app_user_name: user.full_name || '',
    user_code: user.user_code || '',
    role: role,
    privileges: privileges,
    google_session_email: session.google_session_email || '',
    cashbox_id: session.cashbox_id || user.default_cashbox_id || '',
    shift_id: session.shift_id || '',
    default_cashbox_id: user.default_cashbox_id || '',
    email: session.google_session_email || user.email || '',
    active: true
  };
}

function withAppSessionContext_(sessionContext, callback) {
  const previous = CURRENT_APP_SESSION_CONTEXT_;
  CURRENT_APP_SESSION_CONTEXT_ = sessionContext || null;
  try {
    return callback();
  } finally {
    CURRENT_APP_SESSION_CONTEXT_ = previous;
  }
}

function getActiveAppSessionContext_() {
  return CURRENT_APP_SESSION_CONTEXT_;
}

function buildAuditContextFromSession(sessionContext, extra) {
  const context = sessionContext || getActiveAppSessionContext_() || {};
  const additional = extra || {};
  return {
    app_user_id: additional.app_user_id || context.app_user_id || '',
    app_user_name: additional.app_user_name || context.app_user_name || '',
    user_code: additional.user_code || context.user_code || '',
    role: additional.role || context.role || '',
    google_session_email: additional.google_session_email || context.google_session_email || '',
    cashbox_id: additional.cashbox_id || context.cashbox_id || '',
    shift_id: additional.shift_id || context.shift_id || '',
    timestamp: additional.timestamp || getCurrentTimestamp_()
  };
}

function normalizeRequiredPrivileges_(requiredPrivileges) {
  if (!requiredPrivileges) {
    return [];
  }
  return Array.isArray(requiredPrivileges) ? requiredPrivileges : [requiredPrivileges];
}

function buildPinFieldsFromInput_(pin) {
  if (pin === undefined || pin === null || pin === '') {
    return {};
  }
  assertValidUserPin_(pin);
  const salt = generatePinSalt();
  return {
    pin_salt: salt,
    pin_hash: hashUserPin(String(pin), salt)
  };
}

function assertValidUserPin_(pin) {
  const value = String(pin || '');
  assertNonEmptyString(value, 'pin');
  if (!/^\d{4,}$/.test(value)) {
    throw new Error('PIN must contain at least 4 digits.');
  }
  return value;
}

function normalizeUserCode_(userCode) {
  const code = String(userCode || '').trim().toUpperCase();
  assertNonEmptyString(code, 'user_code');
  if (!/^[A-Z0-9._-]{2,40}$/.test(code)) {
    throw new Error('user_code must contain 2-40 characters: A-Z, 0-9, dot, underscore or dash.');
  }
  return code;
}

function getUserByCode_(userCode) {
  ensureUsersAppLoginColumns();
  const normalizedCode = normalizeUserCode_(userCode);
  const users = listRecords(SHEET_NAMES.USERS);
  return users.filter(function(user) {
    return String(user.user_code || '').trim().toUpperCase() === normalizedCode;
  })[0] || null;
}

function getUserById_(userId) {
  if (!userId) {
    return null;
  }
  ensureUsersAppLoginColumns();
  const match = findRecordById(SHEET_NAMES.USERS, 'user_id', userId);
  return match ? match.record : null;
}

function createAppSessionRecord_(user, googleSessionEmail, context, now) {
  ensureAppSessionsSheet();
  const createdAt = now || getCurrentTimestamp_();
  const expiresAt = new Date(createdAt.getTime() + APP_LOGIN_SESSION_HOURS_ * 60 * 60 * 1000);
  const session = {
    session_id: generateId_('SES'),
    app_user_id: user.user_id,
    user_code: user.user_code || '',
    role: user.role || USER_ROLES.VIEWER,
    google_session_email: googleSessionEmail || '',
    cashbox_id: context.cashbox_id || user.default_cashbox_id || '',
    shift_id: context.shift_id || '',
    created_at: createdAt,
    last_seen_at: createdAt,
    expires_at: expiresAt,
    active: true,
    logout_at: '',
    device_label: context.device_label || ''
  };
  appendRecord(SHEET_NAMES.APP_SESSIONS, session);
  return session;
}

function closeAppSession_(session, now) {
  const closedAt = now || getCurrentTimestamp_();
  return updateRecordById(SHEET_NAMES.APP_SESSIONS, 'session_id', session.session_id, {
    active: false,
    logout_at: session.logout_at || closedAt,
    last_seen_at: closedAt
  });
}

function isSessionExpired_(session, now) {
  const expiresAt = session.expires_at instanceof Date ? session.expires_at : new Date(session.expires_at);
  return !expiresAt || isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime();
}

function isUserLoginLocked_(user) {
  if (!user.locked_until) {
    return false;
  }
  const lockedUntil = user.locked_until instanceof Date ? user.locked_until : new Date(user.locked_until);
  return !isNaN(lockedUntil.getTime()) && lockedUntil.getTime() > new Date().getTime();
}

function handleFailedPinAttempt_(user, normalizedCode, googleSessionEmail) {
  const now = getCurrentTimestamp_();
  const failedCount = Number(user.failed_login_count || 0) + 1;
  const updates = {
    failed_login_count: failedCount,
    updated_at: now
  };
  if (failedCount >= APP_LOGIN_FAILED_LIMIT_) {
    updates.locked_until = new Date(now.getTime() + APP_LOGIN_LOCK_MINUTES_ * 60 * 1000);
  }
  updateRecordById(SHEET_NAMES.USERS, 'user_id', user.user_id, updates);
  writeAppLoginFailedAudit_(normalizedCode, googleSessionEmail, 'INVALID_PIN', user);
}

function writeAppLoginFailedAudit_(userCode, googleSessionEmail, reason, user) {
  writeAuditLog(
    AUDIT_ACTIONS.APP_USER_LOGIN_FAILED,
    SHEET_NAMES.USERS,
    user && user.user_id ? user.user_id : '',
    null,
    {
      app_user_id: user && user.user_id ? user.user_id : '',
      user_code: userCode || '',
      app_user_name: user && user.full_name ? user.full_name : '',
      role: user && user.role ? user.role : '',
      google_session_email: googleSessionEmail || '',
      reason: reason || ''
    },
    'APP_USER_LOGIN_FAILED: ' + (reason || '')
  );
}

function buildSafeAppSessionForApi_(session, user) {
  const safeUser = sanitizeAppUserForSession_(user || {});
  return {
    active: isTruthy_(session.active),
    session_id: session.session_id || '',
    session_expires_at: session.expires_at || '',
    google_session_email: session.google_session_email || '',
    cashbox_id: session.cashbox_id || '',
    shift_id: session.shift_id || '',
    app_user: safeUser
  };
}

function sanitizeAppUserForSession_(user) {
  const role = user.role || USER_ROLES.VIEWER;
  return {
    app_user_id: user.user_id || '',
    user_id: user.user_id || '',
    user_code: user.user_code || '',
    email: user.email || '',
    full_name: user.full_name || '',
    role: role,
    active: isTruthy_(user.active),
    default_cashbox_id: user.default_cashbox_id || '',
    privileges: getPrivilegesForRole_(role),
    last_login_at: user.last_login_at || '',
    last_logout_at: user.last_logout_at || '',
    last_google_session_email: user.last_google_session_email || ''
  };
}

function bytesToHex_(bytes) {
  return bytes.map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function secureCompare_(left, right) {
  const leftValue = String(left || '');
  const rightValue = String(right || '');
  if (leftValue.length !== rightValue.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < leftValue.length; i++) {
    diff |= leftValue.charCodeAt(i) ^ rightValue.charCodeAt(i);
  }
  return diff === 0;
}
