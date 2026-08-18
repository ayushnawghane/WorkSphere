import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Branch } from "@/lib/database.types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const update: Partial<Branch> = {};
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.latitude !== undefined) update.latitude = Number(body.latitude);
  if (body.longitude !== undefined) update.longitude = Number(body.longitude);
  if (body.radius_meters !== undefined) update.radius_meters = Number(body.radius_meters);
  if (body.working_days !== undefined) update.working_days = body.working_days.map(Number);
  if (body.work_start_time !== undefined) update.work_start_time = body.work_start_time;
  if (body.work_end_time !== undefined) update.work_end_time = body.work_end_time;
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);

  if (
    (update.name !== undefined && !update.name) ||
    (update.latitude !== undefined && Number.isNaN(update.latitude)) ||
    (update.longitude !== undefined && Number.isNaN(update.longitude))
  ) {
    return NextResponse.json({ msg: "Invalid branch fields" }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("branches")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ msg: "Could not update branch" }, { status: 500 });
  }

  return NextResponse.json({ branch: data });
}
