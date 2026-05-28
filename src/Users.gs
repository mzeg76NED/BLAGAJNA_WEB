/**
 * User and role helpers.
 */
function getCurrentUser() {
  // TODO: Resolve current user from Session and USERS sheet.
  return {
    email: Session.getActiveUser().getEmail(),
    role: USER_ROLES.VIEWER
  };
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
  // TODO: Check USERS sheet active status.
  return Boolean(email);
}
