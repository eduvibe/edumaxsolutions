create table if not exists public.topic_notes (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null,
  topic_slug text not null,
  lesson_number int not null,
  content text not null default '',
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (topic_slug, lesson_number)
);

create table if not exists public.note_suggestions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.topic_notes(id) on delete cascade,
  proposed_content text not null,
  suggested_by text not null,
  change_summary text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint note_suggestions_status_check check (status in ('pending', 'approved', 'rejected'))
);

create table if not exists public.suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.note_suggestions(id) on delete cascade,
  teacher_id text not null,
  vote_type text not null,
  created_at timestamptz not null default now(),
  unique (suggestion_id, teacher_id),
  constraint suggestion_votes_type_check check (vote_type in ('approve', 'reject'))
);

create table if not exists public.note_revisions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.topic_notes(id) on delete cascade,
  previous_content text not null,
  updated_content text not null,
  updated_by text not null,
  change_summary text not null,
  created_at timestamptz not null default now()
);

alter table public.topic_notes enable row level security;
alter table public.note_suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
alter table public.note_revisions enable row level security;

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
with check (public.is_teacher());

create policy topic_notes_update_auth
on public.topic_notes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists note_suggestions_select_auth on public.note_suggestions;
drop policy if exists note_suggestions_insert_auth on public.note_suggestions;
drop policy if exists note_suggestions_update_auth on public.note_suggestions;

create policy note_suggestions_select_auth
on public.note_suggestions
for select
to authenticated
using (public.is_teacher());

create policy note_suggestions_insert_auth
on public.note_suggestions
for insert
to authenticated
with check (public.is_teacher() and suggested_by = auth.uid()::text and status = 'pending');

create policy note_suggestions_update_auth
on public.note_suggestions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists suggestion_votes_select_auth on public.suggestion_votes;
drop policy if exists suggestion_votes_insert_auth on public.suggestion_votes;

create policy suggestion_votes_select_auth
on public.suggestion_votes
for select
to authenticated
using (public.is_teacher());

create policy suggestion_votes_insert_auth
on public.suggestion_votes
for insert
to authenticated
with check (
  public.is_teacher()
  and teacher_id = auth.uid()::text
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
using (public.is_teacher());

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
  threshold int;
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

  select * into n from public.topic_notes where id = s.note_id for update;
  if found and coalesce(length(n.content), 0) = 0 then
    threshold := 1;
  else
    threshold := 3;
  end if;

  if approves >= threshold then
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
