/**
 * User and role helpers.
 */
const USER_PRIVILEGES = Object.freeze({
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DISABLE: 'users:disable',
  USERS_ASSIGN_ROLES: 'users:assign_roles',
  PAYMENT_REQUESTS_CREATE: 'payment_requests:create',
  PAYMENT_REQUESTS_VIEW_OWN: 'payment_requests:view_own',
  PAYMENT_REQUESTS_VIEW_ALL: 'payment_requests:view_all',
  PAYMENT_REQUESTS_APPROVE: 'payment_requests:approve',
  PAYMENT_REQUESTS_REJECT: 'payment_requests:reject',
  PAYMENT_REQUESTS_RETURN_FOR_CORRECTION: 'payment_requests:return_for_correction',
  PAYMENT_ORDERS_CREATE: 'payment_orders:create',
  PAYMENT_ORDERS_VIEW: 'payment_orders:view',
  PAYMENT_ORDERS_ISSUE: 'payment_orders:issue',
  PAYMENT_ORDERS_REJECT: 'payment_orders:reject',
  PAYMENT_ORDERS_EXECUTE: 'payment_orders:execute',
  DOCUMENTS_ATTACH: 'documents:attach',
  DOCUMENTS_VIEW: 'documents:view',
  DOCUMENTS_CANCEL: 'documents:cancel',
  CASH_EVENTS_CREATE: 'cash_events:create',
  CASH_EVENTS_VIEW: 'cash_events:view',
  CASH_EVENTS_REVERSE: 'cash_events:reverse',
  SHIFTS_OPEN: 'shifts:open',
  SHIFTS_COUNT: 'shifts:count',
  SHIFTS_CLOSE: 'shifts:close',
  SHIFTS_VIEW: 'shifts:view',
  AUDIT_VIEW: 'audit:view'
});

const ROLE_PRIVILEGES = Object.freeze({
  ADMIN: Object.freeze([
    'users:create',
    'users:update',
    'users:disable',
    'users:assign_roles',
    'payment_requests:create',
    'payment_requests:view_own',
    'payment_requests:view_all',
    'payment_requests:approve',
    'payment_requests:reject',
    'payment_requests:return_for_correction',
    'payment_orders:create',
    'payment_orders:view',
    'payment_orders:issue',
    'payment_orders:reject',
    'payment_orders:execute',
    'documents:attach',
    'documents:view',
    'documents:cancel',
    'cash_events:create',
    'cash_events:view',
    'cash_events:reverse',
    'shifts:open',
    'shifts:count',
    'shifts:close',
    'shifts:view',
    'audit:view'
  ]),
  DIRECTOR: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_ALL,
    USER_PRIVILEGES.PAYMENT_REQUESTS_APPROVE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_REJECT,
    USER_PRIVILEGES.PAYMENT_REQUESTS_RETURN_FOR_CORRECTION,
    USER_PRIVILEGES.PAYMENT_ORDERS_CREATE,
    USER_PRIVILEGES.PAYMENT_ORDERS_VIEW,
    USER_PRIVILEGES.PAYMENT_ORDERS_ISSUE,
    USER_PRIVILEGES.DOCUMENTS_ATTACH,
    USER_PRIVILEGES.DOCUMENTS_VIEW,
    USER_PRIVILEGES.DOCUMENTS_CANCEL,
    USER_PRIVILEGES.CASH_EVENTS_VIEW,
    USER_PRIVILEGES.SHIFTS_VIEW,
    USER_PRIVILEGES.AUDIT_VIEW
  ]),
  FINANCE: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_ALL,
    USER_PRIVILEGES.PAYMENT_REQUESTS_APPROVE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_REJECT,
    USER_PRIVILEGES.PAYMENT_REQUESTS_RETURN_FOR_CORRECTION,
    USER_PRIVILEGES.PAYMENT_ORDERS_CREATE,
    USER_PRIVILEGES.PAYMENT_ORDERS_VIEW,
    USER_PRIVILEGES.PAYMENT_ORDERS_ISSUE,
    USER_PRIVILEGES.DOCUMENTS_ATTACH,
    USER_PRIVILEGES.DOCUMENTS_VIEW,
    USER_PRIVILEGES.DOCUMENTS_CANCEL,
    USER_PRIVILEGES.CASH_EVENTS_CREATE,
    USER_PRIVILEGES.CASH_EVENTS_VIEW,
    USER_PRIVILEGES.CASH_EVENTS_REVERSE,
    USER_PRIVILEGES.SHIFTS_OPEN,
    USER_PRIVILEGES.SHIFTS_COUNT,
    USER_PRIVILEGES.SHIFTS_CLOSE,
    USER_PRIVILEGES.SHIFTS_VIEW,
    USER_PRIVILEGES.AUDIT_VIEW
  ]),
  CASHIER_SUPERVISOR: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_ALL,
    USER_PRIVILEGES.PAYMENT_REQUESTS_APPROVE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_REJECT,
    USER_PRIVILEGES.PAYMENT_REQUESTS_RETURN_FOR_CORRECTION,
    USER_PRIVILEGES.PAYMENT_ORDERS_CREATE,
    USER_PRIVILEGES.PAYMENT_ORDERS_VIEW,
    USER_PRIVILEGES.PAYMENT_ORDERS_ISSUE,
    USER_PRIVILEGES.PAYMENT_ORDERS_REJECT,
    USER_PRIVILEGES.PAYMENT_ORDERS_EXECUTE,
    USER_PRIVILEGES.DOCUMENTS_ATTACH,
    USER_PRIVILEGES.DOCUMENTS_VIEW,
    USER_PRIVILEGES.DOCUMENTS_CANCEL,
    USER_PRIVILEGES.CASH_EVENTS_CREATE,
    USER_PRIVILEGES.CASH_EVENTS_VIEW,
    USER_PRIVILEGES.CASH_EVENTS_REVERSE,
    USER_PRIVILEGES.SHIFTS_OPEN,
    USER_PRIVILEGES.SHIFTS_COUNT,
    USER_PRIVILEGES.SHIFTS_CLOSE,
    USER_PRIVILEGES.SHIFTS_VIEW,
    USER_PRIVILEGES.AUDIT_VIEW
  ]),
  CASHIER: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_OWN,
    USER_PRIVILEGES.PAYMENT_ORDERS_VIEW,
    USER_PRIVILEGES.PAYMENT_ORDERS_REJECT,
    USER_PRIVILEGES.PAYMENT_ORDERS_EXECUTE,
    USER_PRIVILEGES.DOCUMENTS_ATTACH,
    USER_PRIVILEGES.DOCUMENTS_VIEW,
    USER_PRIVILEGES.CASH_EVENTS_CREATE,
    USER_PRIVILEGES.CASH_EVENTS_VIEW,
    USER_PRIVILEGES.SHIFTS_OPEN,
    USER_PRIVILEGES.SHIFTS_COUNT,
    USER_PRIVILEGES.SHIFTS_CLOSE,
    USER_PRIVILEGES.SHIFTS_VIEW
  ]),
  APPROVER: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_ALL,
    USER_PRIVILEGES.PAYMENT_REQUESTS_APPROVE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_REJECT,
    USER_PRIVILEGES.PAYMENT_REQUESTS_RETURN_FOR_CORRECTION,
    USER_PRIVILEGES.PAYMENT_ORDERS_CREATE,
    USER_PRIVILEGES.PAYMENT_ORDERS_VIEW,
    USER_PRIVILEGES.PAYMENT_ORDERS_ISSUE,
    USER_PRIVILEGES.DOCUMENTS_ATTACH,
    USER_PRIVILEGES.DOCUMENTS_VIEW,
    USER_PRIVILEGES.SHIFTS_VIEW
  ]),
  REQUESTER: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_OWN,
    USER_PRIVILEGES.DOCUMENTS_ATTACH,
    USER_PRIVILEGES.DOCUMENTS_VIEW
  ]),
  VIEWER: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_ALL,
    USER_PRIVILEGES.DOCUMENTS_VIEW,
    USER_PRIVILEGES.CASH_EVENTS_VIEW,
    USER_PRIVILEGES.SHIFTS_VIEW
  ])
});

