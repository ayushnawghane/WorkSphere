-- All punch in/out writes go through Next.js Route Handlers using the
-- Supabase service-role key (which bypasses RLS entirely). These policies
-- are the defense-in-depth layer for any direct client (anon/authenticated
-- key) access, e.g. reads from the client or future admin tooling.
--
-- Assumes the project was created with "Automatically expose new tables"
-- OFF (the recommended setting) — so table-level grants below are required
-- in addition to RLS; without them `authenticated` has no privileges on
-- these tables at all and every query 42501s regardless of the policies.

grant usage on schema public to authenticated;
grant select on public.branches to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.attendance to authenticated;

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.attendance enable row level security;

-- Branches: any authenticated employee can read active branches
-- (needed client-side to show location context); no client writes.
create policy "branches_select_authenticated"
on public.branches
for select
to authenticated
using (true);

-- Profiles: employees can read only their own profile row.
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Attendance: employees can read/insert/update only their own rows.
-- (In practice the Route Handler uses the service-role client, but this
-- keeps direct client access safe if it's ever used.)
create policy "attendance_select_own"
on public.attendance
for select
to authenticated
using (user_id = auth.uid());

create policy "attendance_insert_own"
on public.attendance
for insert
to authenticated
with check (user_id = auth.uid());

create policy "attendance_update_own"
on public.attendance
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
