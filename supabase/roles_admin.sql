create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_roles_role_check check (role in ('student', 'teacher', 'admin'))
);

alter table public.user_roles enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((select role in ('teacher','admin') from public.user_roles where user_id = auth.uid()), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.user_roles where user_id = auth.uid()), false)
$$;

create or replace function public.touch_user_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_roles_touch_updated_at on public.user_roles;
create trigger user_roles_touch_updated_at
before update on public.user_roles
for each row
execute function public.touch_user_roles_updated_at();

drop policy if exists user_roles_select_self on public.user_roles;
drop policy if exists user_roles_insert_admin on public.user_roles;
drop policy if exists user_roles_update_admin on public.user_roles;

create policy user_roles_select_self
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

create policy user_roles_insert_admin
on public.user_roles
for insert
to authenticated
with check (public.is_admin());

create policy user_roles_update_admin
on public.user_roles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.ensure_user_role_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles(user_id, role)
  values (new.id, 'student')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_add_role on auth.users;
create trigger on_auth_user_created_add_role
after insert on auth.users
for each row execute function public.ensure_user_role_row();

