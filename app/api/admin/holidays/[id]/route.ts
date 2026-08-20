import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Holiday } from "@/lib/database.types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const update: Partial<Holiday> = {};
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.date !== undefined) update.date = String(body.date);
  if (body.branch_id !== undefined) update.branch_id = body.branch_id || null;

  if (
    (update.name !== undefined && !update.name) ||
    (update.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(update.date))
  ) {
    return NextResponse.json({ msg: "Invalid holiday fields" }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("holidays")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ msg: "Could not update holiday" }, { status: 500 });
  }

  return NextResponse.json({ holiday: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("holidays").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ msg: "Could not delete holiday" }, { status: 500 });
  }

  return NextResponse.json({ msg: "Holiday deleted" });
}
