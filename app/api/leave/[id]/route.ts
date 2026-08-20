import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ msg: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // RLS (leave_requests_delete_own_pending) already restricts this to the
  // caller's own pending requests — a delete of someone else's row or an
  // already-reviewed row just affects 0 rows.
  const { data, error } = await supabase
    .from("leave_requests")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ msg: "Could not cancel leave request" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { msg: "Only pending requests you own can be cancelled" },
      { status: 422 }
    );
  }

  return NextResponse.json({ msg: "Leave request cancelled" });
}
