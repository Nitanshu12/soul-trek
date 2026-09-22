-- Migration: volunteers no longer sign in.
-- Run this once in the Supabase SQL editor if you already ran the earlier schema.sql.
-- Safe to run on a database that already has feedback data — it only changes access
-- rules and drops the now-unused volunteer columns.

-- 1. Replace the old bus-scoped policies with public ones.
drop policy if exists "buses_select_authenticated" on buses;
drop policy if exists "buses_write_admin" on buses;
drop policy if exists "sessions_select_authenticated" on sessions;
drop policy if exists "sessions_insert_authenticated" on sessions;
drop policy if exists "students_select_own_bus" on students;
drop policy if exists "students_insert_own_bus" on students;
drop policy if exists "students_update_own_bus" on students;
drop policy if exists "entries_select_own_bus" on feedback_entries;
drop policy if exists "entries_insert_own_bus" on feedback_entries;
drop policy if exists "entries_update_own_bus" on feedback_entries;
drop policy if exists "profiles_select_self_or_admin" on profiles;
drop policy if exists "profiles_insert_admin" on profiles;
drop policy if exists "profiles_update_admin" on profiles;
drop policy if exists "profiles_delete_admin" on profiles;

create policy "buses_select_public" on buses for select using (true);
create policy "buses_insert_admin" on buses for insert with check (is_admin());

create policy "sessions_select_public" on sessions for select using (true);
create policy "sessions_insert_public" on sessions for insert with check (true);

create policy "students_select_public" on students for select using (true);
create policy "students_insert_public" on students for insert with check (true);
create policy "students_update_public" on students for update using (true);

create policy "entries_select_public" on feedback_entries for select using (true);
create policy "entries_insert_public" on feedback_entries for insert with check (true);
create policy "entries_update_public" on feedback_entries for update using (true);

create policy "profiles_select_self" on profiles for select using (id = auth.uid());

-- 2. Drop the volunteer-only bits.
delete from profiles where role = 'volunteer';
alter table profiles drop column if exists bus_id;
drop function if exists public.my_bus_id();

-- 3. Only admins live in profiles now.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin'));

-- If you created any volunteer logins earlier, delete those users in
-- Authentication -> Users. Your own admin user stays as-is.
