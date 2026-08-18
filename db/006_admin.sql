-- Admin role + defense-in-depth RLS for the admin area (branches,
-- employees, attendance reports). Actual admin writes go through
-- service-role Route Handlers (app/api/admin/**); these policies are the
-- backstop, same philosophy as db/004_rls_policies.sql.

alter table public.profiles
  add column role text not null default 'employee'
  check (role in ('employee', 'admin'));

-- security definer so this bypasses RLS internally when checking the
-- caller's own role — a policy on `profiles` can't safely subquery
-- `profiles` directly without this (infinite recursion risk). Standard
-- Supabase pattern for admin checks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

create policy "profiles_admin_select_all"
on public.profiles
for select
to authenticated
using (is_admin());

create policy "branches_admin_write"
on public.branches
for all
to authenticated
using (is_admin())
with check (is_admin());

create policy "attendance_admin_select_all"
on public.attendance
for select
to authenticated
using (is_admin());

grant insert, update, delete on public.branches to authenticated;
