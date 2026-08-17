// Creates one test branch + one test employee (auth user + profile row) so
// you can log in and try the punch in/out flow immediately. Safe to re-run
// — it updates the existing branch/profile instead of duplicating them.
//
// Usage: node --env-file=.env.local scripts/seed-test-employee.mjs
//
// Optional overrides (env vars), all have defaults:
//   SEED_EMPLOYEE_EMAIL, SEED_EMPLOYEE_PASSWORD, SEED_EMPLOYEE_NAME, SEED_EMPLOYEE_CODE
//   SEED_BRANCH_NAME, SEED_BRANCH_LAT, SEED_BRANCH_LNG, SEED_BRANCH_RADIUS
//
// If SEED_BRANCH_LAT/LNG aren't set, the branch is created with placeholder
// coordinates and `location_required` is left OFF on the profile, so you
// can log in and punch in/out right away without a geofence rejecting you.
// Set real coordinates (e.g. from Google Maps: right-click your location ->
// the lat, lng shown at the top) to test the geofence for real.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const email = process.env.SEED_EMPLOYEE_EMAIL || "test@worksphere.dev";
const password = process.env.SEED_EMPLOYEE_PASSWORD || "TestPass123!";
const fullName = process.env.SEED_EMPLOYEE_NAME || "Test Employee";
const employeeCode = process.env.SEED_EMPLOYEE_CODE || "EMP001";

const branchName = process.env.SEED_BRANCH_NAME || "Test Branch";
const hasRealCoords = Boolean(process.env.SEED_BRANCH_LAT && process.env.SEED_BRANCH_LNG);
const branchLat = hasRealCoords ? Number(process.env.SEED_BRANCH_LAT) : 0;
const branchLng = hasRealCoords ? Number(process.env.SEED_BRANCH_LNG) : 0;
const branchRadius = process.env.SEED_BRANCH_RADIUS ? Number(process.env.SEED_BRANCH_RADIUS) : 150;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- 1. Branch: find-by-name, else insert -----------------------------
let { data: branch } = await admin
  .from("branches")
  .select("*")
  .eq("name", branchName)
  .maybeSingle();

if (branch) {
  ({ data: branch } = await admin
    .from("branches")
    .update({ latitude: branchLat, longitude: branchLng, radius_meters: branchRadius })
    .eq("id", branch.id)
    .select()
    .single());
  console.log(`Updated branch "${branchName}" (${branch.id})`);
} else {
  ({ data: branch } = await admin
    .from("branches")
    .insert({ name: branchName, latitude: branchLat, longitude: branchLng, radius_meters: branchRadius })
    .select()
    .single());
  console.log(`Created branch "${branchName}" (${branch.id})`);
}

// --- 2. Auth user: create, or reuse if the email already exists --------
let userId;
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (created?.user) {
  userId = created.user.id;
  console.log(`Created auth user ${email} (${userId})`);
} else if (createError?.message?.toLowerCase().includes("already")) {
  let page = 1;
  const perPage = 200;
  while (!userId) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page, perPage });
    if (listError) throw listError;
    const match = list.users.find((u) => u.email === email);
    if (match) userId = match.id;
    else if (list.users.length < perPage) break;
    page += 1;
  }
  if (!userId) throw new Error(`User ${email} reported as existing but couldn't be found.`);
  console.log(`Reusing existing auth user ${email} (${userId})`);
} else {
  throw createError;
}

// --- 3. Profile: upsert, linked to the auth user + branch --------------
const { error: profileError } = await admin.from("profiles").upsert(
  {
    id: userId,
    employee_code: employeeCode,
    full_name: fullName,
    branch_id: branch.id,
    location_required: hasRealCoords,
    is_active: true,
  },
  { onConflict: "id" }
);
if (profileError) throw profileError;
console.log(`Upserted profile for ${fullName} (${employeeCode})`);

console.log("\nDone. Log in with:");
console.log(`  email:    ${email}`);
console.log(`  password: ${password}`);
console.log(
  hasRealCoords
    ? `\nGeofencing is ON — you must be within ${branchRadius}m of (${branchLat}, ${branchLng}) to punch in/out.`
    : `\nGeofencing is OFF for this profile (no real branch coordinates were given) — you can punch in/out from anywhere.` +
        `\nTo test the geofence for real: re-run with SEED_BRANCH_LAT/SEED_BRANCH_LNG set, e.g.\n` +
        `  SEED_BRANCH_LAT=19.0760 SEED_BRANCH_LNG=72.8777 npm run seed`
);
