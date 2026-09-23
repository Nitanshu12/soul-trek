-- Soul Trek Feedback — database schema
-- Run this once in the Supabase SQL editor for your project.
--
-- Access model: everyone signs in. A volunteer's profile is tied to exactly one
-- bus (profiles.bus_id) and can only read/write that bus's students, sessions,
-- feedback and complaints. An admin (role = 'admin') can read/write everything
-- and manages buses + volunteer logins from /admin.

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
  enrollment_number text,
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
  satisfaction text check (satisfaction in ('satisfactory', 'unsatisfactory')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references buses(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  name text not null,
  photo_url text,
  notes text,
  volunteer_name text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

-- Who's assigned to each bus, for accountability display (in addition to the
-- login itself, in case one bus's login is shared by more than one person).
create table if not exists bus_volunteers (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references buses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- One row per auth user: role + which bus a volunteer is allowed to work on.
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
create index if not exists complaints_bus_id_idx on complaints(bus_id);
create index if not exists complaints_student_id_idx on complaints(student_id);
create index if not exists bus_volunteers_bus_id_idx on bus_volunteers(bus_id);

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
alter table complaints enable row level security;
alter table bus_volunteers enable row level security;
alter table profiles enable row level security;

-- buses: any signed-in user can read the list; only admins manage them.
create policy "buses_select_authenticated" on buses
  for select using (auth.uid() is not null);
create policy "buses_insert_admin" on buses
  for insert with check (is_admin());
create policy "buses_update_admin" on buses
  for update using (is_admin());
create policy "buses_delete_admin" on buses
  for delete using (is_admin());

-- sessions: shared across the whole event; any signed-in volunteer can add one
-- when they actually run a feedback round.
create policy "sessions_select_authenticated" on sessions
  for select using (auth.uid() is not null);
create policy "sessions_insert_authenticated" on sessions
  for insert with check (auth.uid() is not null);

-- students: a volunteer only sees/manages learners on their own assigned bus.
create policy "students_select_own_bus" on students
  for select using (is_admin() or bus_id = my_bus_id());
create policy "students_insert_own_bus" on students
  for insert with check (is_admin() or bus_id = my_bus_id());
create policy "students_update_own_bus" on students
  for update using (is_admin() or bus_id = my_bus_id());

-- feedback_entries: same bus scoping as students.
create policy "entries_select_own_bus" on feedback_entries
  for select using (is_admin() or bus_id = my_bus_id());
create policy "entries_insert_own_bus" on feedback_entries
  for insert with check (is_admin() or bus_id = my_bus_id());
create policy "entries_update_own_bus" on feedback_entries
  for update using (is_admin() or bus_id = my_bus_id());

-- complaints: same bus scoping as students.
create policy "complaints_select_own_bus" on complaints
  for select using (is_admin() or bus_id = my_bus_id());
create policy "complaints_insert_own_bus" on complaints
  for insert with check (is_admin() or bus_id = my_bus_id());
create policy "complaints_update_own_bus" on complaints
  for update using (is_admin() or bus_id = my_bus_id());

-- bus_volunteers: any signed-in user can see the roster; only admin edits it.
create policy "bus_volunteers_select_authenticated" on bus_volunteers
  for select using (auth.uid() is not null);
create policy "bus_volunteers_insert_admin" on bus_volunteers
  for insert with check (is_admin());
create policy "bus_volunteers_delete_admin" on bus_volunteers
  for delete using (is_admin());

-- profiles: a user can see their own profile; admins can see/manage everyone's.
create policy "profiles_select_self_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles_insert_admin" on profiles
  for insert with check (is_admin());
create policy "profiles_update_admin" on profiles
  for update using (is_admin());
create policy "profiles_delete_admin" on profiles
  for delete using (is_admin());

-- ---------- Storage bucket for ID-card photos ----------

insert into storage.buckets (id, name, public)
values ('id-cards', 'id-cards', true)
on conflict (id) do nothing;

create policy "id_cards_read_authenticated" on storage.objects
  for select using (bucket_id = 'id-cards' and auth.uid() is not null);
create policy "id_cards_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'id-cards' and auth.uid() is not null);

-- ---------- Bootstrap: make yourself an admin ----------
-- 1. Supabase dashboard -> Authentication -> Users -> Add user.
--    Use your real email and a password, and tick "Auto Confirm User".
-- 2. Copy that user's UID, then run (replacing the UID):
--
-- insert into profiles (id, username, display_name, role)
-- values ('<paste-user-uid-here>', 'admin', 'Admin', 'admin');