function getCurrentUserEmail() {
  const activeUser = Session.getActiveUser();
  const email = activeUser && activeUser.getEmail() ? String(activeUser.getEmail()).trim() : '';
  if (email) {
    return email;
  }
  if (isDevelopmentMode_()) {
    return 'admin@example.com';
  }
  throw new Error('Current user email is not available. Check Apps Script deployment access settings.');
}

function getCurrentUser() {
  const appContext = typeof getActiveAppSessionContext_ === 'function' ? getActiveAppSessionContext_() : null;
  if (appContext && appContext.app_user_id) {
    return {
      user_id: appContext.app_user_id,
      email: appContext.google_session_email || appContext.email || '',
      full_name: appContext.app_user_name || '',
      user_code: appContext.user_code || '',
      role: appContext.role || USER_ROLES.VIEWER,
      active: true,
      default_cashbox_id: appContext.default_cashbox_id || appContext.cashbox_id || '',
      google_session_email: appContext.google_session_email || '',
      privileges: Array.isArray(appContext.privileges) ? appContext.privileges.slice() : getPrivilegesForRole_(appContext.role)
    };
  }

  const email = getCurrentUserEmail();
  const user = getUserByEmail(email);
  if (!user) {
    if (isDevelopmentMode_()) {
      return {
        user_id: 'USR-DEV-ADMIN',
        email: email,
        full_name: 'Development Admin',
        role: USER_ROLES.ADMIN,
        active: true,
        default_cashbox_id: '',
        privileges: getPrivilegesForRole_(USER_ROLES.ADMIN)
      };
    }
    throw new Error('Current user is not registered in USERS: ' + email);
  }
  if (!isTruthy_(user.active)) {
    throw new Error('Current user is not active: ' + email);
  }

  const result = {
    user_id: user.user_id || '',
    email: user.email || email,
    full_name: user.full_name || '',
    role: user.role || USER_ROLES.VIEWER,
    active: isTruthy_(user.active),
    default_cashbox_id: user.default_cashbox_id || ''
  };
  result.privileges = getPrivilegesForRole_(result.role);
  return result;
}

function getCurrentUserRole() {
  return getCurrentUser().role;
}

function assertUserHasRole(allowedRoles) {
  const user = assertCurrentUserActive();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const role = user.role;
  if (roles.indexOf(role) === -1) {
    throw new Error('User role is not allowed for this action: ' + role);
  }
  return user;
}

function isUserActive(email) {
  if (!email) {
    return false;
  }

  const user = getUserByEmail(email);
  return Boolean(user && isTruthy_(user.active));
}

function getUserByEmail(email) {
  assertNonEmptyString(email, 'email');
  const normalizedEmail = normalizeEmail_(email);
  const users = listRecords(SHEET_NAMES.USERS);
  const match = users.filter(function(user) {
    return normalizeEmail_(user.email || '') === normalizedEmail;
  })[0];
  if (match) {
    return match;
  }
  const directMatch = findRecordById(SHEET_NAMES.USERS, 'email', String(email).trim());
  return directMatch ? directMatch.record : null;
}

function listUsers(filters) {
  ensureUsersAppLoginColumns();
  assertCurrentUserHasAnyPrivilege_([
    USER_PRIVILEGES.USERS_CREATE,
    USER_PRIVILEGES.USERS_UPDATE,
    USER_PRIVILEGES.USERS_ASSIGN_ROLES
  ]);

  const activeFilters = filters || {};
  const records = listRecords(SHEET_NAMES.USERS)
    .filter(function(user) {
      if (activeFilters.role && user.role !== activeFilters.role) return false;
      if (activeFilters.active !== undefined && activeFilters.active !== null && activeFilters.active !== '') {
        return isTruthy_(user.active) === isTruthy_(activeFilters.active);
      }
      if (activeFilters.query) {
        const query = String(activeFilters.query).toLowerCase();
        return String(user.email || '').toLowerCase().indexOf(query) !== -1 ||
          String(user.full_name || '').toLowerCase().indexOf(query) !== -1 ||
          String(user.user_code || '').toLowerCase().indexOf(query) !== -1;
      }
      return true;
    })
    .map(sanitizeUserForApi_);

  return records.sort(function(left, right) {
    return String(left.email || '').localeCompare(String(right.email || ''));
  });
}

