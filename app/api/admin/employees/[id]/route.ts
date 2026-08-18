import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/database.types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const isSelf = id === auth.userId;

  if (isSelf && body.role === "employee") {
    return NextResponse.json(
      { msg: "You can't remove your own admin access" },
      { status: 422 }
    );
  }
  if (isSelf && body.is_active === false) {
    return NextResponse.json(
      { msg: "You can't deactivate your own account" },
      { status: 422 }
    );
  }

  const update: Partial<Profile> = {};
  if (body.full_name !== undefined) update.full_name = String(body.full_name).trim();
  if (body.employee_code !== undefined) update.employee_code = String(body.employee_code).trim();
  if (body.phone !== undefined) update.phone = body.phone ? String(body.phone).trim() : null;
  if (body.branch_id !== undefined) update.branch_id = body.branch_id || null;
  if (body.role !== undefined) update.role = body.role === "admin" ? "admin" : "employee";
  if (body.punch_type !== undefined) {
    update.punch_type = body.punch_type === "selfie" ? "selfie" : "app";
  }
  if (body.location_required !== undefined) update.location_required = Boolean(body.location_required);
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    const duplicateCode = error.code === "23505";
    return NextResponse.json(
      { msg: duplicateCode ? "That employee code is already in use" : "Could not update employee" },
      { status: duplicateCode ? 422 : 500 }
    );
  }

  return NextResponse.json({ employee: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (id === auth.userId) {
    return NextResponse.json(
      { msg: "You can't deactivate your own account" },
      { status: 422 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ msg: "Could not deactivate employee" }, { status: 500 });
  }

  return NextResponse.json({ employee: data });
}
