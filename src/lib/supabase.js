// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS:
// 1. Go to https://supabase.com → New project
// 2. Copy your Project URL and anon/public API key
// 3. Replace the two values below
// 4. Run the SQL in /supabase/schema.sql in your Supabase SQL editor
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// DATA HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const getTodayString = () => new Date().toISOString().split('T')[0];

export async function getOrCreateStandup(date) {
  let { data, error } = await supabase
    .from('standups')
    .select('*')
    .eq('date', date)
    .single();

  if (error && error.code === 'PGRST116') {
    const { data: created } = await supabase
      .from('standups')
      .insert({ date })
      .select()
      .single();
    return created;
  }
  return data;
}

export async function getTasksForStandup(standupId) {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('standup_id', standupId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function addTask(task) {
  const { data } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  return data;
}

export async function updateTask(id, updates) {
  const { data } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return data;
}

export async function deleteTask(id) {
  await supabase.from('tasks').delete().eq('id', id);
}

export async function getPastStandups(limit = 14) {
  const { data } = await supabase
    .from('standups')
    .select('*, tasks(*)')
    .order('date', { ascending: false })
    .limit(limit);
  return data || [];
}

export function subscribeToTasks(standupId, callback) {
  return supabase
    .channel('tasks-live')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `standup_id=eq.${standupId}`
    }, callback)
    .subscribe();
}