function createUser(userData) {
  ensureUsersAppLoginColumns();
  assertCurrentUserHasPrivilege_(USER_PRIVILEGES.USERS_CREATE);
  const data = userData || {};
  const now = getCurrentTimestamp_();
  const email = normalizeEmail_(data.email);
  assertValidEmail_(email);
  assertNonEmptyString(data.full_name, 'full_name');
  assertAllowedValue(data.role, objectValues_(USER_ROLES), 'role');
  const userCode = normalizeUserCode_(data.user_code);
  const initialPin = data.initial_pin !== undefined ? data.initial_pin : data.pin;
  assertValidUserPin_(initialPin);

  if (getUserByEmail(email)) {
    throw new Error('User already exists: ' + email);
  }
  if (userCode && getUserByCode_(userCode)) {
    throw new Error('User code already exists: ' + userCode);
  }

  const defaultCashboxId = normalizeDefaultCashboxId_(data);
  const pinFields = buildPinFieldsFromInput_(initialPin);
  const user = {
    user_id: data.user_id || generateId_('USR'),
    email: email,
    full_name: String(data.full_name).trim(),
    role: data.role,
    active: data.active === undefined ? true : isTruthy_(data.active),
    default_cashbox_id: defaultCashboxId,
    user_code: userCode,
    pin_hash: pinFields.pin_hash || '',
    pin_salt: pinFields.pin_salt || '',
    last_login_at: '',
    last_logout_at: '',
    failed_login_count: 0,
    locked_until: '',
    last_google_session_email: '',
    created_at: now,
    updated_at: now
  };

  appendRecord(SHEET_NAMES.USERS, user);
  writeAuditLog(
    AUDIT_ACTIONS.CREATE,
    SHEET_NAMES.USERS,
    user.user_id,
    null,
    sanitizeUserForApi_(user),
    'USER_CREATED'
  );
  writeAuditLog(
    AUDIT_ACTIONS.USER_PIN_SET,
    SHEET_NAMES.USERS,
    user.user_id,
    null,
    buildSafeUserPinAuditPayload_(user),
    'USER_PIN_SET'
  );
  writeAuditLog(
    AUDIT_ACTIONS.USER_APP_LOGIN_ENABLED,
    SHEET_NAMES.USERS,
    user.user_id,
    null,
    buildSafeUserPinAuditPayload_(user),
    'USER_APP_LOGIN_ENABLED'
  );

  return sanitizeUserForApi_(user);
}

function updateUserPermissions(userId, permissionsData) {
  ensureUsersAppLoginColumns();
  assertNonEmptyString(userId, 'userId');
  const data = permissionsData || {};
  const match = findRecordById(SHEET_NAMES.USERS, 'user_id', userId);
  if (!match) {
    throw new Error('User not found: ' + userId);
  }

  const before = match.record;
  const updates = {};
  const auditLabels = [];

  if (Object.prototype.hasOwnProperty.call(data, 'full_name')) {
    assertCurrentUserHasPrivilege_(USER_PRIVILEGES.USERS_UPDATE);
    assertNonEmptyString(data.full_name, 'full_name');
    updates.full_name = String(data.full_name).trim();
    auditLabels.push('USER_UPDATED');
  }

  if (Object.prototype.hasOwnProperty.call(data, 'user_code')) {
    assertCurrentUserHasPrivilege_(USER_PRIVILEGES.USERS_UPDATE);
    const userCode = normalizeUserCode_(data.user_code);
    const existingByCode = getUserByCode_(userCode);
    if (existingByCode && existingByCode.user_id !== userId) {
      throw new Error('User code already exists: ' + userCode);
    }
    updates.user_code = userCode;
    auditLabels.push('USER_CODE_CHANGED');
  }

  if (Object.prototype.hasOwnProperty.call(data, 'role')) {
    assertCurrentUserHasPrivilege_(USER_PRIVILEGES.USERS_ASSIGN_ROLES);
    assertAllowedValue(data.role, objectValues_(USER_ROLES), 'role');
    updates.role = data.role;
    auditLabels.push('USER_ROLE_CHANGED');
  }

  if (Object.prototype.hasOwnProperty.call(data, 'active')) {
    if (isTruthy_(before.active) && !isTruthy_(data.active)) {
      assertCurrentUserHasPrivilege_(USER_PRIVILEGES.USERS_DISABLE);
      auditLabels.push('USER_DISABLED');
    } else {
      assertCurrentUserHasPrivilege_(USER_PRIVILEGES.USERS_UPDATE);
      auditLabels.push('USER_ACTIVE_CHANGED');
    }
    updates.active = isTruthy_(data.active);
  }

  if (Object.prototype.hasOwnProperty.call(data, 'default_cashbox_id') ||
      Object.prototype.hasOwnProperty.call(data, 'allowed_cashbox_ids')) {
    assertCurrentUserHasPrivilege_(USER_PRIVILEGES.USERS_UPDATE);
    updates.default_cashbox_id = normalizeDefaultCashboxId_(data);
    auditLabels.push('USER_CASHBOX_ACCESS_CHANGED');
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No user permission updates provided.');
  }

  preventRemovingLastActiveAdmin_(before, updates);
  updates.updated_at = getCurrentTimestamp_();

  const updated = updateRecordById(SHEET_NAMES.USERS, 'user_id', userId, updates);
  writeAuditLog(
    AUDIT_ACTIONS.UPDATE,
    SHEET_NAMES.USERS,
    userId,
    sanitizeUserForApi_(before),
    sanitizeUserForApi_(updated),
    auditLabels.join('; ')
  );
  if (Object.prototype.hasOwnProperty.call(updates, 'user_code') &&
      String(before.user_code || '') !== String(updated.user_code || '')) {
    writeAuditLog(
      AUDIT_ACTIONS.USER_CODE_CHANGED,
      SHEET_NAMES.USERS,
      userId,
      buildSafeUserPinAuditPayload_(before),
      buildSafeUserPinAuditPayload_(updated),
      'USER_CODE_CHANGED'
    );
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'active') &&
      isTruthy_(before.active) !== isTruthy_(updated.active)) {
    writeAuditLog(
      isTruthy_(updated.active) ? AUDIT_ACTIONS.USER_APP_LOGIN_ENABLED : AUDIT_ACTIONS.USER_APP_LOGIN_DISABLED,
      SHEET_NAMES.USERS,
      userId,
      buildSafeUserPinAuditPayload_(before),
      buildSafeUserPinAuditPayload_(updated),
      isTruthy_(updated.active) ? 'USER_APP_LOGIN_ENABLED' : 'USER_APP_LOGIN_DISABLED'
    );
  }

  return sanitizeUserForApi_(updated);
}

