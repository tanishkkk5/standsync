import { createClient } from '@supabase/supabase-js';

const SUPA_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPA_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Validate URL format before passing to createClient
function isValidUrl(url) {
  try { new URL(url); return true; } catch { return false; }
}

const canInit = SUPA_URL && SUPA_KEY && isValidUrl(SUPA_URL);

let supabaseClient = null;
if (canInit) {
  try {
    supabaseClient = createClient(SUPA_URL, SUPA_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ss-auth',
      }
    });
  } catch(e) {
    console.error('Supabase init failed:', e.message);
  }
}

export const supabase = supabaseClient;
export const IS_LIVE = !!supabase;


// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signUp(email, password, meta) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signUp({ email, password, options: { data: meta } });
}
export async function signIn(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signInWithGoogle() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const redirectTo = window.location.origin;
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'email profile',
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
}
export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}
export async function resetPassword(email) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password',
  });
}
export async function updatePassword(password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.updateUser({ password });
}
export async function updateProfile(data) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.updateUser({ data });
}
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genRoomId(teamName) {
  const prefix = (teamName || 'TEAM').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5).padEnd(3, 'X');
  const ts = Date.now().toString(36).slice(-2).toUpperCase();
  let rnd = '';
  for (let i = 0; i < 2; i++) rnd += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  return prefix + '-' + ts + rnd;
}

function genRoomPass() {
  let p1 = '', p2 = '';
  for (let i = 0; i < 3; i++) p1 += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  for (let i = 0; i < 3; i++) p2 += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  return p1 + '-' + p2;
}
const COLORS = ['#818CF8','#38BDF8','#34D399','#F472B6','#FB923C','#E879F9','#F59E0B','#06B6D4','#8B5CF6','#EC4899'];

// ── Teams ─────────────────────────────────────────────────────────────────────
export async function createTeam(name, ownerId, ownerEmail, ownerName, standupName) {
  const { data: team, error } = await supabase
    .from('teams')
    .insert({ name, owner_id: ownerId, standup_name: standupName || name })
    .select().single();
  if (error) {
    console.error('createTeam DB error:', error.code, error.message, error.details, error.hint);
    return { __error: error.message || 'Database error' };
  }
  if (!team) return { __error: 'No data returned from teams insert' };

  const { error: memberErr } = await supabase.from('team_members').upsert({
    team_id: team.id, user_id: ownerId, email: ownerEmail,
    name: ownerName, role: 'manager', designation: 'Team Manager',
    status: 'active', color: '#818CF8',
  }, { onConflict: 'team_id,user_id' });
  if (memberErr) {
    console.error('team_members upsert error:', memberErr.message, memberErr.code, memberErr.hint);
  }

  const room_id = genRoomId(name);
  const room_password = genRoomPass();
  const { data: room } = await supabase.from('rooms').insert({
    team_id: team.id,
    name: standupName || (name + ' - Main Room'),
    room_id,
    room_password,
    created_by: ownerId,
  }).select().single();

  return { ...team, default_room_id: room_id, default_room_password: room_password, default_room_db_id: room?.id };
}

export async function getMyTeams(userId) {
  const { data, error } = await supabase
    .from('team_members')
    .select('team_id, role, designation, teams(*)')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (error) {
    console.error('getMyTeams error:', error.message, error.code, error.hint);
    return [];
  }
  return (data || []).filter(row => row.teams && row.teams.id);
}

export async function getTeamMembers(teamId) {
  const { data } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'active')
    .order('created_at');
  return data || [];
}

export async function updateMemberDesignation(teamMemberId, designation, role) {
  const updates = {};
  if (designation !== undefined) updates.designation = designation;
  if (role !== undefined) updates.role = role;
  const { data } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', teamMemberId)
    .select().single();
  return data;
}

export async function removeMember(teamMemberId) {
  return supabase.from('team_members').update({ status: 'left' }).eq('id', teamMemberId);
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
export async function deleteTeam(teamId) {
  if (!supabase || !teamId) return;
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) console.error('deleteTeam error:', error.message);
  return !error;
}

export async function getTeamRooms(teamId) {
  const { data } = await supabase.from('rooms').select('*').eq('team_id', teamId).order('created_at');
  return data || [];
}

export async function createRoom(teamId, roomName, createdBy) {
  const room_id = genRoomId(roomName);
  const room_password = genRoomPass();
  const { data } = await supabase.from('rooms').insert({
    team_id: teamId, name: roomName, room_id, room_password, created_by: createdBy,
  }).select().single();
  return data;
}

export async function deleteRoom(roomDbId) {
  return supabase.from('rooms').delete().eq('id', roomDbId);
}

