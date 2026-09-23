-- Migration: a per-bus volunteer name roster, for accountability only (not login).
-- Run once in the Supabase SQL editor.

create table if not exists bus_volunteers (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references buses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists bus_volunteers_bus_id_idx on bus_volunteers(bus_id);

alter table bus_volunteers enable row level security;

-- Anyone can see who's assigned to a bus; only the admin edits the roster.
create policy "bus_volunteers_select_public" on bus_volunteers
  for select using (true);
create policy "bus_volunteers_insert_admin" on bus_volunteers
  for insert with check (is_admin());
create policy "bus_volunteers_delete_admin" on bus_volunteers
  for delete using (is_admin());
