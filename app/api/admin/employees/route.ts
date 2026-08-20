import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient, fetchAllPages } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();

  // Both the profiles table and Supabase's auth admin API cap a single
  // request at 1000 rows — fetchAllPages loops until a page comes back
  // short so no employee is silently dropped once the org grows past that.
  let profiles;
  let users;
  try {
    [profiles, users] = await Promise.all([
      fetchAllPages(async (page, pageSize) => {
        const { data, error } = await admin
          .from("profiles")
          .select("*")
          .order("full_name")
          .range((page - 1) * pageSize, page * pageSize - 1);
        if (error) throw error;
        return data ?? [];
      }),
      fetchAllPages(async (page, perPage) => {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        return data.users;
      }),
    ]);
  } catch {
    return NextResponse.json({ msg: "Could not load employees" }, { status: 500 });
  }

  const { data: branches } = await admin.from("branches").select("id, name");

  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const emailById = new Map(users.map((u) => [u.id, u.email ?? null]));

  const employees = profiles.map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? null,
    branch_name: p.branch_id ? branchNameById.get(p.branch_id) ?? null : null,
  }));

  return NextResponse.json({ employees });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const full_name = String(body.full_name ?? "").trim();
  const employee_code = String(body.employee_code ?? "").trim();
  const phone = body.phone ? String(body.phone).trim() : null;
  const branch_id = body.branch_id || null;
  const role = body.role === "admin" ? "admin" : "employee";
  const punch_type = body.punch_type === "selfie" ? "selfie" : "app";
  const location_required = body.location_required !== false;

  if (!email || !password || !full_name || !employee_code) {
    return NextResponse.json(
      { msg: "Email, password, name, and employee code are required" },
      { status: 422 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ msg: "Password must be at least 6 characters" }, { status: 422 });
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const alreadyExists = createError.message.toLowerCase().includes("already");
    return NextResponse.json(
      { msg: alreadyExists ? "That email is already in use" : "Could not create login" },
      { status: 422 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: created.user.id,
      employee_code,
      full_name,
      phone,
      branch_id,
      role,
      punch_type,
      location_required,
    })
    .select("*")
    .single();

  if (profileError) {
    // Don't leave an orphaned auth user behind if the profile insert failed.
    await admin.auth.admin.deleteUser(created.user.id);
    const duplicateCode = profileError.code === "23505";
    return NextResponse.json(
      { msg: duplicateCode ? "That employee code is already in use" : "Could not create employee" },
      { status: 422 }
    );
  }

  return NextResponse.json({ employee: { ...profile, email } });
}
