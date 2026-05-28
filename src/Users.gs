/**
 * User and role helpers.
 */
function getCurrentUser() {
  const email = getCurrentUserEmail();
  let userRecord = null;

  try {
    const match = findRecordById(SHEET_NAMES.USERS, 'email', email);
    userRecord = match ? match.record : null;
  } catch (error) {
    userRecord = null;
  }

  return {
    user_id: userRecord ? userRecord.user_id : '',
    email: email,
    full_name: userRecord ? userRecord.full_name : '',
    role: userRecord && userRecord.role ? userRecord.role : USER_ROLES.VIEWER,
    active: userRecord ? isTruthy_(userRecord.active) : false,
    default_cashbox_id: userRecord ? userRecord.default_cashbox_id : ''
  };
}

function getCurrentUserEmail() {
  const activeUser = Session.getActiveUser();
  return activeUser && activeUser.getEmail() ? activeUser.getEmail() : '';
}

function getCurrentUserRole() {
  return getCurrentUser().role;
}

function assertUserHasRole(allowedRoles) {
  const role = getCurrentUserRole();
  if (allowedRoles.indexOf(role) === -1) {
    throw new Error('User role is not allowed for this action: ' + role);
  }
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
  if (!user.email) {
    throw new Error('Current user email is not available. Check Apps Script deployment access settings.');
  }
  if (!user.active) {
    throw new Error('Current user is not active: ' + user.email);
  }
}

function isTruthy_(value) {
  return value === true || value === 'TRUE' || value === 'true' || value === 1 || value === '1';
}
