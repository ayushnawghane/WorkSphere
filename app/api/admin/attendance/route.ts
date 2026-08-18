import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMonthAttendance } from "@/lib/attendance";
import { todayLocalDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const now = new Date();
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;
  const branchId = searchParams.get("branch_id");
  const employeeId = searchParams.get("employee_id");

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  const admin = createAdminClient();

  const [{ data: profiles, error: profilesError }, { data: branches }, { data: rows, error: rowsError }] =
    await Promise.all([
      admin.from("profiles").select("*").order("full_name"),
      admin.from("branches").select("*"),
      admin.from("attendance").select("*").gte("attendance_date", startDate).lte("attendance_date", endDate),
    ]);

  if (profilesError || rowsError) {
    return NextResponse.json({ msg: "Could not load attendance" }, { status: 500 });
  }

  const branchById = new Map((branches ?? []).map((b) => [b.id, b]));
  const rowsByUser = new Map<string, typeof rows>();
  (rows ?? []).forEach((r) => {
    if (!rowsByUser.has(r.user_id)) rowsByUser.set(r.user_id, []);
    rowsByUser.get(r.user_id)!.push(r);
  });

  const relevantProfiles = (profiles ?? []).filter((p) => {
    if (employeeId && p.id !== employeeId) return false;
    if (branchId && p.branch_id !== branchId) return false;
    return true;
  });

  const todayIST = todayLocalDate();

  const employees = relevantProfiles.map((profile) => {
    const branch = profile.branch_id ? branchById.get(profile.branch_id) : null;
    const { days, summary } = buildMonthAttendance({
      year,
      month,
      workingDays: branch?.working_days ?? [],
      workStartTime: branch?.work_start_time ?? null,
      joinedDate: profile.created_at.slice(0, 10),
      todayIST,
      rows: rowsByUser.get(profile.id) ?? [],
    });

    return {
      user_id: profile.id,
      employee_name: profile.full_name,
      employee_code: profile.employee_code,
      branch_name: branch?.name ?? null,
      days,
      summary,
    };
  });

  return NextResponse.json({ year, month, employees });
}
