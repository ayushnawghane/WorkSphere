import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET, buildMonthAttendance, type LeaveDayInfo } from "@/lib/attendance";
import { todayLocalDate } from "@/lib/utils";
import { expandDateRange } from "@/lib/leave";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ msg: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1; // 1-12

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate(); // last day of that month
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ msg: "Profile not found" }, { status: 404 });
  }

  const [{ data: branch }, { data: rows, error }, { data: holidayRows }, { data: leaveRows }] =
    await Promise.all([
      profile.branch_id
        ? supabase.from("branches").select("*").eq("id", profile.branch_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate),
      supabase
        .from("holidays")
        .select("date, name, branch_id")
        .gte("date", startDate)
        .lte("date", endDate)
        .or(`branch_id.is.null${profile.branch_id ? `,branch_id.eq.${profile.branch_id}` : ""}`),
      supabase
        .from("leave_requests")
        .select("start_date, end_date, is_half_day, leave_type_id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .lte("start_date", endDate)
        .gte("end_date", startDate),
    ]);

  if (error) {
    return NextResponse.json({ msg: "Could not load attendance history" }, { status: 500 });
  }

  const attendance = rows ?? [];

  const holidays = new Map((holidayRows ?? []).map((h) => [h.date, h.name]));

  const leaveTypeIds = [...new Set((leaveRows ?? []).map((l) => l.leave_type_id))];
  const leaveTypeNameById = new Map<string, string>();
  if (leaveTypeIds.length > 0) {
    const { data: leaveTypes } = await supabase
      .from("leave_types")
      .select("id, name")
      .in("id", leaveTypeIds);
    (leaveTypes ?? []).forEach((lt) => leaveTypeNameById.set(lt.id, lt.name));
  }

  const approvedLeave = new Map<string, LeaveDayInfo>();
  (leaveRows ?? []).forEach((leave) => {
    const leaveTypeName = leaveTypeNameById.get(leave.leave_type_id) ?? "Leave";
    expandDateRange(leave.start_date, leave.end_date).forEach((date) => {
      approvedLeave.set(date, { leaveTypeName, isHalfDay: leave.is_half_day });
    });
  });

  // Sign every photo path in one batched call instead of per-row round trips.
  const paths = attendance
    .flatMap((r) => [r.punch_in_photo_url, r.punch_out_photo_url])
    .filter((p): p is string => Boolean(p));

  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, 3600);
    signed?.forEach((s) => {
      if (s.signedUrl) urlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  const withPhotos = attendance.map((r) => ({
    ...r,
    punch_in_photo_url: r.punch_in_photo_url
      ? urlByPath.get(r.punch_in_photo_url) ?? null
      : null,
    punch_out_photo_url: r.punch_out_photo_url
      ? urlByPath.get(r.punch_out_photo_url) ?? null
      : null,
  }));

  const { days, summary } = buildMonthAttendance({
    year,
    month,
    workingDays: branch?.working_days ?? [],
    workStartTime: branch?.work_start_time ?? null,
    joinedDate: profile.created_at.slice(0, 10),
    todayIST: todayLocalDate(),
    rows: withPhotos,
    holidays,
    approvedLeave,
  });

  return NextResponse.json({ year, month, days: [...days].reverse(), summary });
}
