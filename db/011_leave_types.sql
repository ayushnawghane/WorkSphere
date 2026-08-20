-- Leave type master (e.g. Casual Leave, Sick Leave). annual_quota is
-- informational only — shown to employees when applying, never enforced
-- server-side.
create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_paid boolean not null default true,
  annual_quota int,
  color text not null default '#6366f1',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.leave_types enable row level security;

grant select on public.leave_types to authenticated;
grant insert, update on public.leave_types to authenticated;

-- Any authenticated employee can read active leave types (needed to apply
-- for leave); writes go through the admin Route Handlers, this policy is
-- the defense-in-depth backstop. No delete grant — leave types are
-- deactivated via is_active since leave_requests references them.
create policy "leave_types_select_authenticated"
on public.leave_types
for select
to authenticated
using (true);

create policy "leave_types_admin_write"
on public.leave_types
for all
to authenticated
using (is_admin())
with check (is_admin());
