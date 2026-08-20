-- Leave applications: employee-submitted, admin-reviewed. Employees can
-- insert/select their own rows and delete (cancel) their own while still
-- pending; only an admin can move a row to approved/rejected.
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id),
  start_date date not null,
  end_date date not null,
  is_half_day boolean not null default false,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (not is_half_day or start_date = end_date)
);

create index if not exists leave_requests_user_id_idx on public.leave_requests (user_id);
create index if not exists leave_requests_date_range_idx on public.leave_requests (start_date, end_date);
create index if not exists leave_requests_status_idx on public.leave_requests (status);

create trigger leave_requests_set_updated_at
before update on public.leave_requests
for each row
execute function public.set_updated_at();

alter table public.leave_requests enable row level security;

grant select, insert, delete, update on public.leave_requests to authenticated;

create policy "leave_requests_select_own"
on public.leave_requests
for select
to authenticated
using (user_id = auth.uid());

create policy "leave_requests_insert_own"
on public.leave_requests
for insert
to authenticated
with check (user_id = auth.uid() and status = 'pending');

create policy "leave_requests_delete_own_pending"
on public.leave_requests
for delete
to authenticated
using (user_id = auth.uid() and status = 'pending');

create policy "leave_requests_admin_select_all"
on public.leave_requests
for select
to authenticated
using (is_admin());

create policy "leave_requests_admin_update_all"
on public.leave_requests
for update
to authenticated
using (is_admin())
with check (is_admin());
