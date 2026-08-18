import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const password = String(body.password ?? "");

  if (password.length < 6) {
    return NextResponse.json({ msg: "Password must be at least 6 characters" }, { status: 422 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });

  if (error) {
    return NextResponse.json({ msg: "Could not reset password" }, { status: 500 });
  }

  return NextResponse.json({ msg: "Password updated" });
}
