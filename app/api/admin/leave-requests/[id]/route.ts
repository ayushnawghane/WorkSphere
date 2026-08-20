import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const status = body.status === "approved" || body.status === "rejected" ? body.status : null;
  const review_note = body.review_note ? String(body.review_note).trim() : null;

  if (!status) {
    return NextResponse.json({ msg: "Status must be 'approved' or 'rejected'" }, { status: 422 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("leave_requests")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ msg: "Leave request not found" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json({ msg: "This request has already been reviewed" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("leave_requests")
    .update({
      status,
      review_note,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ msg: "Could not update leave request" }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}
