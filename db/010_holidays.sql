-- Company holidays. branch_id null = applies to every branch; set it to
-- scope a holiday to one branch (e.g. a regional festival).
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  branch_id uuid references public.branches (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists holidays_date_idx on public.holidays (date);

alter table public.holidays enable row level security;

grant select on public.holidays to authenticated;
grant insert, update, delete on public.holidays to authenticated;

-- Any authenticated employee can read holidays (needed to show on the
-- home banner / attendance calendar); writes go through the admin Route
-- Handlers, this policy is the defense-in-depth backstop.
create policy "holidays_select_authenticated"
on public.holidays
for select
to authenticated
using (true);

create policy "holidays_admin_write"
on public.holidays
for all
to authenticated
using (is_admin())
with check (is_admin());
