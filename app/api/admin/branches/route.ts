import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("branches")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ msg: "Could not load branches" }, { status: 500 });
  }

  return NextResponse.json({ branches: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const radius_meters = body.radius_meters ? Number(body.radius_meters) : 150;

  if (!name || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json(
      { msg: "Name, latitude, and longitude are required" },
      { status: 422 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("branches")
    .insert({ name, latitude, longitude, radius_meters })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ msg: "Could not create branch" }, { status: 500 });
  }

  return NextResponse.json({ branch: data });
}
