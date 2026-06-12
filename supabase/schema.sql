-- ─────────────────────────────────────────────────────────────────────────────
-- StandSync · Supabase Schema
-- Run this entire file in your Supabase SQL editor (Database → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- STANDUPS: one row per day
create table if not exists standups (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  notes text,
  created_at timestamptz default now()
);

-- TASKS: each task submitted during a standup
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  standup_id uuid references standups(id) on delete cascade,
  title text not null,
  assignee_email text not null,
  assignee_name text not null,
  priority text check (priority in ('critical','high','medium','low')) default 'medium',
  status text check (status in ('todo','in-progress','done','blocked')) default 'todo',
  timeline text,                        -- e.g. "Today 5pm" or "Tomorrow noon"
  timeline_date timestamptz,            -- parsed deadline
  notes text,
  manager_note text,                    -- Tanisk can add context
  submitted_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table standups enable row level security;
alter table tasks enable row level security;

-- Allow all reads (team is internal, no public exposure needed)
create policy "Allow all reads on standups"
  on standups for select using (true);

create policy "Allow all reads on tasks"
  on tasks for select using (true);

-- Allow all inserts (authenticated or anon — lock down later with auth)
create policy "Allow all inserts on standups"
  on standups for insert with check (true);

create policy "Allow all inserts on tasks"
  on tasks for insert with check (true);

-- Allow all updates
create policy "Allow all updates on tasks"
  on tasks for update using (true);

create policy "Allow all deletes on tasks"
  on tasks for delete using (true);

-- Real-time: enable replication on tasks table
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table standups;
