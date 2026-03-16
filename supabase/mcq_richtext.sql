alter table public.mcq_questions
  add column if not exists question_text_json jsonb null,
  add column if not exists option_a_text_json jsonb null,
  add column if not exists option_b_text_json jsonb null,
  add column if not exists option_c_text_json jsonb null,
  add column if not exists option_d_text_json jsonb null,
  add column if not exists explanation_json jsonb null;

