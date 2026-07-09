import { apiError, apiOk, getSessionId, readJsonBody } from '../../_lib/api.js';
import { verifySession } from '../../_lib/auth.js';
import { isSupabaseConfigured, supabaseRest } from '../../_lib/supabase.js';

// The original Apps Script/Google Sheets version of this tool repaired rows whose
// columns had shifted (a Sheets-only failure mode: loosely typed cells written in the
// wrong column). Postgres has typed, constrained columns, so that class of corruption
// cannot occur here. This endpoint is kept only so the "Servisna popravka naloga" button
// in the admin UI has something to call; it reports zero findings by design.
export async function onRequestPost(context) {
  const env = context.env || {};
  if (!isSupabaseConfigured(env)) {
    return apiError('Supabase environment is not configured.', 503);
  }
  try {
    const body = await readJsonBody(context.request).catch(() => ({}));
    const sessionId = getSessionId(context.request, body);
    const sessionResult = await verifySession(env, sessionId, ['users:create', 'users:update']);
    if (!sessionResult.ok) return apiError(sessionResult.error, sessionResult.status);

    const rows = await supabaseRest(env, "/payment_orders?select=order_id,cashbox_id&or=(cashbox_id.is.null,cashbox_id.eq.FROM_REQUEST)");

    return apiOk({
      found_count: (rows || []).length,
      repaired_count: 0,
      skipped_count: (rows || []).length,
      repaired_orders: [],
      skipped_orders: (rows || []).map((row) => ({
        order_id: row.order_id,
        reason: 'Postgres shema ima tipizovane kolone; ovaj nalog treba ručno pregledati.'
      })),
      errors: []
    });
  } catch (error) {
    return apiError(error.message || 'Popravka naloga nije uspela.', error.status || 500);
  }
}
