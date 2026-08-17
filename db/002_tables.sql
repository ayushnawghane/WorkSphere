-- Branches: each office location with its geofence center + radius.
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Profiles: one row per employee, 1:1 with Supabase auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_code text not null unique,
  full_name text not null,
  branch_id uuid references public.branches (id),
  location_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists profiles_branch_id_idx on public.profiles (branch_id);

-- Attendance: one row per employee per day.
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid references public.branches (id),
  attendance_date date not null,
  punch_in timestamptz,
  punch_in_lat double precision,
  punch_in_lng double precision,
  punch_in_photo_url text,
  punch_out timestamptz,
  punch_out_lat double precision,
  punch_out_lng double precision,
  punch_out_photo_url text,
  log_data jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, attendance_date)
);

create index if not exists attendance_user_id_idx on public.attendance (user_id);
create index if not exists attendance_attendance_date_idx on public.attendance (attendance_date);
