create table if not exists public.teacher_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  phone text not null,
  school text not null,
  location text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz null,
  decided_by uuid null,
  constraint teacher_applications_status_check check (status in ('pending', 'approved', 'rejected'))
);

create unique index if not exists teacher_applications_user_unique on public.teacher_applications(user_id);

alter table public.teacher_applications enable row level security;

drop policy if exists teacher_applications_insert_self on public.teacher_applications;
drop policy if exists teacher_applications_select_self on public.teacher_applications;
drop policy if exists teacher_applications_select_admin on public.teacher_applications;
drop policy if exists teacher_applications_update_admin on public.teacher_applications;

create policy teacher_applications_insert_self
on public.teacher_applications
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.current_role() = 'student'
  and status = 'pending'
);

create policy teacher_applications_select_self
on public.teacher_applications
for select
to authenticated
using (user_id = auth.uid());

create policy teacher_applications_select_admin
on public.teacher_applications
for select
to authenticated
using (public.is_admin());

create policy teacher_applications_update_admin
on public.teacher_applications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

