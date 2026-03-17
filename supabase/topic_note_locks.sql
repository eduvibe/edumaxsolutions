create table if not exists public.topic_note_locks (
  topic_slug text not null,
  lesson_number int not null,
  locked_by text not null,
  locked_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (topic_slug, lesson_number)
);

create or replace function public.touch_topic_note_locks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists topic_note_locks_touch_updated_at on public.topic_note_locks;
create trigger topic_note_locks_touch_updated_at
before update on public.topic_note_locks
for each row execute function public.touch_topic_note_locks_updated_at();

alter table public.topic_note_locks enable row level security;

drop policy if exists topic_note_locks_select_teachers on public.topic_note_locks;
create policy topic_note_locks_select_teachers
on public.topic_note_locks
for select
to authenticated
using (public.is_teacher());

create or replace function public.acquire_topic_note_lock(p_topic_slug text, p_lesson_number int, p_ttl_seconds int default 900)
returns table(acquired boolean, locked_by text, locked_until timestamptz, locked_by_email text, locked_by_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_until timestamptz := now() + make_interval(secs => greatest(60, least(3600, p_ttl_seconds)));
  v_updated int := 0;
begin
  if not public.is_teacher() then
    return query select false, null::text, null::timestamptz, null::text, null::text;
    return;
  end if;

  begin
    insert into public.topic_note_locks(topic_slug, lesson_number, locked_by, locked_until)
    values (p_topic_slug, p_lesson_number, auth.uid()::text, v_until);
    return query
    select
      true,
      auth.uid()::text,
      v_until,
      u.email,
      coalesce(nullif(trim(coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', '')), ''), null)
    from auth.users u
    where u.id = auth.uid();
    return;
  exception when unique_violation then
  end;

  update public.topic_note_locks
  set locked_by = auth.uid()::text, locked_until = v_until
  where topic_slug = p_topic_slug
    and lesson_number = p_lesson_number
    and (locked_until <= v_now or locked_by = auth.uid()::text);

  get diagnostics v_updated = row_count;
  if v_updated > 0 then
    return query
    select
      true,
      auth.uid()::text,
      v_until,
      u.email,
      coalesce(nullif(trim(coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', '')), ''), null)
    from auth.users u
    where u.id = auth.uid();
    return;
  end if;

  return query
  select
    false,
    l.locked_by,
    l.locked_until,
    u.email,
    coalesce(nullif(trim(coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', '')), ''), null)
  from public.topic_note_locks l
  left join auth.users u on u.id = l.locked_by::uuid
  where l.topic_slug = p_topic_slug and l.lesson_number = p_lesson_number;
end;
$$;

create or replace function public.release_topic_note_lock(p_topic_slug text, p_lesson_number int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    return;
  end if;
  delete from public.topic_note_locks
  where topic_slug = p_topic_slug
    and lesson_number = p_lesson_number
    and locked_by = auth.uid()::text;
end;
$$;
