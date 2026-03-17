create table if not exists public.curriculum_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  key_stages text[] not null default '{}',
  is_new boolean null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.curriculum_subjects(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text null,
  year_group text null,
  year_order int null,
  thread text null,
  school_section text null,
  lesson_count int null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_topics_school_section_check check (school_section in ('primary','jss','sss') or school_section is null)
);

create table if not exists public.curriculum_lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.curriculum_topics(id) on delete cascade,
  lesson_number int not null,
  title text not null,
  objective text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, lesson_number)
);

alter table public.curriculum_topics add column if not exists year_order int null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists curriculum_subjects_touch_updated_at on public.curriculum_subjects;
create trigger curriculum_subjects_touch_updated_at
before update on public.curriculum_subjects
for each row execute function public.touch_updated_at();

drop trigger if exists curriculum_topics_touch_updated_at on public.curriculum_topics;
create trigger curriculum_topics_touch_updated_at
before update on public.curriculum_topics
for each row execute function public.touch_updated_at();

drop trigger if exists curriculum_lessons_touch_updated_at on public.curriculum_lessons;
create trigger curriculum_lessons_touch_updated_at
before update on public.curriculum_lessons
for each row execute function public.touch_updated_at();

alter table public.curriculum_subjects enable row level security;
alter table public.curriculum_topics enable row level security;
alter table public.curriculum_lessons enable row level security;

drop policy if exists curriculum_subjects_select_all on public.curriculum_subjects;
drop policy if exists curriculum_topics_select_all on public.curriculum_topics;
drop policy if exists curriculum_lessons_select_all on public.curriculum_lessons;

create policy curriculum_subjects_select_all
on public.curriculum_subjects
for select
using (true);

create policy curriculum_topics_select_all
on public.curriculum_topics
for select
using (true);

create policy curriculum_lessons_select_all
on public.curriculum_lessons
for select
using (true);

drop policy if exists curriculum_subjects_admin_write on public.curriculum_subjects;
create policy curriculum_subjects_admin_write
on public.curriculum_subjects
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists curriculum_topics_teacher_write on public.curriculum_topics;
create policy curriculum_topics_teacher_write
on public.curriculum_topics
for insert
to authenticated
with check (public.is_teacher());

drop policy if exists curriculum_topics_teacher_update on public.curriculum_topics;
create policy curriculum_topics_teacher_update
on public.curriculum_topics
for update
to authenticated
using (public.is_teacher())
with check (public.is_teacher());

drop policy if exists curriculum_topics_admin_delete on public.curriculum_topics;
create policy curriculum_topics_admin_delete
on public.curriculum_topics
for delete
to authenticated
using (public.is_admin());

drop policy if exists curriculum_lessons_teacher_write on public.curriculum_lessons;
create policy curriculum_lessons_teacher_write
on public.curriculum_lessons
for insert
to authenticated
with check (public.is_teacher());

drop policy if exists curriculum_lessons_teacher_update on public.curriculum_lessons;
create policy curriculum_lessons_teacher_update
on public.curriculum_lessons
for update
to authenticated
using (public.is_teacher())
with check (public.is_teacher());

drop policy if exists curriculum_lessons_admin_delete on public.curriculum_lessons;
create policy curriculum_lessons_admin_delete
on public.curriculum_lessons
for delete
to authenticated
using (public.is_admin());
