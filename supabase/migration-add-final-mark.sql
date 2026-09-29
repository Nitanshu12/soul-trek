-- Migration: a one-time final satisfactory/unsatisfactory verdict per student,
-- distinct from the per-session satisfaction tag on feedback_entries. Meant to
-- be set once, at the end of the event, by whoever ran that student's bus.
-- Run once in the Supabase SQL editor.

alter table students
  add column if not exists final_mark text
  check (final_mark in ('satisfactory', 'unsatisfactory'));
