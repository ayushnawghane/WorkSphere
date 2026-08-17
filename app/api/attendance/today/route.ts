import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayLocalDate } from "@/lib/utils";
import { withSignedPhotoUrls } from "@/lib/attendance";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ msg: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ msg: "Profile not found" }, { status: 404 });
  }

  const [{ data: branch }, { data: attendance }] = await Promise.all([
    profile.branch_id
      ? supabase.from("branches").select("*").eq("id", profile.branch_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("attendance_date", todayLocalDate())
      .maybeSingle(),
  ]);

  return NextResponse.json({
    profile,
    branch: branch ?? null,
    attendance: attendance ? await withSignedPhotoUrls(supabase, attendance) : null,
  });
}
