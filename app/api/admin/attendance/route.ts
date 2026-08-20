import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMonthAttendance, type LeaveDayInfo } from "@/lib/attendance";
import { todayLocalDate } from "@/lib/utils";
import { expandDateRange } from "@/lib/leave";

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

  const [
    { data: profiles, error: profilesError },
    { data: branches },
    { data: rows, error: rowsError },
    { data: holidayRows },
    { data: leaveRows },
    { data: leaveTypes },
  ] = await Promise.all([
    admin.from("profiles").select("*").order("full_name"),
    admin.from("branches").select("*"),
    admin.from("attendance").select("*").gte("attendance_date", startDate).lte("attendance_date", endDate),
    admin.from("holidays").select("date, name, branch_id").gte("date", startDate).lte("date", endDate),
    admin
      .from("leave_requests")
      .select("user_id, start_date, end_date, is_half_day, leave_type_id")
      .eq("status", "approved")
      .lte("start_date", endDate)
      .gte("end_date", startDate),
    admin.from("leave_types").select("id, name"),
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

  const leaveTypeNameById = new Map((leaveTypes ?? []).map((lt) => [lt.id, lt.name]));

  const holidaysByBranch = new Map<string | null, Map<string, string>>();
  (holidayRows ?? []).forEach((h) => {
    if (!holidaysByBranch.has(h.branch_id)) holidaysByBranch.set(h.branch_id, new Map());
    holidaysByBranch.get(h.branch_id)!.set(h.date, h.name);
  });

  const approvedLeaveByUser = new Map<string, Map<string, LeaveDayInfo>>();
  (leaveRows ?? []).forEach((leave) => {
    if (!approvedLeaveByUser.has(leave.user_id)) approvedLeaveByUser.set(leave.user_id, new Map());
    const leaveTypeName = leaveTypeNameById.get(leave.leave_type_id) ?? "Leave";
    expandDateRange(leave.start_date, leave.end_date).forEach((date) => {
      approvedLeaveByUser.get(leave.user_id)!.set(date, { leaveTypeName, isHalfDay: leave.is_half_day });
    });
  });

  const relevantProfiles = (profiles ?? []).filter((p) => {
    if (employeeId && p.id !== employeeId) return false;
    if (branchId && p.branch_id !== branchId) return false;
    return true;
  });

  const todayIST = todayLocalDate();

  const employees = relevantProfiles.map((profile) => {
    const branch = profile.branch_id ? branchById.get(profile.branch_id) : null;

    // Company-wide holidays (branch_id null) plus any scoped to this
    // employee's own branch.
    const holidays = new Map<string, string>(holidaysByBranch.get(null) ?? []);
    if (profile.branch_id) {
      (holidaysByBranch.get(profile.branch_id) ?? new Map()).forEach((name, date) =>
        holidays.set(date, name)
      );
    }

    const { days, summary } = buildMonthAttendance({
      year,
      month,
      workingDays: branch?.working_days ?? [],
      workStartTime: branch?.work_start_time ?? null,
      joinedDate: profile.created_at.slice(0, 10),
      todayIST,
      rows: rowsByUser.get(profile.id) ?? [],
      holidays,
      approvedLeave: approvedLeaveByUser.get(profile.id) ?? new Map(),
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