function resetUserPin(userId, newPin) {
  ensureUsersAppLoginColumns();
  assertNonEmptyString(userId, 'userId');
  assertCurrentUserHasAnyPrivilege_([
    USER_PRIVILEGES.USERS_UPDATE,
    USER_PRIVILEGES.USERS_ASSIGN_ROLES
  ]);
  assertValidUserPin_(newPin);

  const match = findRecordById(SHEET_NAMES.USERS, 'user_id', userId);
  if (!match) {
    throw new Error('User not found: ' + userId);
  }

  const before = match.record;
  const pinFields = buildPinFieldsFromInput_(newPin);
  const updates = {
    pin_hash: pinFields.pin_hash,
    pin_salt: pinFields.pin_salt,
    failed_login_count: 0,
    locked_until: '',
    updated_at: getCurrentTimestamp_()
  };
  const updated = updateRecordById(SHEET_NAMES.USERS, 'user_id', userId, updates);
  writeAuditLog(
    AUDIT_ACTIONS.USER_PIN_RESET,
    SHEET_NAMES.USERS,
    userId,
    buildSafeUserPinAuditPayload_(before),
    buildSafeUserPinAuditPayload_(updated),
    'USER_PIN_RESET'
  );
  if (!before.pin_hash || !before.pin_salt) {
    writeAuditLog(
      AUDIT_ACTIONS.USER_APP_LOGIN_ENABLED,
      SHEET_NAMES.USERS,
      userId,
      buildSafeUserPinAuditPayload_(before),
      buildSafeUserPinAuditPayload_(updated),
      'USER_APP_LOGIN_ENABLED'
    );
  }
  return sanitizeUserForApi_(updated);
}

function prepareUsersForAppLogin() {
  ensureUsersAppLoginColumns();
  assertCurrentUserHasAnyPrivilege_([
    USER_PRIVILEGES.USERS_CREATE,
    USER_PRIVILEGES.USERS_UPDATE,
    USER_PRIVILEGES.USERS_ASSIGN_ROLES
  ]);
  const users = listRecords(SHEET_NAMES.USERS).map(sanitizeUserForApi_);
  return {
    total: users.length,
    without_user_code: users.filter(function(user) { return !user.user_code; }),
    without_pin: listRecords(SHEET_NAMES.USERS)
      .filter(function(user) { return !user.pin_hash || !user.pin_salt; })
      .map(sanitizeUserForApi_),
    inactive: users.filter(function(user) { return !user.active; })
  };
}

function ensureUsersAppLoginColumns() {
  return ensureSheetColumns_(SHEET_NAMES.USERS, TABLE_HEADERS.USERS);
}

function ensureAppSessionsSheet() {
  return ensureSheetColumns_(SHEET_NAMES.APP_SESSIONS, TABLE_HEADERS.APP_SESSIONS);
}

function ensureAuditAppContextColumns() {
  return ensureSheetColumns_(SHEET_NAMES.AUDIT_LOG, TABLE_HEADERS.AUDIT_LOG);
}

function reportAppLoginDatabaseReadiness() {
  const structureChanges = {
    users: ensureUsersAppLoginColumns(),
    app_sessions: ensureAppSessionsSheet(),
    audit_log: ensureAuditAppContextColumns()
  };
  const usersHeaders = getReadOnlySheetHeaders_(SHEET_NAMES.USERS);
  const appSessionsHeaders = getReadOnlySheetHeaders_(SHEET_NAMES.APP_SESSIONS);
  const auditHeaders = getReadOnlySheetHeaders_(SHEET_NAMES.AUDIT_LOG);
  const users = readSheetRecordsReadOnly_(SHEET_NAMES.USERS);
  const duplicateReport = reportDuplicateUsers();
  const roles = objectValues_(USER_ROLES);
  const appUserColumns = TABLE_HEADERS.USERS.filter(function(header) {
    return [
      'user_code',
      'pin_hash',
      'pin_salt',
      'last_login_at',
      'last_logout_at',
      'failed_login_count',
      'locked_until',
      'last_google_session_email'
    ].indexOf(header) !== -1;
  });
  const auditContextColumns = [
    'app_user_id',
    'app_user_name',
    'user_code',
    'role',
    'google_session_email',
    'cashbox_id',
    'shift_id',
    'timestamp'
  ];
  const activeAdmins = users.filter(function(user) {
    return user.role === USER_ROLES.ADMIN && isTruthy_(user.active);
  });
  const activeAdminsWithCode = activeAdmins.filter(function(user) {
    return String(user.user_code || '').trim() !== '';
  });
  const activeAdminsWithPin = activeAdminsWithCode.filter(function(user) {
    return String(user.pin_hash || '').trim() !== '' && String(user.pin_salt || '').trim() !== '';
  });
  const usersWithoutCode = users.filter(function(user) {
    return isTruthy_(user.active) && String(user.user_code || '').trim() === '';
  }).map(sanitizeUserForApi_);
  const usersWithoutPin = users.filter(function(user) {
    return isTruthy_(user.active) && (!user.pin_hash || !user.pin_salt);
  }).map(sanitizeUserForApi_);
  const activeUsersWithoutRole = users.filter(function(user) {
    return isTruthy_(user.active) && String(user.role || '').trim() === '';
  }).map(sanitizeUserForApi_);
  const invalidRoleUsers = users.filter(function(user) {
    return String(user.role || '').trim() !== '' && roles.indexOf(user.role) === -1;
  }).map(sanitizeUserForApi_);
  const unclearActiveUsers = users.filter(function(user) {
    return !isClearBooleanValue_(user.active);
  }).map(sanitizeUserForApi_);
  const usersMissingColumns = findMissingHeaders_(usersHeaders, TABLE_HEADERS.USERS);
  const appSessionsMissingColumns = findMissingHeaders_(appSessionsHeaders, TABLE_HEADERS.APP_SESSIONS);
  const auditMissingColumns = findMissingHeaders_(auditHeaders, auditContextColumns);
  const blockers = [];
  const warnings = [];

  if (usersMissingColumns.length) {
    blockers.push('USERS missing columns: ' + usersMissingColumns.join(', '));
  }
  if (!appSessionsHeaders.exists) {
    blockers.push('APP_SESSIONS sheet is missing');
  } else if (appSessionsMissingColumns.length) {
    blockers.push('APP_SESSIONS missing columns: ' + appSessionsMissingColumns.join(', '));
  }
  if (auditMissingColumns.length) {
    blockers.push('AUDIT_LOG missing app context columns: ' + auditMissingColumns.join(', '));
  }
  duplicateReport.duplicate_user_ids.forEach(function(duplicate) {
    blockers.push('Duplicate user_id: ' + duplicate.value);
  });
  if (activeAdminsWithPin.length === 0) {
    blockers.push('No active ADMIN user with user_code and PIN');
  }
  if (duplicateReport.duplicate_user_codes.length) {
    warnings.push('Duplicate user_code values exist.');
  }
  if (usersWithoutCode.length) {
    warnings.push('Active users without user_code: ' + usersWithoutCode.length);
  }
  if (usersWithoutPin.length) {
    warnings.push('Active users without PIN: ' + usersWithoutPin.length);
  }
  if (invalidRoleUsers.length) {
    blockers.push('Users with invalid role: ' + invalidRoleUsers.length);
  }
  if (unclearActiveUsers.length) {
    warnings.push('Users with unclear active value: ' + unclearActiveUsers.length);
  }

  return {
    ok_for_deploy: blockers.length === 0,
    users: {
      exists: usersHeaders.exists,
      missing_columns: usersMissingColumns,
      app_login_columns: appUserColumns,
      duplicate_user_ids: duplicateReport.duplicate_user_ids,
      duplicate_user_codes: duplicateReport.duplicate_user_codes,
      active_admin_count: activeAdmins.length,
      active_admin_with_user_code_count: activeAdminsWithCode.length,
      active_admin_with_pin_count: activeAdminsWithPin.length,
      users_without_user_code: usersWithoutCode,
      users_without_pin: usersWithoutPin,
      active_users_without_role: activeUsersWithoutRole,
      invalid_role_users: invalidRoleUsers,
      unclear_active_users: unclearActiveUsers
    },
    app_sessions: {
      exists: appSessionsHeaders.exists,
      missing_columns: appSessionsMissingColumns
    },
    audit_log: {
      exists: auditHeaders.exists,
      missing_columns: auditMissingColumns
    },
    structure_changes: structureChanges,
    attribution: reportBusinessAttributionReadiness_(),
    blockers: blockers,
    warnings: warnings
  };
}

