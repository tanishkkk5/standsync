// ============================================================================
// ADD THESE TO YOUR lib/supabase.js  (paste at the BOTTOM of the file)
// ----------------------------------------------------------------------------
// Shared, historical key/value store + activity events, backed by the
// team_store / team_events tables (see standsync_shared_store.sql).
//
// IMPORTANT: This block is SELF-CONTAINED. It does NOT require your file to
// export `IS_LIVE`. It only needs the `supabase` client to already exist in
// this module's scope (which it does in your lib/supabase.js). If the client
// is missing or a call fails, every function degrades to null/empty so the app
// falls back to localStorage and never crashes.
// ============================================================================

// Liveness check derived from the client itself — no IS_LIVE export needed.
function _live() {
  try { return typeof supabase !== 'undefined' && !!supabase && !!supabase.from; }
  catch { return false; }
}

// ── Shared key/value (current state) ─────────────────────────────────────────

export async function getShared(teamId, storeKey) {
  if (!_live() || !teamId) return null;
  try {
    const { data, error } = await supabase
      .from('team_store')
      .select('value')
      .eq('team_id', String(teamId))
      .eq('store_key', storeKey)
      .maybeSingle();
    if (error) return null;
    return data ? data.value : null;
  } catch { return null; }
}

export async function setShared(teamId, storeKey, value) {
  if (!_live() || !teamId) return false;
  try {
    let uid = null;
    try { const { data } = await supabase.auth.getUser(); uid = data?.user?.id || null; } catch {}
    const { error } = await supabase
      .from('team_store')
      .upsert(
        { team_id: String(teamId), store_key: storeKey, value, updated_by: uid, updated_at: new Date().toISOString() },
        { onConflict: 'team_id,store_key' }
      );
    return !error;
  } catch { return false; }
}

export async function getSharedByPrefix(teamId, prefix) {
  if (!_live() || !teamId) return {};
  try {
    const { data, error } = await supabase
      .from('team_store')
      .select('store_key, value')
      .eq('team_id', String(teamId))
      .like('store_key', (prefix || '') + '%');
    if (error || !data) return {};
    const out = {};
    data.forEach(r => { out[r.store_key] = r.value; });
    return out;
  } catch { return {}; }
}

export function subscribeToStore(teamId, cb) {
  if (!_live() || !teamId) return () => {};
  try {
    const channel = supabase
      .channel('team_store_' + teamId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'team_store', filter: 'team_id=eq.' + teamId },
        (payload) => {
          const row = payload.new || payload.old;
          if (row) { try { cb(row.store_key, row.value); } catch {} }
        })
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  } catch { return () => {}; }
}

// ── Activity events (append-only history) ─────────────────────────────────────

export async function logEvent(teamId, ev) {
  if (!_live() || !teamId) return false;
  try {
    const { error } = await supabase.from('team_events').insert({
      team_id: String(teamId),
      type: ev.type,
      actor: ev.actor || null,
      actor_email: ev.actorEmail || null,
      target: ev.target || null,
      target_email: ev.targetEmail || null,
      title: ev.title || null,
      payload: ev.payload || {},
    });
    return !error;
  } catch { return false; }
}

export async function getEvents(teamId, limit = 80) {
  if (!_live() || !teamId) return [];
  try {
    const { data, error } = await supabase
      .from('team_events')
      .select('*')
      .eq('team_id', String(teamId))
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(r => ({
      id: 'ev_' + r.id,
      at: new Date(r.created_at).getTime(),
      type: r.type,
      actor: r.actor,
      actorEmail: r.actor_email,
      target: r.target,
      targetEmail: r.target_email,
      title: r.title,
      ...(r.payload || {}),
    }));
  } catch { return []; }
}

export function subscribeToEvents(teamId, cb) {
  if (!_live() || !teamId) return () => {};
  try {
    const channel = supabase
      .channel('team_events_' + teamId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_events', filter: 'team_id=eq.' + teamId },
        (payload) => {
          const r = payload.new; if (!r) return;
          try { cb({ id: 'ev_' + r.id, at: new Date(r.created_at).getTime(), type: r.type, actor: r.actor, actorEmail: r.actor_email, target: r.target, targetEmail: r.target_email, title: r.title, ...(r.payload || {}) }); } catch {}
        })
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  } catch { return () => {}; }
}
