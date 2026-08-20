import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  const admin = createAdminClient();
  let query = admin.from("holidays").select("*").order("date");
  if (year) {
    query = query.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ msg: "Could not load holidays" }, { status: 500 });
  }

  return NextResponse.json({ holidays: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const date = String(body.date ?? "");
  const branch_id = body.branch_id || null;

  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ msg: "Name and date are required" }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("holidays")
    .insert({ name, date, branch_id })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ msg: "Could not add holiday" }, { status: 500 });
  }

  return NextResponse.json({ holiday: data });
}
