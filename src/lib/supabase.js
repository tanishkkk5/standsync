// ============================================================================
// ADD THESE TO YOUR lib/supabase.js
// ----------------------------------------------------------------------------
// Shared, historical key/value store + activity events, backed by the
// team_store / team_events tables (see standsync_shared_store.sql).
//
// These mirror localStorage's getItem/setItem so the app can swap in shared
// storage with almost no behavioural change. All functions degrade gracefully:
// if Supabase isn't configured (IS_LIVE false) or a call fails, they return
// null/empty so the caller can fall back to localStorage.
//
// Assumes this file already exports `supabase` (the client) and `IS_LIVE`.
// ============================================================================

// ── Shared key/value (current state) ─────────────────────────────────────────

// Read one shared value. Returns the parsed JSON value, or null if missing/error.
export async function getShared(teamId, storeKey) {
  if (!IS_LIVE || !teamId) return null;
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

// Write (upsert) one shared value. Returns true on success.
export async function setShared(teamId, storeKey, value) {
  if (!IS_LIVE || !teamId) return false;
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

// Read many shared values at once by key prefix (e.g. all 'attendance-' days).
// Returns an object: { storeKey: value, ... }
export async function getSharedByPrefix(teamId, prefix) {
  if (!IS_LIVE || !teamId) return {};
  try {
    const { data, error } = await supabase
      .from('team_store')
      .select('store_key, value')
      .eq('team_id', String(teamId))
      .like('store_key', prefix + '%');
    if (error || !data) return {};
    const out = {};
    data.forEach(r => { out[r.store_key] = r.value; });
    return out;
  } catch { return {}; }
}

// Subscribe to live changes for a team's store. cb(storeKey, value) on each change.
// Returns an unsubscribe function.
export function subscribeToStore(teamId, cb) {
  if (!IS_LIVE || !teamId) return () => {};
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
}

// ── Activity events (append-only history) ─────────────────────────────────────

// Append an event. Fire-and-forget; returns true on success.
export async function logEvent(teamId, ev) {
  if (!IS_LIVE || !teamId) return false;
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

// Read recent events (most recent first). Default last 80.
export async function getEvents(teamId, limit = 80) {
  if (!IS_LIVE || !teamId) return [];
  try {
    const { data, error } = await supabase
      .from('team_events')
      .select('*')
      .eq('team_id', String(teamId))
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    // normalize to the shape App.jsx expects from readEvents()
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

// Subscribe to new events live. cb(event) per new row. Returns unsubscribe fn.
export function subscribeToEvents(teamId, cb) {
  if (!IS_LIVE || !teamId) return () => {};
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
}
