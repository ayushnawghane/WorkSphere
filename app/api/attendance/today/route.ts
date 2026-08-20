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

  const today = todayLocalDate();

  const [{ data: branch }, { data: attendance }, { data: holidaysToday }, { data: leaveToday }] =
    await Promise.all([
      profile.branch_id
        ? supabase.from("branches").select("*").eq("id", profile.branch_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("attendance_date", today)
        .maybeSingle(),
      supabase
        .from("holidays")
        .select("name, branch_id")
        .eq("date", today)
        .or(`branch_id.is.null${profile.branch_id ? `,branch_id.eq.${profile.branch_id}` : ""}`),
      supabase
        .from("leave_requests")
        .select("leave_type_id, is_half_day")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today)
        .maybeSingle(),
    ]);

  let leaveTypeName: string | null = null;
  if (leaveToday) {
    const { data: leaveType } = await supabase
      .from("leave_types")
      .select("name")
      .eq("id", leaveToday.leave_type_id)
      .maybeSingle();
    leaveTypeName = leaveType?.name ?? "Leave";
  }

  return NextResponse.json({
    profile,
    branch: branch ?? null,
    attendance: attendance ? await withSignedPhotoUrls(supabase, attendance) : null,
    holidayToday: holidaysToday?.[0]?.name ?? null,
    leaveToday: leaveToday ? { leaveTypeName, isHalfDay: leaveToday.is_half_day } : null,
  });
}
