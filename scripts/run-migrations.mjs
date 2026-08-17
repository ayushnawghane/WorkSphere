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

  for (const file of files) {
    const sql = readFileSync(join(DB_DIR, file), "utf8");
    process.stdout.write(`Applying ${file}... `);
    await client.query(sql);
    console.log("done");
  }

  console.log("\nAll migrations applied successfully.");
} catch (err) {
  console.error("\nMigration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
