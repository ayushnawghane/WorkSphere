import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeaveType } from "@/lib/database.types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const update: Partial<LeaveType> = {};
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.is_paid !== undefined) update.is_paid = Boolean(body.is_paid);
  if (body.color !== undefined) update.color = String(body.color);
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);
  if (body.annual_quota !== undefined) {
    update.annual_quota =
      body.annual_quota === "" || body.annual_quota === null ? null : Number(body.annual_quota);
  }

  if (
    (update.name !== undefined && !update.name) ||
    (update.annual_quota !== undefined &&
      update.annual_quota !== null &&
      (Number.isNaN(update.annual_quota) || update.annual_quota < 0))
  ) {
    return NextResponse.json({ msg: "Invalid leave type fields" }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leave_types")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    const duplicateName = error.code === "23505";
    return NextResponse.json(
      { msg: duplicateName ? "That leave type name is already in use" : "Could not update leave type" },
      { status: duplicateName ? 422 : 500 }
    );
  }

  return NextResponse.json({ leaveType: data });
}
