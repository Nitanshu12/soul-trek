-- Migration: support wiping all batch data between Soul Trek batches.
-- Run once in the Supabase SQL editor.
--
-- The actual wipe is done from the admin dashboard (via a service-role API
-- route), not here. This migration only adds the small config row that lets
-- volunteers' phones know a new batch has started so they clear their local
-- cache automatically.

create table if not exists app_config (
  id boolean primary key default true,
  -- Bumped every time the admin starts a new batch. Each phone stores the last
  -- value it saw; when the server's value is higher, the phone wipes its cached
  -- students/sessions/feedback/etc. so old-batch data never lingers offline.
  data_version integer not null default 1,
  -- Guarantees a single row: the primary key can only ever be `true`.
  constraint app_config_singleton check (id)
);

insert into app_config (id, data_version) values (true, 1)
on conflict (id) do nothing;

alter table app_config enable row level security;

-- Any signed-in user can read the version; only the service role (used by the
-- reset route) ever writes it, so no write policy is granted here.
create policy "app_config_select_authenticated" on app_config
  for select using (auth.uid() is not null);
