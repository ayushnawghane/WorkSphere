import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/attendance";

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

  const { data: rows, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate)
    .order("attendance_date", { ascending: false });

  if (error) {
    return NextResponse.json({ msg: "Could not load attendance history" }, { status: 500 });
  }

  const attendance = rows ?? [];

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

  const presentDays = attendance.filter((r) => r.punch_in && r.punch_out).length;
  const incompleteDays = attendance.filter((r) => r.punch_in && !r.punch_out).length;
  const totalMinutes = attendance.reduce((sum, r) => {
    if (!r.punch_in || !r.punch_out) return sum;
    const ms = new Date(r.punch_out).getTime() - new Date(r.punch_in).getTime();
    return sum + Math.max(0, Math.floor(ms / 60000));
  }, 0);

  return NextResponse.json({
    year,
    month,
    attendance: withPhotos,
    summary: {
      presentDays,
      incompleteDays,
      totalHours: (totalMinutes / 60).toFixed(1),
    },
  });
}
