# Database setup

SQL for the Supabase project, matching the schema in the approved plan
(`~/.claude/plans/witty-riding-riddle.md`). Run these in order — either
paste each file into the Supabase Dashboard's SQL Editor, or apply all of
them in one shot with:

```
npm run migrate
```

That runs `scripts/run-migrations.mjs`, which connects directly to Postgres
via the session pooler (see `.env.example` for the required
`SUPABASE_DB_*` vars) and applies every file in `db/` in order. Re-running
it is safe — `002`/`003`/`005` use `if not exists` / `on conflict do
nothing`; `004`'s `create policy` statements are the only non-idempotent
part (they'll error if a policy already exists, harmlessly).

| File | Purpose |
|---|---|
| `001_extensions.sql` | Ensures `pgcrypto` is enabled for `gen_random_uuid()`. |
| `002_tables.sql` | `branches`, `profiles`, `attendance` tables + indexes. |
| `003_updated_at_trigger.sql` | Auto-updates `attendance.updated_at` on punch-out. |
| `004_rls_policies.sql` | Table grants for `authenticated` + Row Level Security so employees can only read/write their own data. |
| `005_storage.sql` | Private `punch-photos` storage bucket + per-employee folder policies. |

## Notes

- This assumes the project was created with **"Automatically expose new
  tables"** turned **off** (Supabase's recommended setting). `004_rls_policies.sql`
  grants `authenticated` explicit table privileges to compensate — if that
  file hasn't run, every query will fail with a `42501 permission denied`
  error even though RLS looks correct.
- Employees are provisioned manually (not self-signup): create the auth user
  in Supabase Auth first, then insert a matching row into `profiles` with
  the same `id`.
- Seed at least one row in `branches` with real `latitude`/`longitude` before
  testing punch in/out, and point a profile's `branch_id` at it.
- All punch in/out writes happen through the app's server-side Route
  Handlers using the service-role key, so the RLS policies here are a
  defense-in-depth safety net, not the primary access control.
