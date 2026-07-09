import { supabaseRest } from './supabase.js';

function makeId(prefix) {
  return prefix + '-' + crypto.randomUUID();
}

export async function insertAuditLog(env, options) {
  const {
    action,
    entityType,
    entityId,
    oldValue = null,
    newValue = {},
    comment = '',
    actor = {},
    session = {}
  } = options || {};

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
      entity_type: entityType,
      entity_id: entityId || '',
      old_value: oldValue,
      new_value: newValue,
      comment: comment || action
    })
  });
}
