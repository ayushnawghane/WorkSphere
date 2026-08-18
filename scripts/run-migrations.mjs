// Applies db/*.sql, in order, directly against the Supabase Postgres
// database via the IPv4 session pooler (the direct db.*.supabase.co host
// is IPv6-only on newer projects and often unreachable). Not part of the
// app runtime — a dev/deploy-time tool.
//
// Usage: node --env-file=.env.local scripts/run-migrations.mjs
//
// Requires SUPABASE_DB_PASSWORD, SUPABASE_DB_POOLER_HOST and
// SUPABASE_DB_POOLER_USER in the environment — get these from Supabase's
// "Connect" dialog -> Session pooler tab (host/user) and the database
// password you set when creating the project.
//
// Tracks applied filenames in public._migrations so re-running only picks
// up new files — each file runs once, in a transaction, ever.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_DIR = join(ROOT, "db");

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const poolerHost = process.env.SUPABASE_DB_POOLER_HOST;
const poolerUser = process.env.SUPABASE_DB_POOLER_USER;

if (!dbPassword || !poolerHost || !poolerUser) {
  console.error(
    "Missing one of SUPABASE_DB_PASSWORD / SUPABASE_DB_POOLER_HOST / SUPABASE_DB_POOLER_USER in the environment."
  );
  process.exit(1);
}

const connectionString = `postgresql://${poolerUser}:${encodeURIComponent(dbPassword)}@${poolerHost}:5432/postgres`;

const files = readdirSync(DB_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Connected to ${poolerHost}`);

  await client.query(`
    create table if not exists public._migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows: appliedRows } = await client.query(`select filename from public._migrations;`);
  const applied = new Set(appliedRows.map((r) => r.filename));

  let ranAny = false;
  for (const file of files) {
    if (applied.has(file)) continue;
    ranAny = true;

    const sql = readFileSync(join(DB_DIR, file), "utf8");
    process.stdout.write(`Applying ${file}... `);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(`insert into public._migrations (filename) values ($1);`, [file]);
      await client.query("commit");
      console.log("done");
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }

  console.log(ranAny ? "\nAll new migrations applied successfully." : "\nNothing to apply — already up to date.");
} catch (err) {
  console.error("\nMigration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
