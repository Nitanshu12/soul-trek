-- Migration: fix admins not being able to see the volunteer login list.
-- Run once in the Supabase SQL editor.
--
-- The previous migration (migration-reintroduce-volunteer-logins.sql) added
-- the volunteer role and bus scoping everywhere, but never touched the
-- profiles table's own SELECT policy. It was still "profiles_select_self"
-- (id = auth.uid()), which only ever let a user see their own row — so the
-- admin dashboard's Volunteers tab always queried an empty list, even though
-- the volunteer logins existed fine in the database.

drop policy if exists "profiles_select_self" on profiles;
drop policy if exists "profiles_select_self_or_admin" on profiles;
create policy "profiles_select_self_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());
