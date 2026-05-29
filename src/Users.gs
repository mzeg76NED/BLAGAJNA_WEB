/**
 * User and role helpers.
 */
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
        default_cashbox_id: ''
      };
    }
    throw new Error('Current user is not registered in USERS: ' + email);
  }
  if (!isTruthy_(user.active)) {
    throw new Error('Current user is not active: ' + email);
  }

  return {
    user_id: user.user_id || '',
    email: user.email || email,
    full_name: user.full_name || '',
    role: user.role || USER_ROLES.VIEWER,
    active: isTruthy_(user.active),
    default_cashbox_id: user.default_cashbox_id || ''
  };
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

  const match = findRecordById(SHEET_NAMES.USERS, 'email', email);
  return Boolean(match && isTruthy_(match.record.active));
}

function getUserByEmail(email) {
  assertNonEmptyString(email, 'email');
  const match = findRecordById(SHEET_NAMES.USERS, 'email', String(email).trim());
  return match ? match.record : null;
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