export async function joinTeamByCode(roomId, password, userId, email, name) {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*, teams(*)')
    .eq('room_id', roomId.toUpperCase().trim())
    .eq('room_password', password.trim().toUpperCase())
    .single();

  if (error || !room) return { error: 'Invalid Room ID or password. Check with your manager.' };
  const team = room.teams;
  if (!team) return { error: 'Team not found.' };

  const { data: existing } = await supabase
    .from('team_members')
    .select('id, status')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .single();

  if (existing) {
    if (existing.status === 'left') {
      await supabase.from('team_members').update({ status: 'active' }).eq('id', existing.id);
    }
    return { team, alreadyMember: true };
  }

  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  await supabase.from('team_members').insert({
    team_id: team.id, user_id: userId, email, name,
    role: 'member', designation: 'Team Member', status: 'active', color,
  });
  return { team };
}

// ── Invites ───────────────────────────────────────────────────────────────────
export async function inviteMember(teamId, teamName, email, inviterName) {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const { data } = await supabase.from('invites').insert({
    team_id: teamId, email, token, invited_by: inviterName,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }).select().single();
  return { invite: data, token, link: window.location.origin + '?invite=' + token };
}

export async function getInvite(token) {
  const { data } = await supabase.from('invites').select('*, teams(name)').eq('token', token).single();
  return data;
}

export async function acceptInvite(token, userId, email, name) {
  const invite = await getInvite(token);
  if (!invite) return { error: 'Invalid invite' };
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  await supabase.from('team_members').upsert({
    team_id: invite.team_id, user_id: userId, email, name,
    role: 'member', designation: 'Team Member', status: 'active', color,
  });
  await supabase.from('invites').update({ accepted_at: new Date().toISOString() }).eq('token', token);
  return { teamId: invite.team_id, teamName: invite.teams?.name };
}

// ── Standups & Tasks ──────────────────────────────────────────────────────────
export async function getOrCreateStandup(teamId, date) {
  if (!teamId) return null;
  const { data: existing } = await supabase
    .from('standups')
    .select('*')
    .eq('team_id', teamId)
    .eq('date', date)
    .maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await supabase
    .from('standups')
    .insert({ team_id: teamId, date })
    .select()
    .single();
  if (error) {
    console.error('getOrCreateStandup error:', error.message);
    const { data: retry } = await supabase
      .from('standups')
      .select('*')
      .eq('team_id', teamId)
      .eq('date', date)
      .maybeSingle();
    return retry;
  }
  return created;
}

export async function getTasks(standupId) {
  if (!standupId) return [];
  const { data } = await supabase.from('tasks').select('*').eq('standup_id', standupId).order('created_at');
  return data || [];
}

export async function addTask(task) {
  const { data } = await supabase.from('tasks').insert(task).select().single();
  return data;
}

export async function updateTask(id, updates) {
  const { data } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
  return data;
}

export async function getPastStandups(teamId, limit = 30) {
  const { data } = await supabase
    .from('standups')
    .select('*, tasks(*)')
    .eq('team_id', teamId)
    .order('date', { ascending: false })
    .limit(limit);
  return data || [];
}

export function subscribeToTasks(standupId, cb) {
  if (!supabase) return () => {};
  const ch = supabase.channel('tasks-' + standupId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: 'standup_id=eq.' + standupId }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// ── Storage ───────────────────────────────────────────────────────────────────
export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop();
  const path = userId + '.' + ext;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

// ── Ensure manager is in team_members ───────────────────────────────────────────
export async function ensureManagerMember(teamId, userId, email, name) {
  const { data: existing } = await supabase
    .from('team_members')
    .select('id,status,role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    if (existing.status !== 'active') {
      await supabase.from('team_members').update({ status:'active' }).eq('id', existing.id);
    }
    return existing;
  }

  const { data } = await supabase.from('team_members').insert({
    team_id: teamId,
    user_id: userId,
    email: email,
    name: name || email.split('@')[0],
    role: 'manager',
    designation: 'Team Manager',
    status: 'active',
    color: '#818CF8',
  }).select().single();
  return data;
}

// ── Chat messages (persistent + realtime) ─────────────────────────────────────
export async function getChatMessages(teamId, limit = 50) {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return data || [];
}

export async function sendChatMessage(teamId, msg) {
  const { data } = await supabase
    .from('messages')
    .insert({
      team_id: teamId,
      sender_email: msg.sender_email,
      sender_name: msg.sender_name,
      text: msg.text || '',
      type: msg.type || 'text',
      url: msg.url || null,
      filename: msg.filename || null,
      filesize: msg.filesize || null,
      space: msg.dm_to ? 'dm' : (msg.space || 'general'),
      dm_to: msg.dm_to || null,
      reply_to: msg.reply_to ? JSON.stringify(msg.reply_to) : null,
    })
    .select().single();
  return data;
}

