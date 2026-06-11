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
    USER_PRIVILEGES.AUDIT_VIEW
  ]),
  CASHIER: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_OWN,
    USER_PRIVILEGES.PAYMENT_ORDERS_VIEW,
    USER_PRIVILEGES.PAYMENT_ORDERS_REJECT,
    USER_PRIVILEGES.PAYMENT_ORDERS_EXECUTE,
    USER_PRIVILEGES.DOCUMENTS_ATTACH,
    USER_PRIVILEGES.DOCUMENTS_VIEW
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
    USER_PRIVILEGES.DOCUMENTS_VIEW
  ]),
  REQUESTER: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_CREATE,
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_OWN,
    USER_PRIVILEGES.DOCUMENTS_ATTACH,
    USER_PRIVILEGES.DOCUMENTS_VIEW
  ]),
  VIEWER: Object.freeze([
    USER_PRIVILEGES.PAYMENT_REQUESTS_VIEW_ALL,
    USER_PRIVILEGES.DOCUMENTS_VIEW
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
          String(user.full_name || '').toLowerCase().indexOf(query) !== -1;
      }
      return true;
    })
    .map(sanitizeUserForApi_);

  return records.sort(function(left, right) {
    return String(left.email || '').localeCompare(String(right.email || ''));
  });
}

function createUser(userData) {
  assertCurrentUserHasPrivilege_(USER_PRIVILEGES.USERS_CREATE);
  const data = userData || {};
  const now = getCurrentTimestamp_();
  const email = normalizeEmail_(data.email);
  assertValidEmail_(email);
  assertNonEmptyString(data.full_name, 'full_name');
  assertAllowedValue(data.role, objectValues_(USER_ROLES), 'role');

  if (getUserByEmail(email)) {
    throw new Error('User already exists: ' + email);
  }

  const defaultCashboxId = normalizeDefaultCashboxId_(data);
  const user = {
    user_id: data.user_id || generateId_('USR'),
    email: email,
    full_name: String(data.full_name).trim(),
    role: data.role,
    active: data.active === undefined ? true : isTruthy_(data.active),
    default_cashbox_id: defaultCashboxId,
    created_at: now,
    updated_at: now
  };

  appendRecord(SHEET_NAMES.USERS, user);
  writeAuditLog(
    AUDIT_ACTIONS.CREATE,
    SHEET_NAMES.USERS,
    user.user_id,
    null,
    user,
    'USER_CREATED'
  );

  return sanitizeUserForApi_(user);
}

function updateUserPermissions(userId, permissionsData) {
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
    before,
    updated,
    auditLabels.join('; ')
  );

  return sanitizeUserForApi_(updated);
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
    privileges: getPrivilegesForRole_(role),
    created_at: user.created_at || '',
    updated_at: user.updated_at || ''
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
