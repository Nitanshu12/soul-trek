-- Migration: a final_data view — one row per student, combining everything
-- into the columns needed for the end-of-event CSV export: name, enrollment
-- number, which sessions they have feedback for, all transcripts, all AI
-- summaries, whether a complaint was filed (and what it said), and the final
-- satisfactory/unsatisfactory mark.
-- Run once in the Supabase SQL editor.

create or replace view public.final_data
-- security_invoker makes the view respect the querying user's own RLS
-- permissions instead of the view owner's (which would otherwise bypass RLS
-- entirely, since Supabase's postgres role has BYPASSRLS). Without this, a
-- volunteer querying final_data could see every bus instead of just their own.
with (security_invoker = true)
as
select
  s.id as student_id,
  s.bus_id,
  b.name as bus_name,
  s.name as student_name,
  s.enrollment_number,
  coalesce(
    (select string_agg(distinct sess.label, ', ' order by sess.label)
       from feedback_entries fe
       join sessions sess on sess.id = fe.session_id
      where fe.student_id = s.id),
    ''
  ) as sessions,
  coalesce(
    (select string_agg(
              sess.label || ': ' || coalesce(nullif(fe.transcript, ''), '(no transcript)'),
              e'\n\n' order by sess.date, sess.label
            )
       from feedback_entries fe
       join sessions sess on sess.id = fe.session_id
      where fe.student_id = s.id),
    ''
  ) as transcription,
  coalesce(
    (select string_agg(
              sess.label || ': ' || coalesce(nullif(fe.ai_summary, ''), '(no summary)'),
              e'\n\n' order by sess.date, sess.label
            )
       from feedback_entries fe
       join sessions sess on sess.id = fe.session_id
      where fe.student_id = s.id),
    ''
  ) as summary,
  case
    when exists (select 1 from complaints c where c.student_id = s.id)
      then coalesce(
        (select string_agg(coalesce(nullif(c.notes, ''), '(no notes)'), '; ')
           from complaints c
          where c.student_id = s.id),
        'Yes'
      )
    else ''
  end as complaint,
  s.final_mark
from students s
join buses b on b.id = s.bus_id;

grant select on public.final_data to authenticated;