function initializeFirstAppAdmin(options) {
  const data = options || {};
  ensureUsersAppLoginColumns();
  ensureAuditAppContextColumns();
  const userCode = normalizeUserCode_(data.user_code);
  const pinFields = buildPinFieldsFromInput_(data.pin);
  const users = readSheetRecordsReadOnly_(SHEET_NAMES.USERS);
  const duplicateIds = reportDuplicateUsers().duplicate_user_ids;
  if (data.user_id && duplicateIds.some(function(duplicate) { return duplicate.value === String(data.user_id); })) {
    throw new Error('Duplicate user_id must be resolved before initializing app admin: ' + data.user_id);
  }
  let match = null;
  if (data.user_id) {
    match = findRecordById(SHEET_NAMES.USERS, 'user_id', data.user_id);
  }
  if (!match && data.email) {
    const normalizedEmail = normalizeEmail_(data.email);
    const matchedUser = users.filter(function(user) {
      return normalizeEmail_(user.email || '') === normalizedEmail;
    })[0];
    if (matchedUser) {
      if (duplicateIds.some(function(duplicate) { return duplicate.value === String(matchedUser.user_id); })) {
        throw new Error('Duplicate user_id must be resolved before initializing app admin: ' + matchedUser.user_id);
      }
      match = findRecordById(SHEET_NAMES.USERS, 'user_id', matchedUser.user_id);
    }
  }

  const existingCode = getUserByCode_(userCode);
  if (existingCode && (!match || existingCode.user_id !== match.record.user_id)) {
    throw new Error('User code already exists: ' + userCode);
  }

  if (match) {
    const before = match.record;
    if (before.role !== USER_ROLES.ADMIN) {
      throw new Error('initializeFirstAppAdmin can update only an existing ADMIN user.');
    }
    const updates = {
      user_code: userCode,
      pin_hash: pinFields.pin_hash,
      pin_salt: pinFields.pin_salt,
      failed_login_count: 0,
      locked_until: '',
      active: true,
      updated_at: getCurrentTimestamp_()
    };
    if (data.email) {
      updates.email = normalizeEmail_(data.email);
    }
    if (data.full_name) {
      updates.full_name = String(data.full_name).trim();
    }
    const updated = updateRecordById(SHEET_NAMES.USERS, 'user_id', before.user_id, updates);
    writeAuditLog(
      AUDIT_ACTIONS.USER_PIN_SET,
      SHEET_NAMES.USERS,
      before.user_id,
      buildSafeUserPinAuditPayload_(before),
      buildSafeUserPinAuditPayload_(updated),
      'INITIAL_APP_ADMIN_PIN_SET'
    );
    return sanitizeUserForApi_(updated);
  }

  if (data.create_new !== true) {
    throw new Error('Existing ADMIN user was not found. Set create_new=true explicitly to create a new ADMIN.');
  }
  assertValidEmail_(normalizeEmail_(data.email));
  assertNonEmptyString(data.full_name, 'full_name');
  const user = {
    user_id: data.user_id || generateId_('USR'),
    email: normalizeEmail_(data.email),
    full_name: String(data.full_name).trim(),
    role: USER_ROLES.ADMIN,
    active: true,
    default_cashbox_id: data.default_cashbox_id || '',
    user_code: userCode,
    pin_hash: pinFields.pin_hash,
    pin_salt: pinFields.pin_salt,
    last_login_at: '',
    last_logout_at: '',
    failed_login_count: 0,
    locked_until: '',
    last_google_session_email: '',
    created_at: getCurrentTimestamp_(),
    updated_at: getCurrentTimestamp_()
  };
  if (findRecordById(SHEET_NAMES.USERS, 'user_id', user.user_id)) {
    throw new Error('User ID already exists: ' + user.user_id);
  }
  appendRecord(SHEET_NAMES.USERS, user);
  writeAuditLog(
    AUDIT_ACTIONS.CREATE,
    SHEET_NAMES.USERS,
    user.user_id,
    null,
    buildSafeUserPinAuditPayload_(user),
    'INITIAL_APP_ADMIN_CREATED'
  );
  return sanitizeUserForApi_(user);
}

