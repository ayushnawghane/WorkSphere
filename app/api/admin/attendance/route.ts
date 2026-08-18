import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

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

  let query = admin
    .from("attendance")
    .select("*")
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate)
    .order("attendance_date", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);
  if (employeeId) query = query.eq("user_id", employeeId);

  const [{ data: rows, error }, { data: profiles }] = await Promise.all([
    query,
    admin.from("profiles").select("id, full_name, employee_code"),
  ]);

  if (error) {
    return NextResponse.json({ msg: "Could not load attendance" }, { status: 500 });
  }

  const attendance = rows ?? [];
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const withNames = attendance.map((r) => ({
    ...r,
    employee_name: nameById.get(r.user_id)?.full_name ?? "Unknown",
    employee_code: nameById.get(r.user_id)?.employee_code ?? "",
  }));

  const summaryByEmployee = new Map<
    string,
    { employee_name: string; employee_code: string; presentDays: number; incompleteDays: number; totalMinutes: number }
  >();

  for (const row of withNames) {
    const key = row.user_id;
    if (!summaryByEmployee.has(key)) {
      summaryByEmployee.set(key, {
        employee_name: row.employee_name,
        employee_code: row.employee_code,
        presentDays: 0,
        incompleteDays: 0,
        totalMinutes: 0,
      });
    }
    const s = summaryByEmployee.get(key)!;
    if (row.punch_in && row.punch_out) {
      s.presentDays += 1;
      s.totalMinutes += Math.max(
        0,
        Math.floor((new Date(row.punch_out).getTime() - new Date(row.punch_in).getTime()) / 60000)
      );
    } else if (row.punch_in) {
      s.incompleteDays += 1;
    }
  }

  const summary = Array.from(summaryByEmployee.entries()).map(([userId, s]) => ({
    user_id: userId,
    employee_name: s.employee_name,
    employee_code: s.employee_code,
    presentDays: s.presentDays,
    incompleteDays: s.incompleteDays,
    totalHours: (s.totalMinutes / 60).toFixed(1),
  }));

  return NextResponse.json({ year, month, attendance: withNames, summary });
}
