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