function initializeFirstAppAdminFromScriptProperty() {
  const propertyName = 'BOOTSTRAP_ADMIN_PIN';
  const properties = PropertiesService.getScriptProperties();
  const pin = properties.getProperty(propertyName);
  if (!pin) {
    throw new Error('Missing Script Property: ' + propertyName);
  }
  properties.deleteProperty(propertyName);
  return initializeFirstAppAdmin({
    user_id: 'USR_ADMIN_MILANKO',
    user_code: 'MILANKO',
    email: 'Milanko.Zegarac@nedeljkovic.co.rs',
    full_name: 'Milanko Zegarac',
    default_cashbox_id: 'CB_MAIN',
    pin: pin
  });
}

function runAppLoginBootstrapFromWeb(data) {
  const payload = data || {};
  assertAppLoginBootstrapAllowed_(payload.token || '');
  assertAppLoginBootstrapNotDone_();
  const status = getAppLoginBootstrapStatusForWeb(payload.token || '');
  if (status.ok_for_deploy) {
    markAppLoginBootstrapDone_();
    throw new Error('Bootstrap je već završen.');
  }
  const pin = payload.admin_pin || payload.pin || '';
  const pinConfirm = payload.admin_pin_confirm || payload.pin_confirm || '';
  assertValidUserPin_(pin);
  if (String(pin) !== String(pinConfirm)) {
    throw new Error('PIN i potvrda PIN-a se ne poklapaju.');
  }

  const before = reportAppLoginDatabaseReadiness();
  const duplicateFix = fixKnownMilankoGoogleDuplicateIfNeeded_();
  const admin = initializeFirstAppAdmin({
    user_id: 'USR_ADMIN_MILANKO',
    user_code: 'MILANKO',
    email: 'Milanko.Zegarac@nedeljkovic.co.rs',
    full_name: 'Milanko Zegarac',
    default_cashbox_id: 'CB_MAIN',
    pin: pin
  });
  const after = reportAppLoginDatabaseReadiness();
  if (after.ok_for_deploy) {
    markAppLoginBootstrapDone_();
  }

  return {
    ok_for_deploy: after.ok_for_deploy,
    duplicate_fix: duplicateFix,
    admin: admin,
    before: sanitizeBootstrapReadinessForApi_(before),
    after: sanitizeBootstrapReadinessForApi_(after)
  };
}

function getAppLoginBootstrapStatusForWeb(token) {
  assertAppLoginBootstrapAllowed_(token || '');
  const done = isAppLoginBootstrapDone_();
  const report = reportAppLoginDatabaseReadiness();
  return {
    token_valid: true,
    bootstrap_done: done,
    ok_for_deploy: Boolean(report.ok_for_deploy),
    blockers: report.blockers || [],
    warnings: report.warnings || [],
    active_admin_count: report.users && report.users.active_admin_count || 0,
    active_admin_with_user_code_count: report.users && report.users.active_admin_with_user_code_count || 0,
    active_admin_with_pin_count: report.users && report.users.active_admin_with_pin_count || 0,
    duplicate_user_ids: report.users && report.users.duplicate_user_ids || [],
    duplicate_user_codes: report.users && report.users.duplicate_user_codes || [],
    users_without_user_code: report.users && report.users.users_without_user_code || [],
    users_without_pin: report.users && report.users.users_without_pin || [],
    expected_admin_ready: Boolean(report.users && report.users.active_admin_with_pin_count > 0),
    app_sessions: report.app_sessions || {},
    audit_log: report.audit_log || {},
    structure_changes: report.structure_changes || {}
  };
}

function assertAppLoginBootstrapAllowed_(token) {
  const props = PropertiesService.getScriptProperties();
  const expectedToken = props.getProperty('APP_LOGIN_BOOTSTRAP_TOKEN');
  const fallbackToken = typeof TEMP_APP_LOGIN_BOOTSTRAP_TOKEN !== 'undefined'
    ? TEMP_APP_LOGIN_BOOTSTRAP_TOKEN
    : '';
  const providedToken = String(token || '').trim();
  const effectiveToken = expectedToken || fallbackToken;
  if (!effectiveToken || !providedToken || !secureCompare_(providedToken, String(effectiveToken))) {
    throw new Error('Bootstrap token is invalid.');
  }
  return true;
}

function assertAppLoginBootstrapNotDone_() {
  if (isAppLoginBootstrapDone_()) {
    throw new Error('Bootstrap je već završen.');
  }
}

function isAppLoginBootstrapDone_() {
  return String(PropertiesService.getScriptProperties().getProperty('APP_LOGIN_BOOTSTRAP_DONE') || '').toLowerCase() === 'true';
}

function markAppLoginBootstrapDone_() {
  PropertiesService.getScriptProperties().setProperty('APP_LOGIN_BOOTSTRAP_DONE', 'true');
}

function fixKnownMilankoGoogleDuplicateIfNeeded_() {
  ensureUsersAppLoginColumns();
  const records = readSheetRecordsReadOnly_(SHEET_NAMES.USERS).filter(function(user) {
    return String(user.user_id || '') === 'USR_ADMIN_MILANKO' &&
      normalizeEmail_(user.email || '') === 'mzeg76@google.com';
  });
  if (findRecordById(SHEET_NAMES.USERS, 'user_id', 'USR_ADMIN_MILANKO_GOOGLE')) {
    return {
      changed: false,
      reason: 'USR_ADMIN_MILANKO_GOOGLE already exists.'
    };
  }
  if (records.length === 0) {
    return {
      changed: false,
      reason: 'Known duplicate row was not found.'
    };
  }
  if (records.length > 1) {
    throw new Error('More than one row matches USR_ADMIN_MILANKO + mzeg76@google.com.');
  }
  return Object.assign(
    { changed: true },
    fixDuplicateUserId('USR_ADMIN_MILANKO', { email: 'mzeg76@google.com' }, 'USR_ADMIN_MILANKO_GOOGLE')
  );
}

