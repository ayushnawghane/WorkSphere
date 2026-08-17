-- Keep attendance.updated_at current on every update (route handler upserts
-- punch_in first, then punch_out later the same day).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists attendance_set_updated_at on public.attendance;

create trigger attendance_set_updated_at
before update on public.attendance
for each row
execute function public.set_updated_at();
