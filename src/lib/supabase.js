// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const URL  = process.env.REACT_APP_SUPABASE_URL  || '';
const KEY  = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
export const supabase = (URL && KEY) ? createClient(URL, KEY) : null;
export const IS_LIVE  = !!supabase;

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signUp(email, password, meta) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signUp({ email, password, options: { data: meta } });
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

export async function resetPassword(email) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
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

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(cb);
  return () => data.subscription.unsubscribe();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Teams ─────────────────────────────────────────────────────────────────────
export async function createTeam(name, ownerId, ownerEmail, ownerName) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2,6);
  const { data: team } = await supabase.from('teams').insert({ name, slug, owner_id: ownerId }).select().single();
  if (team) {
    await supabase.from('team_members').insert({ team_id: team.id, user_id: ownerId, email: ownerEmail, name: ownerName, role: 'manager', status: 'active' });
  }
  return team;
}

export async function getMyTeams(userId) {
  const { data } = await supabase.from('team_members').select('team_id, role, teams(*)').eq('user_id', userId).eq('status', 'active');
  return data || [];
}

export async function getTeamMembers(teamId) {
  const { data } = await supabase.from('team_members').select('*').eq('team_id', teamId).eq('status', 'active');
  return data || [];
}

// ── Invites ───────────────────────────────────────────────────────────────────
export async function inviteMember(teamId, teamName, email, inviterName) {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const { data } = await supabase.from('invites').insert({
    team_id: teamId, email, token, invited_by: inviterName, expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString()
  }).select().single();
  return { invite: data, token, link: `${window.location.origin}?invite=${token}` };
}

export async function getInvite(token) {
  const { data } = await supabase.from('invites').select('*, teams(name)').eq('token', token).single();
  return data;
}

export async function acceptInvite(token, userId, email, name) {
  const invite = await getInvite(token);
  if (!invite) return { error: 'Invalid invite' };
  await supabase.from('team_members').upsert({ team_id: invite.team_id, user_id: userId, email, name, role: 'member', status: 'active' });
  await supabase.from('invites').update({ accepted_at: new Date().toISOString() }).eq('token', token);
  return { teamId: invite.team_id, teamName: invite.teams?.name };
}

// ── Standups & Tasks ──────────────────────────────────────────────────────────
export async function getOrCreateStandup(teamId, date) {
  let { data, error } = await supabase.from('standups').select('*').eq('team_id', teamId).eq('date', date).single();
  if (error?.code === 'PGRST116') {
    const { data: c } = await supabase.from('standups').insert({ team_id: teamId, date }).select().single();
    return c;
  }
  return data;
}

export async function getTasks(standupId) {
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
  const { data } = await supabase.from('standups').select('*, tasks(*)').eq('team_id', teamId).order('date', { ascending: false }).limit(limit);
  return data || [];
}

export function subscribeToTasks(standupId, cb) {
  if (!supabase) return () => {};
  const ch = supabase.channel('tasks-' + standupId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `standup_id=eq.${standupId}` }, cb)
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// ── Storage (avatars) ─────────────────────────────────────────────────────────
export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `${userId}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

// ── Team join via Room ID + password ─────────────────────────────────────────
export async function createTeamWithCode(name, ownerId, ownerEmail, ownerName, standupName) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2,6);
  // Room ID: 6 uppercase letters easy to share
  const room_id = Math.random().toString(36).slice(2,8).toUpperCase();
  // Room password: 4 digit PIN
  const room_password = String(Math.floor(1000 + Math.random() * 9000));
  const { data: team } = await supabase.from('teams')
    .insert({ name, slug, owner_id: ownerId, standup_name: standupName||name, room_id, room_password })
    .select().single();
  if (team) {
    await supabase.from('team_members').insert({
      team_id: team.id, user_id: ownerId, email: ownerEmail,
      name: ownerName, role: 'manager', status: 'active'
    });
  }
  return team;
}

export async function joinTeamByCode(roomId, password, userId, email, name) {
  const { data: team, error } = await supabase.from('teams')
    .select('*')
    .eq('room_id', roomId.toUpperCase().trim())
    .eq('room_password', password.trim())
    .single();
  if (error || !team) return { error: 'Invalid Room ID or password. Please check and try again.' };
  // Check if already a member
  const { data: existing } = await supabase.from('team_members')
    .select('id').eq('team_id', team.id).eq('user_id', userId).single();
  if (existing) return { team, alreadyMember: true };
  await supabase.from('team_members').insert({
    team_id: team.id, user_id: userId, email, name, role: 'member', status: 'active'
  });
  return { team };
}

export async function getTeamCode(teamId) {
  const { data } = await supabase.from('teams').select('room_id,room_password').eq('id', teamId).single();
  return data;
}
