-- Migration: bring back volunteer logins, one per bus, admin unchanged.
-- Run once in the Supabase SQL editor.
--
-- New access model: every route needs a login. A volunteer's profile is tied to
-- exactly one bus (profiles.bus_id) and can only read/write that bus's students,
-- feedback and complaints. An admin (role = 'admin') can read/write everything,
-- same as today.

-- ---------- profiles: allow the volunteer role again ----------

alter table profiles add column if not exists bus_id uuid references buses(id) on delete set null;

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'volunteer'));

-- ---------- helper: the bus_id of the currently logged-in user ----------

create or replace function public.my_bus_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select bus_id from profiles where id = auth.uid();
$$;

-- ---------- RLS: switch from open/public back to logged-in + bus-scoped ----------

drop policy if exists "buses_select_public" on buses;
create policy "buses_select_authenticated" on buses
  for select using (auth.uid() is not null);

drop policy if exists "sessions_select_public" on sessions;
drop policy if exists "sessions_insert_public" on sessions;
create policy "sessions_select_authenticated" on sessions
  for select using (auth.uid() is not null);
create policy "sessions_insert_authenticated" on sessions
  for insert with check (auth.uid() is not null);

drop policy if exists "students_select_public" on students;
drop policy if exists "students_insert_public" on students;
drop policy if exists "students_update_public" on students;
create policy "students_select_own_bus" on students
  for select using (is_admin() or bus_id = my_bus_id());
create policy "students_insert_own_bus" on students
  for insert with check (is_admin() or bus_id = my_bus_id());
create policy "students_update_own_bus" on students
  for update using (is_admin() or bus_id = my_bus_id());

drop policy if exists "entries_select_public" on feedback_entries;
drop policy if exists "entries_insert_public" on feedback_entries;
drop policy if exists "entries_update_public" on feedback_entries;
create policy "entries_select_own_bus" on feedback_entries
  for select using (is_admin() or bus_id = my_bus_id());
create policy "entries_insert_own_bus" on feedback_entries
  for insert with check (is_admin() or bus_id = my_bus_id());
create policy "entries_update_own_bus" on feedback_entries
  for update using (is_admin() or bus_id = my_bus_id());

drop policy if exists "complaints_select_public" on complaints;
drop policy if exists "complaints_insert_public" on complaints;
drop policy if exists "complaints_update_public" on complaints;
create policy "complaints_select_own_bus" on complaints
  for select using (is_admin() or bus_id = my_bus_id());
create policy "complaints_insert_own_bus" on complaints
  for insert with check (is_admin() or bus_id = my_bus_id());
create policy "complaints_update_own_bus" on complaints
  for update using (is_admin() or bus_id = my_bus_id());

drop policy if exists "bus_volunteers_select_public" on bus_volunteers;
create policy "bus_volunteers_select_authenticated" on bus_volunteers
  for select using (auth.uid() is not null);

-- ID-card photos: require login instead of being world-readable/writable.
drop policy if exists "id_cards_read_public" on storage.objects;
drop policy if exists "id_cards_insert_public" on storage.objects;
create policy "id_cards_read_authenticated" on storage.objects
  for select using (bucket_id = 'id-cards' and auth.uid() is not null);
create policy "id_cards_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'id-cards' and auth.uid() is not null);

-- ---------- Next step ----------
-- Create the 8 volunteer logins from the admin dashboard's Volunteers tab
-- (username + password + which bus), once that's deployed. Each one signs in
-- at /login the same way you do, and only ever sees their assigned bus.
