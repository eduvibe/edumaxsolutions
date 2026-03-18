create table if not exists public.teacher_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  email text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  used_at timestamptz null,
  used_by uuid null references auth.users(id) on delete set null
);

alter table public.teacher_invites enable row level security;

drop policy if exists teacher_invites_admin_select on public.teacher_invites;
drop policy if exists teacher_invites_admin_insert on public.teacher_invites;
drop policy if exists teacher_invites_admin_update on public.teacher_invites;
drop policy if exists teacher_invites_admin_delete on public.teacher_invites;

create policy teacher_invites_admin_select
on public.teacher_invites
for select
to authenticated
using (public.is_admin());

create policy teacher_invites_admin_insert
on public.teacher_invites
for insert
to authenticated
with check (public.is_admin());

create policy teacher_invites_admin_update
on public.teacher_invites
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy teacher_invites_admin_delete
on public.teacher_invites
for delete
to authenticated
using (public.is_admin());

