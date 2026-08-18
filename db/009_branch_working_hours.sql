-- Per-branch working days + hours, the basis for late-mark and absent
-- detection in attendance reports. working_days uses the same 0=Sunday..
-- 6=Saturday numbering as both JS Date#getDay() and Postgres extract(dow).
alter table public.branches
  add column working_days smallint[] not null default '{1,2,3,4,5,6}',
  add column work_start_time time not null default '09:30:00',
  add column work_end_time time not null default '18:30:00';

alter table public.branches
  add constraint branches_working_days_valid
  check (working_days <@ array[0,1,2,3,4,5,6]::smallint[]);
