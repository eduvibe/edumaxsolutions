create table if not exists public.student_identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_digits text not null unique,
  recovery_email text null,
  created_at timestamptz not null default now()
);

create table if not exists public.student_password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists student_password_resets_user_id_idx on public.student_password_resets(user_id);
create index if not exists student_password_resets_expires_at_idx on public.student_password_resets(expires_at);

alter table public.student_identities enable row level security;
alter table public.student_password_resets enable row level security;

drop policy if exists student_identities_select_self on public.student_identities;
drop policy if exists student_identities_insert_self on public.student_identities;
drop policy if exists student_identities_update_self on public.student_identities;

create policy student_identities_select_self
on public.student_identities
for select
to authenticated
using (user_id = auth.uid());

create policy student_identities_insert_self
on public.student_identities
for insert
to authenticated
with check (user_id = auth.uid());

create policy student_identities_update_self
on public.student_identities
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists student_password_resets_select_none on public.student_password_resets;
drop policy if exists student_password_resets_write_none on public.student_password_resets;

create policy student_password_resets_select_none
on public.student_password_resets
for select
to authenticated
using (false);

create policy student_password_resets_write_none
on public.student_password_resets
for all
to authenticated
using (false)
with check (false);

create or replace function public.digits_only(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(input, ''), '[^0-9]', '', 'g')
$$;

create or replace function public.capture_student_identity_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  phone_raw text;
  phone_digits text;
  rec_email text;
begin
  phone_raw := coalesce(new.raw_user_meta_data->>'phone', '');
  phone_digits := public.digits_only(phone_raw);
  rec_email := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'recoveryEmail', ''))), '');

  if phone_digits is not null and length(phone_digits) > 0 then
    insert into public.student_identities(user_id, phone_digits, recovery_email)
    values (new.id, phone_digits, rec_email)
    on conflict (user_id) do update set phone_digits = excluded.phone_digits, recovery_email = excluded.recovery_email;
  end if;

  return new;
end;
$$;

create unique index if not exists student_identities_recovery_email_unique
on public.student_identities (recovery_email)
where recovery_email is not null;

drop trigger if exists on_auth_user_created_capture_student_identity on auth.users;
create trigger on_auth_user_created_capture_student_identity
after insert on auth.users
for each row execute function public.capture_student_identity_from_auth();
