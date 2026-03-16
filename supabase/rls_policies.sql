alter table public.templates enable row level security;
alter table public.notes enable row level security;
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
with check (uploaded_by = auth.uid()::text);

create policy templates_update_owner
on public.templates
for update
to authenticated
using (uploaded_by = auth.uid()::text)
with check (uploaded_by = auth.uid()::text);

create policy templates_delete_owner
on public.templates
for delete
to authenticated
using (uploaded_by = auth.uid()::text);

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
with check (author_id = auth.uid()::text);

create policy notes_update_owner
on public.notes
for update
to authenticated
using (author_id = auth.uid()::text)
with check (author_id = auth.uid()::text);

create policy notes_delete_owner
on public.notes
for delete
to authenticated
using (author_id = auth.uid()::text);

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
with check (author_id = auth.uid()::text);

create policy mcq_update_owner
on public.mcq_questions
for update
to authenticated
using (author_id = auth.uid()::text)
with check (author_id = auth.uid()::text);

create policy mcq_delete_owner
on public.mcq_questions
for delete
to authenticated
using (author_id = auth.uid()::text);

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
with check (author_id = auth.uid()::text);

create policy essay_update_owner
on public.essay_questions
for update
to authenticated
using (author_id = auth.uid()::text)
with check (author_id = auth.uid()::text);

create policy essay_delete_owner
on public.essay_questions
for delete
to authenticated
using (author_id = auth.uid()::text);

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
with check (author_id = auth.uid()::text);

create policy videos_update_owner
on public.lesson_videos
for update
to authenticated
using (author_id = auth.uid()::text)
with check (author_id = auth.uid()::text);

create policy videos_delete_owner
on public.lesson_videos
for delete
to authenticated
using (author_id = auth.uid()::text);

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

