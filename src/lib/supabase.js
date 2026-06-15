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
  // redirectTo must EXACTLY match what you set in:
  // 1. Supabase → Auth → URL Configuration → Site URL
  // 2. Google Cloud Console → OAuth → Authorized redirect URIs
  //    (add: https://YOUR_PROJECT.supabase.co/auth/v1/callback)
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

// Room ID: team name prefix + random suffix e.g. DATAC-K3M
function genRoomId(teamName) {
  const prefix = (teamName || 'TEAM').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5).padEnd(3, 'X');
  // Use timestamp base36 + random for guaranteed uniqueness
  const ts = Date.now().toString(36).slice(-2).toUpperCase();
  let rnd = '';
  for (let i = 0; i < 2; i++) rnd += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  return prefix + '-' + ts + rnd;
}

// Password: XXX-XXX format (6 alphanumeric split by dash) — memorable and unique
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

  // Add owner as manager - use upsert to handle any duplicates
  const { error: memberErr } = await supabase.from('team_members').upsert({
    team_id: team.id, user_id: ownerId, email: ownerEmail,
    name: ownerName, role: 'manager', designation: 'Team Manager',
    status: 'active', color: '#818CF8',
  }, { onConflict: 'team_id,user_id' });
  if (memberErr) {
    console.error('team_members upsert error:', memberErr.message, memberErr.code, memberErr.hint);
  }

  // Create default room with unique ID
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
  // Filter out entries where teams relation failed to load
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
  // Cascade delete handles rooms, team_members, invites, standups
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

// Join team via Room ID + password — room_id/password are permanent
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

  // Already a member?
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
  // Try to find existing standup for this team+date
  const { data: existing } = await supabase
    .from('standups')
    .select('*')
    .eq('team_id', teamId)
    .eq('date', date)
    .maybeSingle();
  if (existing) return existing;
  // Create new standup
  const { data: created, error } = await supabase
    .from('standups')
    .insert({ team_id: teamId, date })
    .select()
    .single();
  if (error) {
    console.error('getOrCreateStandup error:', error.message);
    // If conflict (race condition), fetch again
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
  // Check if member exists
  const { data: existing } = await supabase
    .from('team_members')
    .select('id,status,role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Update status to active if needed
    if (existing.status !== 'active') {
      await supabase.from('team_members').update({ status:'active' }).eq('id', existing.id);
    }
    return existing;
  }

  // Insert as manager
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
    })
    .select().single();
  return data;
}

export function subscribeToMessages(teamId, cb) {
  if (!supabase) return () => {};
  // Use BOTH broadcast (instant) and postgres_changes (reliable fallback)
  const ch = supabase.channel('chat-' + teamId, {
    config: { broadcast: { self: false } } // don't echo back to sender
  })
    // Broadcast channel for instant delivery between online users
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      if (payload) cb(payload);
    })
    // postgres_changes as fallback for users who were offline
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: 'team_id=eq.' + teamId
    }, payload => cb(payload.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

export async function broadcastMessage(teamId, msg) {
  if (!supabase) return;
  // Broadcast instantly to all online members
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
