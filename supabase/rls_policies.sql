alter table public.templates enable row level security;
alter table public.notes enable row level security;
alter table public.topic_notes enable row level security;
alter table public.note_suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
alter table public.note_revisions enable row level security;
alter table public.mcq_questions enable row level security;
alter table public.essay_questions enable row level security;
alter table public.lesson_videos enable row level security;

drop policy if exists templates_select_public on public.templates;
drop policy if exists templates_insert_tutor on public.templates;
drop policy if exists templates_update_owner on public.templates;
drop policy if exists templates_delete_owner on public.templates;

create policy templates_select_public
on public.templates
for select
using (true);

create policy templates_insert_tutor
on public.templates
for insert
to authenticated
with check (public.is_teacher() and uploaded_by = auth.uid()::text);

create policy templates_update_owner
on public.templates
for update
to authenticated
using (public.is_teacher() and uploaded_by = auth.uid()::text)
with check (public.is_teacher() and uploaded_by = auth.uid()::text);

drop policy if exists templates_update_admin on public.templates;
drop policy if exists templates_delete_admin on public.templates;

create policy templates_update_admin
on public.templates
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy templates_delete_admin
on public.templates
for delete
to authenticated
using (public.is_admin());

create policy templates_delete_owner
on public.templates
for delete
to authenticated
using (public.is_teacher() and uploaded_by = auth.uid()::text);

drop policy if exists notes_select_public on public.notes;
drop policy if exists notes_insert_tutor on public.notes;
drop policy if exists notes_update_owner on public.notes;
drop policy if exists notes_delete_owner on public.notes;

create policy notes_select_public
on public.notes
for select
using (published = true or author_id = auth.uid()::text);

create policy notes_insert_tutor
on public.notes
for insert
to authenticated
with check (public.is_teacher() and author_id = auth.uid()::text);

drop policy if exists notes_update_admin on public.notes;
drop policy if exists notes_delete_admin on public.notes;

create policy notes_update_admin
on public.notes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy notes_delete_admin
on public.notes
for delete
to authenticated
using (public.is_admin());

create policy notes_update_owner
on public.notes
for update
to authenticated
using (public.is_teacher() and author_id = auth.uid()::text)
with check (public.is_teacher() and author_id = auth.uid()::text);

create policy notes_delete_owner
on public.notes
for delete
to authenticated
using (public.is_teacher() and author_id = auth.uid()::text);

drop policy if exists topic_notes_select_public on public.topic_notes;
drop policy if exists topic_notes_insert_auth on public.topic_notes;
drop policy if exists topic_notes_update_auth on public.topic_notes;

create policy topic_notes_select_public
on public.topic_notes
for select
using (true);

create policy topic_notes_insert_auth
on public.topic_notes
for insert
to authenticated
with check (true);

create policy topic_notes_update_auth
on public.topic_notes
for update
to authenticated
using (true)
with check (true);

drop policy if exists note_suggestions_select_auth on public.note_suggestions;
drop policy if exists note_suggestions_insert_auth on public.note_suggestions;
drop policy if exists note_suggestions_update_auth on public.note_suggestions;

create policy note_suggestions_select_auth
on public.note_suggestions
for select
to authenticated
using (true);

create policy note_suggestions_insert_auth
on public.note_suggestions
for insert
to authenticated
with check (suggested_by = auth.uid()::text and status = 'pending');

create policy note_suggestions_update_auth
on public.note_suggestions
for update
to authenticated
using (true)
with check (true);

drop policy if exists suggestion_votes_select_auth on public.suggestion_votes;
drop policy if exists suggestion_votes_insert_auth on public.suggestion_votes;

create policy suggestion_votes_select_auth
on public.suggestion_votes
for select
to authenticated
using (true);

create policy suggestion_votes_insert_auth
on public.suggestion_votes
for insert
to authenticated
with check (
  teacher_id = auth.uid()::text
  and vote_type in ('approve', 'reject')
  and exists (
    select 1 from public.note_suggestions s
    where s.id = suggestion_id
      and s.suggested_by <> auth.uid()::text
      and s.status = 'pending'
  )
);

drop policy if exists note_revisions_select_auth on public.note_revisions;

create policy note_revisions_select_auth
on public.note_revisions
for select
to authenticated
using (true);

create or replace function public.apply_suggestion_if_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approves int;
  rejects int;
  s record;
  n record;
