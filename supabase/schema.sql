-- Soul Trek Feedback — database schema
-- Run this once in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table if not exists buses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references buses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists feedback_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  bus_id uuid not null references buses(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  volunteer_name text,
  transcript text,
  ai_summary text,
  marks integer check (marks between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);

-- One row per auth user: role + which bus they're allowed to work on.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  role text not null check (role in ('admin', 'volunteer')),
  bus_id uuid references buses(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists students_bus_id_idx on students(bus_id);
create index if not exists feedback_entries_bus_id_idx on feedback_entries(bus_id);
create index if not exists feedback_entries_session_id_idx on feedback_entries(session_id);
create index if not exists feedback_entries_student_id_idx on feedback_entries(student_id);

-- ---------- Helper functions (security definer avoids recursive RLS on profiles) ----------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_bus_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select bus_id from profiles where id = auth.uid();
$$;

-- ---------- Row Level Security ----------

alter table buses enable row level security;
alter table sessions enable row level security;
alter table students enable row level security;
alter table feedback_entries enable row level security;
alter table profiles enable row level security;

-- buses: any signed-in user can see the list of buses (just names); only admins manage them.
create policy "buses_select_authenticated" on buses
  for select using (auth.uid() is not null);
create policy "buses_write_admin" on buses
  for insert with check (is_admin());
create policy "buses_update_admin" on buses
  for update using (is_admin());
create policy "buses_delete_admin" on buses
  for delete using (is_admin());

-- sessions: shared across the whole event; any signed-in volunteer can add one when they
-- actually run a feedback round (it's not mandatory to have one for every day).
create policy "sessions_select_authenticated" on sessions
  for select using (auth.uid() is not null);
create policy "sessions_insert_authenticated" on sessions
  for insert with check (auth.uid() is not null);

-- students: volunteers only see/manage learners on their own assigned bus. Admins see all.
create policy "students_select_own_bus" on students
  for select using (is_admin() or bus_id = my_bus_id());
create policy "students_insert_own_bus" on students
  for insert with check (is_admin() or bus_id = my_bus_id());
create policy "students_update_own_bus" on students
  for update using (is_admin() or bus_id = my_bus_id());

-- feedback_entries: same scoping as students.
create policy "entries_select_own_bus" on feedback_entries
  for select using (is_admin() or bus_id = my_bus_id());
create policy "entries_insert_own_bus" on feedback_entries
  for insert with check (is_admin() or bus_id = my_bus_id());
create policy "entries_update_own_bus" on feedback_entries
  for update using (is_admin() or bus_id = my_bus_id());

-- profiles: a user can see their own profile; admins can see/manage everyone's.
create policy "profiles_select_self_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles_insert_admin" on profiles
  for insert with check (is_admin());
create policy "profiles_update_admin" on profiles
  for update using (is_admin());
create policy "profiles_delete_admin" on profiles
  for delete using (is_admin());

-- ---------- Bootstrap: make yourself an admin ----------
-- 1. In the Supabase dashboard: Authentication -> Users -> Add user.
--    Use your real email (e.g. aks@greengenome.in) and a password. Confirm the email.
-- 2. Copy that user's UID, then run (replacing the values):
--
-- insert into profiles (id, username, display_name, role)
-- values ('<paste-user-uid-here>', 'admin', 'Admin', 'admin');
