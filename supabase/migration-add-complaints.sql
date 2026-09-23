-- Migration: complaints (per-bus, ID-card photo + notes) and a satisfaction tag
-- on feedback. Run once in the Supabase SQL editor.

-- ---------- Satisfaction tag on feedback ----------

alter table feedback_entries
  add column if not exists satisfaction text
  check (satisfaction in ('satisfactory', 'unsatisfactory'));

-- ---------- Complaints table ----------

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

create index if not exists complaints_bus_id_idx on complaints(bus_id);
create index if not exists complaints_student_id_idx on complaints(student_id);

alter table complaints enable row level security;

-- Same open access model as the rest of the app (no volunteer login).
create policy "complaints_select_public" on complaints for select using (true);
create policy "complaints_insert_public" on complaints for insert with check (true);
create policy "complaints_update_public" on complaints for update using (true);

-- ---------- Storage bucket for ID-card photos ----------

insert into storage.buckets (id, name, public)
values ('id-cards', 'id-cards', true)
on conflict (id) do nothing;

create policy "id_cards_read_public" on storage.objects
  for select using (bucket_id = 'id-cards');
create policy "id_cards_insert_public" on storage.objects
  for insert with check (bucket_id = 'id-cards');
