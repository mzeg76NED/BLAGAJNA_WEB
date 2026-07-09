export function isActiveValue(value) {
  return value === true || value === 'true' || value === 'TRUE' || value === 1 || value === '1';
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    user_id: user.user_id || '',
    user_code: user.user_code || '',
    email: user.email || '',
    full_name: user.full_name || '',
    role: user.role || 'VIEWER',
    active: isActiveValue(user.active),
    default_cashbox_id: user.default_cashbox_id || '',
    last_login_at: user.last_login_at || '',
    last_logout_at: user.last_logout_at || '',
    failed_login_count: Number(user.failed_login_count || 0),
    locked_until: user.locked_until || '',
    last_google_session_email: user.last_google_session_email || '',
    created_at: user.created_at || '',
    updated_at: user.updated_at || ''
  };
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function normalizeUserCode(userCode) {
  return String(userCode || '').trim().toUpperCase();
}