function sanitizeBootstrapReadinessForApi_(report) {
  const source = report || {};
  return {
    ok_for_deploy: Boolean(source.ok_for_deploy),
    blockers: source.blockers || [],
    warnings: source.warnings || [],
    users: source.users ? {
      missing_columns: source.users.missing_columns || [],
      duplicate_user_ids: source.users.duplicate_user_ids || [],
      duplicate_user_codes: source.users.duplicate_user_codes || [],
      active_admin_count: source.users.active_admin_count || 0,
      active_admin_with_user_code_count: source.users.active_admin_with_user_code_count || 0,
      active_admin_with_pin_count: source.users.active_admin_with_pin_count || 0,
      users_without_user_code: source.users.users_without_user_code || [],
      users_without_pin: source.users.users_without_pin || []
    } : {},
    app_sessions: source.app_sessions || {},
    audit_log: source.audit_log || {},
    structure_changes: source.structure_changes || {}
  };
}

function reportDuplicateUsers() {
  const users = readSheetRecordsReadOnly_(SHEET_NAMES.USERS);
  return {
    duplicate_user_ids: findDuplicateRecordsByField_(users, 'user_id'),
    duplicate_user_codes: findDuplicateRecordsByField_(users, 'user_code')
  };
}

function fixDuplicateUserId(oldUserId, rowSelector, newUserId) {
  assertNonEmptyString(oldUserId, 'oldUserId');
  assertNonEmptyString(newUserId, 'newUserId');
  const selector = rowSelector || {};
  ensureUsersAppLoginColumns();
  if (findRecordById(SHEET_NAMES.USERS, 'user_id', newUserId)) {
    throw new Error('New user_id already exists: ' + newUserId);
  }
  const sheet = getSheetByNameOrThrow(SHEET_NAMES.USERS);
  const headers = getHeaders_(sheet);
  const userIdIndex = headers.indexOf('user_id');
  const emailIndex = headers.indexOf('email');
  if (userIdIndex === -1) {
    throw new Error('USERS header does not contain user_id.');
  }

  let targetRowNumber = Number(selector.row_number || selector.rowNumber || 0);
  if (!targetRowNumber && selector.email) {
    if (emailIndex === -1) {
      throw new Error('USERS header does not contain email.');
    }
    const normalizedEmail = normalizeEmail_(selector.email);
    const records = readSheetRecordsReadOnly_(SHEET_NAMES.USERS);
    const matched = records.filter(function(user) {
      return String(user.user_id || '') === String(oldUserId) &&
        normalizeEmail_(user.email || '') === normalizedEmail;
    })[0];
    if (matched && matched._row_number) {
      targetRowNumber = matched._row_number;
    }
  }
  if (!targetRowNumber || targetRowNumber < 2) {
    throw new Error('Provide row_number or email selector for the duplicate user row.');
  }

  const row = sheet.getRange(targetRowNumber, 1, 1, headers.length).getValues()[0];
  const before = rowToRecord_(headers, row);
  if (String(before.user_id || '') !== String(oldUserId)) {
    throw new Error('Selected row does not contain oldUserId: ' + oldUserId);
  }

  sheet.getRange(targetRowNumber, userIdIndex + 1).setValue(newUserId);
  const afterRow = sheet.getRange(targetRowNumber, 1, 1, headers.length).getValues()[0];
  const after = rowToRecord_(headers, afterRow);
  writeAuditLog(
    AUDIT_ACTIONS.UPDATE,
    SHEET_NAMES.USERS,
    newUserId,
    sanitizeUserForApi_(before),
    sanitizeUserForApi_(after),
    'FIX_DUPLICATE_USER_ID'
  );
  return {
    row_number: targetRowNumber,
    old_user_id: oldUserId,
    new_user_id: newUserId,
    user: sanitizeUserForApi_(after)
  };
}

function getPermissionsMatrix() {
  assertCurrentUserHasAnyPrivilege_([
    USER_PRIVILEGES.USERS_CREATE,
    USER_PRIVILEGES.USERS_UPDATE,
    USER_PRIVILEGES.USERS_ASSIGN_ROLES,
    USER_PRIVILEGES.AUDIT_VIEW
  ]);
  return objectValues_(USER_ROLES).map(function(role) {
    return {
      role: role,
      privileges: getPrivilegesForRole_(role)
    };
  });
}

function assertCurrentUserHasPrivilege_(privilege) {
  const user = assertCurrentUserActive();
  if (!userHasPrivilege_(user, privilege)) {
    throw new Error('User privilege is not allowed for this action: ' + privilege);
  }
  return user;
}

function assertCurrentUserHasAnyPrivilege_(privileges) {
  const user = assertCurrentUserActive();
  const allowed = Array.isArray(privileges) ? privileges : [privileges];
  if (!allowed.some(function(privilege) { return userHasPrivilege_(user, privilege); })) {
    throw new Error('User does not have required privileges: ' + allowed.join(', '));
  }
  return user;
}

function userHasPrivilege_(user, privilege) {
  if (!user || !privilege) {
    return false;
  }
  return getPrivilegesForRole_(user.role).indexOf(privilege) !== -1;
}

function getPrivilegesForRole_(role) {
  const privileges = ROLE_PRIVILEGES[role] || [];
  return privileges.slice();
}

function sanitizeUserForApi_(user) {
  const role = user.role || USER_ROLES.VIEWER;
  return {
    user_id: user.user_id || '',
    email: user.email || '',
    full_name: user.full_name || '',
    role: role,
    active: isTruthy_(user.active),
    default_cashbox_id: user.default_cashbox_id || '',
    user_code: user.user_code || '',
    app_login_status: getUserAppLoginStatus_(user),
    privileges: getPrivilegesForRole_(role),
    last_login_at: user.last_login_at || '',
    last_logout_at: user.last_logout_at || '',
    failed_login_count: Number(user.failed_login_count || 0),
    locked_until: user.locked_until || '',
    last_google_session_email: user.last_google_session_email || '',
    created_at: user.created_at || '',
    updated_at: user.updated_at || ''
  };
}

function getUserAppLoginStatus_(user) {
  if (!user || !user.user_code) {
    return 'NO_USER_CODE';
  }
  if (!user.pin_hash || !user.pin_salt) {
    return 'PIN_NOT_SET';
  }
  if (isUserLoginLocked_(user)) {
    return 'LOCKED';
  }
  return 'PIN_SET';
}

