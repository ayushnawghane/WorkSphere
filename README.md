# WorkSphere Attendance

A location-based punch in / punch out PWA. Next.js (App Router) on Vercel,
Supabase for auth/database/storage — free-tier friendly, no server to manage.

## Stack

- **Next.js 15** (App Router, TypeScript) — frontend + API Route Handlers
- **Supabase** — Postgres, Auth (email/password), Storage (punch selfies)
- **Tailwind CSS** + **framer-motion** for the UI
- **@ducanh2912/next-pwa** for installability / offline fallback

## 1. Create a Supabase project

Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
When prompted, it's fine to leave **"Automatically expose new tables"**
either on or off — `db/004_rls_policies.sql` grants `authenticated` its
privileges explicitly either way, and Row Level Security is what actually
scopes access per-row.

## 2. Configure environment variables

```
cp .env.example .env.local
```

Fill in from Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — from **Project Settings → API**.
- `SUPABASE_DB_PASSWORD` — the database password you set when creating the
  project.
- `SUPABASE_DB_POOLER_HOST`, `SUPABASE_DB_POOLER_USER` — from the
  **"Connect"** button → **Session pooler** tab. (Newer Supabase projects'
  *direct* `db.<ref>.supabase.co` host is IPv6-only and often unreachable;
  the pooler is IPv4-compatible and what `npm run migrate` uses.)

## 3. Install, migrate, seed, run

```
npm install
npm run migrate   # applies db/*.sql to your Supabase project
npm run seed      # creates one test branch + one test employee to log in with
npm run icons     # regenerates public/icons/* and app/icon.png (already committed, rarely needed)
npm run dev
```

`npm run seed` prints a test login (email/password) at the end. Without
`SEED_BRANCH_LAT`/`SEED_BRANCH_LNG` set, it creates the test employee with
geofencing off so you can punch in/out from anywhere immediately; pass real
coordinates to test the geofence for real — see the comment header in
[`scripts/seed-test-employee.mjs`](scripts/seed-test-employee.mjs).

For production use (not just testing), provision real employees the same
way `seed-test-employee.mjs` does: create the person in **Authentication →
Users**, then a matching row in `public.profiles` with the same `id`,
pointing `branch_id` at a real row in `public.branches`.

Open http://localhost:3000 — you'll be redirected to `/login`. Geolocation
requires a secure context; `localhost` is exempt so it works over plain
HTTP in dev.

## How punch in/out works

All the validation lives server-side in `app/api/attendance/punch/route.ts`,
never trusting the client:

1. Client gets the browser's geolocation, optionally captures a selfie, and
   `POST`s `{ lat, lng, photo? }`.
2. The route handler looks up the employee's assigned branch, computes the
   distance (`lib/geo.ts`, Haversine) and rejects the punch if it's outside
   the branch's `radius_meters` (when `location_required` is on).
3. It uses the server's own clock for the timestamp — never the client's.
4. First punch of the day inserts a row (`punch_in`); the next punch fills
   in `punch_out` on that same row. A `log_data` JSON array on the row keeps
   every punch attempt (timestamp/lat/lng) for audit purposes.

See the full design in the plan this app was built from, or skim
`app/api/attendance/*/route.ts` and `components/PunchScreen.tsx`.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel, set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as
   encrypted Project env vars (`SUPABASE_SERVICE_ROLE_KEY` especially must
   stay server-only — never prefix it with `NEXT_PUBLIC_`). The
   `SUPABASE_DB_*` vars aren't needed on Vercel — they're only for running
   `npm run migrate`/`npm run seed` locally against the database.
3. Deploy. Vercel's free tier covers this comfortably — no cron jobs or
   long-running processes needed.
4. On a phone, open the deployed HTTPS URL and use "Add to Home Screen" /
   the install prompt to install it as a PWA.

## Project layout

```
app/
  login/                 sign-in
  (app)/home/            punch in/out screen
  (app)/history/         monthly attendance history + filters
  (app)/profile/         employee info + sign out
  api/attendance/        today / punch / history route handlers
components/              UI + screen components
lib/                     supabase clients, geo helper, shared types/utils
db/                      Supabase SQL migrations (see db/README.md)
scripts/
  generate-icons.mjs        regenerates the PWA icon set
  run-migrations.mjs        applies db/*.sql (npm run migrate)
  seed-test-employee.mjs    creates a test branch + employee (npm run seed)
```