begin
  select count(*) into approves from public.suggestion_votes where suggestion_id = new.suggestion_id and vote_type = 'approve';
  select count(*) into rejects from public.suggestion_votes where suggestion_id = new.suggestion_id and vote_type = 'reject';

  select * into s from public.note_suggestions where id = new.suggestion_id for update;
  if not found then
    return new;
  end if;

  if s.status <> 'pending' then
    return new;
  end if;

  if approves >= 3 then
    select * into n from public.topic_notes where id = s.note_id for update;
    if found then
      insert into public.note_revisions(note_id, previous_content, updated_content, updated_by, change_summary)
      values (n.id, n.content, s.proposed_content, s.suggested_by, s.change_summary);

      update public.topic_notes
      set content = s.proposed_content, last_updated = now()
      where id = n.id;
    end if;

    update public.note_suggestions set status = 'approved' where id = s.id;
  elsif rejects >= 2 then
    update public.note_suggestions set status = 'rejected' where id = s.id;
  end if;

  return new;
end;
$$;

drop trigger if exists suggestion_votes_after_insert on public.suggestion_votes;
create trigger suggestion_votes_after_insert
after insert on public.suggestion_votes
for each row
execute function public.apply_suggestion_if_threshold();

drop policy if exists mcq_select_public on public.mcq_questions;
drop policy if exists mcq_insert_tutor on public.mcq_questions;
drop policy if exists mcq_update_owner on public.mcq_questions;
drop policy if exists mcq_delete_owner on public.mcq_questions;

create policy mcq_select_public
on public.mcq_questions
for select
using (true);

create policy mcq_insert_tutor
on public.mcq_questions
for insert
to authenticated
with check (public.is_teacher() and author_id = auth.uid()::text);

create policy mcq_update_owner
on public.mcq_questions
for update
to authenticated
using (public.is_teacher() and author_id = auth.uid()::text)
with check (public.is_teacher() and author_id = auth.uid()::text);

drop policy if exists mcq_update_admin on public.mcq_questions;
drop policy if exists mcq_delete_admin on public.mcq_questions;

create policy mcq_update_admin
on public.mcq_questions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy mcq_delete_admin
on public.mcq_questions
for delete
to authenticated
using (public.is_admin());

create policy mcq_delete_owner
on public.mcq_questions
for delete
to authenticated
using (public.is_teacher() and author_id = auth.uid()::text);

drop policy if exists essay_select_public on public.essay_questions;
drop policy if exists essay_insert_tutor on public.essay_questions;
drop policy if exists essay_update_owner on public.essay_questions;
drop policy if exists essay_delete_owner on public.essay_questions;

create policy essay_select_public
on public.essay_questions
for select
using (true);

create policy essay_insert_tutor
on public.essay_questions
for insert
to authenticated
with check (public.is_teacher() and author_id = auth.uid()::text);

create policy essay_update_owner
on public.essay_questions
for update
to authenticated
using (public.is_teacher() and author_id = auth.uid()::text)
with check (public.is_teacher() and author_id = auth.uid()::text);

drop policy if exists essay_update_admin on public.essay_questions;
drop policy if exists essay_delete_admin on public.essay_questions;

create policy essay_update_admin
on public.essay_questions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy essay_delete_admin
on public.essay_questions
for delete
to authenticated
using (public.is_admin());

create policy essay_delete_owner
on public.essay_questions
for delete
to authenticated
using (public.is_teacher() and author_id = auth.uid()::text);

drop policy if exists videos_select_public on public.lesson_videos;
drop policy if exists videos_insert_tutor on public.lesson_videos;
drop policy if exists videos_update_owner on public.lesson_videos;
drop policy if exists videos_delete_owner on public.lesson_videos;

create policy videos_select_public
on public.lesson_videos
for select
using (true);

create policy videos_insert_tutor
on public.lesson_videos
for insert
to authenticated
with check (public.is_teacher() and author_id = auth.uid()::text);

create policy videos_update_owner
on public.lesson_videos
for update
to authenticated
using (public.is_teacher() and author_id = auth.uid()::text)
with check (public.is_teacher() and author_id = auth.uid()::text);

drop policy if exists videos_update_admin on public.lesson_videos;
drop policy if exists videos_delete_admin on public.lesson_videos;

create policy videos_update_admin
on public.lesson_videos
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy videos_delete_admin
on public.lesson_videos
for delete
to authenticated
using (public.is_admin());

create policy videos_delete_owner
on public.lesson_videos
for delete
to authenticated
using (public.is_teacher() and author_id = auth.uid()::text);

create or replace function public.increment_template_downloads(template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.templates set downloads = downloads + 1 where id = template_id;
end;
$$;

create or replace function public.increment_note_views(note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notes set views = views + 1, date_updated = now() where id = note_id;
end;
$$;

grant execute on function public.increment_template_downloads(uuid) to anon, authenticated;
grant execute on function public.increment_note_views(uuid) to anon, authenticated;
