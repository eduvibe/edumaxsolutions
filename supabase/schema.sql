create extension if not exists pgcrypto;

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  subject_slug text null,
  topic_slug text null,
  lesson_number int null,
  resource_type text not null default 'slides',
  file_url text not null,
  preview_image_url text null,
  uploaded_by text not null,
  date_uploaded timestamptz not null default now(),
  downloads int not null default 0
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null,
  topic_slug text not null,
  lesson_number int null,
  title text not null,
  content text not null,
  featured_image_url text null,
  author_id text not null,
  date_created timestamptz not null default now(),
  date_updated timestamptz null,
  views int not null default 0,
  published boolean not null default true
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_roles_role_check check (role in ('student', 'teacher', 'admin'))
);

create table if not exists public.teacher_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  phone text not null,
  school text not null,
  location text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists topic_notes (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null,
  topic_slug text not null,
  lesson_number int not null,
  content text not null default '',
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (topic_slug, lesson_number)
);

create table if not exists note_suggestions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.topic_notes(id) on delete cascade,
  proposed_content text not null,
  suggested_by text not null,
  change_summary text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint note_suggestions_status_check check (status in ('pending', 'approved', 'rejected'))
);

create table if not exists suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.note_suggestions(id) on delete cascade,
  teacher_id text not null,
  vote_type text not null,
  created_at timestamptz not null default now(),
  unique (suggestion_id, teacher_id),
  constraint suggestion_votes_type_check check (vote_type in ('approve', 'reject'))
);

create table if not exists note_revisions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.topic_notes(id) on delete cascade,
  previous_content text not null,
  updated_content text not null,
  updated_by text not null,
  change_summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists mcq_questions (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null,
  topic_slug text not null,
  lesson_number int null,
  author_id text not null,
  question_text text not null,
  question_text_json jsonb null,
  question_image_url text null,
  option_a_text text not null,
  option_a_text_json jsonb null,
  option_a_image_url text null,
  option_b_text text not null,
  option_b_text_json jsonb null,
  option_b_image_url text null,
  option_c_text text not null,
  option_c_text_json jsonb null,
  option_c_image_url text null,
  option_d_text text not null,
  option_d_text_json jsonb null,
  option_d_image_url text null,
  correct_answer text not null,
  explanation text not null,
  explanation_json jsonb null,
  date_created timestamptz not null default now()
);

create table if not exists essay_questions (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null,
  topic_slug text not null,
  lesson_number int null,
  author_id text not null,
  question_text text not null,
  reference_answer text null,
  date_created timestamptz not null default now()
);

create table if not exists lesson_videos (
  id uuid primary key default gen_random_uuid(),
  subject_slug text not null,
  topic_slug text not null,
  lesson_number int not null,
  author_id text not null,
  title text not null,
  video_url text not null,
  date_created timestamptz not null default now()
);
