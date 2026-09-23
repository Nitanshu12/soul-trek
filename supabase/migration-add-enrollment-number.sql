-- Migration: an enrollment number on each learner, captured when they're added.
-- Run once in the Supabase SQL editor.

alter table students
  add column if not exists enrollment_number text;
