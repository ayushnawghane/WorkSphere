-- Per-employee punch flow: 'app' = single-tap, location-only punch
-- (default). 'selfie' = camera step required, same flow as before this
-- column existed.
alter table public.profiles
  add column punch_type text not null default 'app'
  check (punch_type in ('app', 'selfie'));