function buildSafeUserPinAuditPayload_(user) {
  return {
    target_user_id: user && user.user_id || '',
    target_user_code: user && user.user_code || '',
    target_user_name: user && user.full_name || '',
    role: user && user.role || '',
    app_login_status: getUserAppLoginStatus_(user || {})
  };
}

function normalizeDefaultCashboxId_(data) {
  const value = data.default_cashbox_id ||
    (Array.isArray(data.allowed_cashbox_ids) && data.allowed_cashbox_ids.length ? data.allowed_cashbox_ids[0] : '');
  const cashboxId = String(value || '').trim();
  if (cashboxId) {
    assertActiveCashbox(cashboxId);
  }
  return cashboxId;
}

function assertValidEmail_(email) {
  assertNonEmptyString(email, 'email');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('email must be valid.');
  }
}

function normalizeEmail_(email) {
  return String(email || '').trim().toLowerCase();
}

function preventRemovingLastActiveAdmin_(before, updates) {
  const currentRole = Object.prototype.hasOwnProperty.call(updates, 'role') ? updates.role : before.role;
  const currentActive = Object.prototype.hasOwnProperty.call(updates, 'active') ? isTruthy_(updates.active) : isTruthy_(before.active);
  const wasActiveAdmin = before.role === USER_ROLES.ADMIN && isTruthy_(before.active);
  const remainsActiveAdmin = currentRole === USER_ROLES.ADMIN && currentActive;
  if (!wasActiveAdmin || remainsActiveAdmin) {
    return;
  }

  const activeAdmins = listRecords(SHEET_NAMES.USERS).filter(function(user) {
    return user.user_id !== before.user_id &&
      user.role === USER_ROLES.ADMIN &&
      isTruthy_(user.active);
  });
  if (activeAdmins.length === 0) {
    throw new Error('Cannot remove or disable the last active ADMIN user.');
  }
}

function assertUserExistsAndActive(email) {
  const user = getUserByEmail(email);
  if (!user) {
    throw new Error('User not found: ' + email);
  }
  if (!isTruthy_(user.active)) {
    throw new Error('User is not active: ' + email);
  }
  return user;
}

function assertUserCanReceiveShift(email) {
  const user = assertUserExistsAndActive(email);
  assertAllowedValue(user.role, [
    USER_ROLES.CASHIER,
    USER_ROLES.CASHIER_SUPERVISOR,
    USER_ROLES.ADMIN
  ], 'receiving user role');
  return user;
}

function assertCurrentUserActive() {
  const user = getCurrentUser();
  if (!user.active) {
    throw new Error('Current user is not active: ' + user.email);
  }
  return user;
}

function assertUserCanActOnOwnOrRole(ownerFieldValue, elevatedRoles) {
  const user = assertCurrentUserActive();
  const owner = String(ownerFieldValue || '').trim();
  if (owner && (owner === user.email || owner === user.user_id)) {
    return user;
  }
  return assertUserHasRole(elevatedRoles || []);
}

function isTruthy_(value) {
  return value === true || value === 'TRUE' || value === 'true' || value === 1 || value === '1';
}

function isDevelopmentMode_() {
  return Boolean(APP_CONFIG && APP_CONFIG.DEVELOPMENT_MODE === true);
}

function readSheetRecordsReadOnly_(sheetName) {
  const spreadsheet = getDatabaseSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  const headers = getActualHeaders_(sheet).filter(function(header) {
    return String(header || '').trim() !== '';
  });
  if (!headers.length) {
    return [];
  }
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length)
    .getValues()
    .map(function(row, index) {
      const record = rowToRecord_(headers, row);
      record._row_number = index + 2;
      return record;
    });
}

function getReadOnlySheetHeaders_(sheetName) {
  const spreadsheet = getDatabaseSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    return {
      exists: false,
      headers: []
    };
  }
  return {
    exists: true,
    headers: getActualHeaders_(sheet).filter(function(header) {
      return String(header || '').trim() !== '';
    })
  };
}

function findMissingHeaders_(headerReport, expectedHeaders) {
  const headers = headerReport && headerReport.headers ? headerReport.headers : [];
  return (expectedHeaders || []).filter(function(header) {
    return headers.indexOf(header) === -1;
  });
}

function findDuplicateRecordsByField_(records, fieldName) {
  const grouped = {};
  (records || []).forEach(function(record) {
    const value = String(record[fieldName] || '').trim();
    if (!value) {
      return;
    }
    if (!grouped[value]) {
      grouped[value] = [];
    }
    grouped[value].push({
      row_number: record._row_number || '',
      user_id: record.user_id || '',
      user_code: record.user_code || '',
      email: record.email || '',
      full_name: record.full_name || '',
      role: record.role || '',
      active: record.active
    });
  });
  return Object.keys(grouped)
    .filter(function(value) {
      return grouped[value].length > 1;
    })
    .map(function(value) {
      return {
        value: value,
        rows: grouped[value]
      };
    });
}

function isClearBooleanValue_(value) {
  return value === true ||
    value === false ||
    value === 'TRUE' ||
    value === 'FALSE' ||
    value === 'true' ||
    value === 'false';
}

function reportBusinessAttributionReadiness_() {
  return {
    cash_events: reportSheetColumns_(SHEET_NAMES.CASH_EVENTS, [
      'created_by',
      'cashbox_id',
      'shift_id',
      'posted_by',
      'posted_at',
      'updated_at'
    ]),
    payment_orders: reportSheetColumns_(SHEET_NAMES.PAYMENT_ORDERS, [
      'created_by',
      'issued_by',
      'executed_by',
      'linked_cash_event_id',
      'cashbox_id',
      'status',
      'created_at',
      'updated_at'
    ]),
    shifts: reportSheetColumns_(SHEET_NAMES.SHIFTS, [
      'opened_by',
      'closed_by',
      'cashbox_id',
      'shift_id',
      'opened_at',
      'closed_at',
      'updated_at'
    ]),
    note: 'App identity is carried through AUDIT_LOG app context; business tables keep existing attribution columns.'
  };
}

function reportSheetColumns_(sheetName, columns) {
  const headers = getReadOnlySheetHeaders_(sheetName);
  return {
    exists: headers.exists,
    present_columns: (columns || []).filter(function(column) {
      return headers.headers.indexOf(column) !== -1;
    }),
    missing_columns: (columns || []).filter(function(column) {
      return headers.headers.indexOf(column) === -1;
    })
  };
}
