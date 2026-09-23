-- Soul Trek Feedback — database schema
-- Run this once in the Supabase SQL editor for your project.
--
-- Access model: volunteers do NOT sign in. They open the app, pick their bus, and
-- record feedback. So the anon (public) key can read buses and read/write sessions,
-- students and feedback entries. Only the admin dashboard is behind a login, and
-- only an admin can create or change buses.

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

-- Admin accounts only.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

create index if not exists students_bus_id_idx on students(bus_id);
create index if not exists feedback_entries_bus_id_idx on feedback_entries(bus_id);
create index if not exists feedback_entries_session_id_idx on feedback_entries(session_id);
create index if not exists feedback_entries_student_id_idx on feedback_entries(student_id);
create index if not exists complaints_bus_id_idx on complaints(bus_id);
create index if not exists complaints_student_id_idx on complaints(student_id);

-- ---------- Helper function (security definer avoids recursive RLS on profiles) ----------

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

-- ---------- Row Level Security ----------

alter table buses enable row level security;
alter table sessions enable row level security;
alter table students enable row level security;
alter table feedback_entries enable row level security;
alter table complaints enable row level security;
alter table profiles enable row level security;

-- buses: everyone can read the list (volunteers pick from it); only admins manage them.
create policy "buses_select_public" on buses
  for select using (true);
create policy "buses_insert_admin" on buses
  for insert with check (is_admin());
create policy "buses_update_admin" on buses
  for update using (is_admin());
create policy "buses_delete_admin" on buses
  for delete using (is_admin());

-- sessions: shared across the event, created by whoever runs a feedback round.
create policy "sessions_select_public" on sessions
  for select using (true);
create policy "sessions_insert_public" on sessions
  for insert with check (true);

-- students: volunteers add learners to their bus as they go.
create policy "students_select_public" on students
  for select using (true);
create policy "students_insert_public" on students
  for insert with check (true);
create policy "students_update_public" on students
  for update using (true);

-- feedback_entries: the actual recordings, written from the volunteer's phone.
create policy "entries_select_public" on feedback_entries
  for select using (true);
create policy "entries_insert_public" on feedback_entries
  for insert with check (true);
create policy "entries_update_public" on feedback_entries
  for update using (true);

-- complaints: filed against a bus, optionally linked to a matched student.
create policy "complaints_select_public" on complaints
  for select using (true);
create policy "complaints_insert_public" on complaints
  for insert with check (true);
create policy "complaints_update_public" on complaints
  for update using (true);

-- profiles: an admin can see their own row; nothing is writable from the client.
create policy "profiles_select_self" on profiles
  for select using (id = auth.uid());

-- ---------- Storage bucket for ID-card photos ----------

insert into storage.buckets (id, name, public)
values ('id-cards', 'id-cards', true)
on conflict (id) do nothing;

create policy "id_cards_read_public" on storage.objects
  for select using (bucket_id = 'id-cards');
create policy "id_cards_insert_public" on storage.objects
  for insert with check (bucket_id = 'id-cards');

-- ---------- Bootstrap: make yourself an admin ----------
-- 1. Supabase dashboard -> Authentication -> Users -> Add user.
--    Use your real email and a password, and tick "Auto Confirm User".
-- 2. Copy that user's UID, then run (replacing the UID):
--
-- insert into profiles (id, display_name, role)
-- values ('<paste-user-uid-here>', 'Admin', 'admin');
