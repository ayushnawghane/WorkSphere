import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin.from("leave_types").select("*").order("name");

  if (error) {
    return NextResponse.json({ msg: "Could not load leave types" }, { status: 500 });
  }

  return NextResponse.json({ leaveTypes: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const is_paid = body.is_paid !== false;
  const annual_quota =
    body.annual_quota === "" || body.annual_quota === null || body.annual_quota === undefined
      ? null
      : Number(body.annual_quota);
  const color = body.color ? String(body.color) : "#6366f1";

  if (!name) {
    return NextResponse.json({ msg: "Name is required" }, { status: 422 });
  }
  if (annual_quota !== null && (Number.isNaN(annual_quota) || annual_quota < 0)) {
    return NextResponse.json({ msg: "Annual quota must be a positive number" }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leave_types")
    .insert({ name, is_paid, annual_quota, color })
    .select("*")
    .single();

  if (error) {
    const duplicateName = error.code === "23505";
    return NextResponse.json(
      { msg: duplicateName ? "That leave type name is already in use" : "Could not create leave type" },
      { status: duplicateName ? 422 : 500 }
    );
  }

  return NextResponse.json({ leaveType: data });
}