export function subscribeToMessages(teamId, cb) {
  if (!supabase) return () => {};
  const ch = supabase.channel('chat-' + teamId, {
    config: { broadcast: { self: false } }
  })
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      if (payload) cb(payload);
    })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: 'team_id=eq.' + teamId
    }, payload => cb(payload.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

export async function broadcastMessage(teamId, msg) {
  if (!supabase) return;
  await supabase.channel('chat-' + teamId).send({
    type: 'broadcast',
    event: 'new_message',
    payload: msg,
  });
}

// ── Invite link retrieval ─────────────────────────────────────────────────────
export async function getTeamInvites(teamId) {
  const { data } = await supabase
    .from('invites')
    .select('*')
    .eq('team_id', teamId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });
  return data || [];
}


// ============================================================================
// SHARED & HISTORICAL STORE (team_store / team_events)
// Added for shared team board, reports, activity history, etc.
// Self-contained: relies only on the `supabase` client above.
// ============================================================================
function _live() {
  try { return !!supabase && !!supabase.from; } catch { return false; }
}

export async function getShared(teamId, storeKey) {
  if (!_live() || !teamId) return null;
  try {
    const { data, error } = await supabase
      .from('team_store').select('value')
      .eq('team_id', String(teamId)).eq('store_key', storeKey).maybeSingle();
    if (error) return null;
    return data ? data.value : null;
  } catch { return null; }
}

export async function setShared(teamId, storeKey, value) {
  if (!_live() || !teamId) return false;
  try {
    let uid = null;
    try { const { data } = await supabase.auth.getUser(); uid = data?.user?.id || null; } catch {}
    const { error } = await supabase.from('team_store').upsert(
      { team_id: String(teamId), store_key: storeKey, value, updated_by: uid, updated_at: new Date().toISOString() },
      { onConflict: 'team_id,store_key' });
    return !error;
  } catch { return false; }
}

export async function getSharedByPrefix(teamId, prefix) {
  if (!_live() || !teamId) return {};
  try {
    const { data, error } = await supabase
      .from('team_store').select('store_key, value')
      .eq('team_id', String(teamId)).like('store_key', (prefix || '') + '%');
    if (error || !data) return {};
    const out = {}; data.forEach(r => { out[r.store_key] = r.value; }); return out;
  } catch { return {}; }
}

export function subscribeToStore(teamId, cb) {
  if (!_live() || !teamId) return () => {};
  try {
    const channel = supabase.channel('team_store_' + teamId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'team_store', filter: 'team_id=eq.' + teamId },
        (payload) => { const row = payload.new || payload.old; if (row) { try { cb(row.store_key, row.value); } catch {} } })
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  } catch { return () => {}; }
}

export async function logEvent(teamId, ev) {
  if (!_live() || !teamId) return false;
  try {
    const { error } = await supabase.from('team_events').insert({
      team_id: String(teamId), type: ev.type,
      actor: ev.actor || null, actor_email: ev.actorEmail || null,
      target: ev.target || null, target_email: ev.targetEmail || null,
      title: ev.title || null, payload: ev.payload || {},
    });
    return !error;
  } catch { return false; }
}

export async function getEvents(teamId, limit = 80) {
  if (!_live() || !teamId) return [];
  try {
    const { data, error } = await supabase
      .from('team_events').select('*')
      .eq('team_id', String(teamId)).order('created_at', { ascending: false }).limit(limit);
    if (error || !data) return [];
    return data.map(r => ({
      id: 'ev_' + r.id, at: new Date(r.created_at).getTime(), type: r.type,
      actor: r.actor, actorEmail: r.actor_email, target: r.target, targetEmail: r.target_email,
      title: r.title, ...(r.payload || {}),
    }));
  } catch { return []; }
}

export function subscribeToEvents(teamId, cb) {
  if (!_live() || !teamId) return () => {};
  try {
    const channel = supabase.channel('team_events_' + teamId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_events', filter: 'team_id=eq.' + teamId },
        (payload) => { const r = payload.new; if (!r) return;
          try { cb({ id: 'ev_' + r.id, at: new Date(r.created_at).getTime(), type: r.type, actor: r.actor, actorEmail: r.actor_email, target: r.target, targetEmail: r.target_email, title: r.title, ...(r.payload || {}) }); } catch {} })
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  } catch { return () => {}; }
}
