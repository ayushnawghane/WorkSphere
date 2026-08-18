"use client";

import { useEffect, useState } from "react";
import { Download, CalendarX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { AttendanceDayCard } from "@/components/AttendanceDayCard";
import { MONTH_NAMES, workedHours } from "@/lib/utils";
import type { Attendance, Branch } from "@/lib/database.types";
import type { EmployeeWithEmail } from "@/components/admin/EmployeeForm";

interface AdminAttendanceRow extends Attendance {
  employee_name: string;
  employee_code: string;
}

interface EmployeeSummary {
  user_id: string;
  employee_name: string;
  employee_code: string;
  presentDays: number;
  incompleteDays: number;
  totalHours: string;
}

const now = new Date();
const YEAR_OPTIONS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

export default function AdminReportsPage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [branchId, setBranchId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithEmail[]>([]);
  const [rows, setRows] = useState<AdminAttendanceRow[]>([]);
  const [summary, setSummary] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/admin/branches"), fetch("/api/admin/employees")]).then(
      async ([branchRes, empRes]) => {
        const branchData = await branchRes.json();
        const empData = await empRes.json();
        setBranches(branchData.branches ?? []);
        setEmployees(empData.employees ?? []);
      }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (branchId) params.set("branch_id", branchId);
    if (employeeId) params.set("employee_id", employeeId);

    fetch(`/api/admin/attendance?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setRows(data.attendance ?? []);
        setSummary(data.summary ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year, month, branchId, employeeId]);

  const rowsByEmployee = new Map<string, AdminAttendanceRow[]>();
  for (const row of rows) {
    if (!rowsByEmployee.has(row.user_id)) rowsByEmployee.set(row.user_id, []);
    rowsByEmployee.get(row.user_id)!.push(row);
  }

  const exportCsv = () => {
    const header = ["Employee", "Code", "Date", "Punch In", "Punch Out", "Worked Hours"];
    const lines = rows.map((r) =>
      [
        r.employee_name,
        r.employee_code,
        r.attendance_date,
        r.punch_in ? new Date(r.punch_in).toLocaleTimeString() : "",
        r.punch_out ? new Date(r.punch_out).toLocaleTimeString() : "",
        workedHours(r.punch_in, r.punch_out),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${MONTH_NAMES[month - 1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Reports</h1>
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          <Download className="size-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex-1 rounded-xl border border-black/10 bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text)] outline-none focus:border-brand-500 dark:border-white/10"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 rounded-xl border border-black/10 bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text)] outline-none focus:border-brand-500 dark:border-white/10"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="flex-1 rounded-xl border border-black/10 bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-brand-500 dark:border-white/10"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex-1 rounded-xl border border-black/10 bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-brand-500 dark:border-white/10"
          >
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : summary.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <CalendarX className="size-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-[var(--text-muted)]">No attendance records for these filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {summary.map((s) => (
            <div key={s.user_id} className="flex flex-col gap-2.5">
              <Card className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{s.employee_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{s.employee_code}</p>
                </div>
                <div className="flex gap-3 text-center text-xs">
                  <div>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{s.presentDays}</p>
                    <p className="text-[var(--text-muted)]">Present</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-600 dark:text-amber-400">{s.incompleteDays}</p>
                    <p className="text-[var(--text-muted)]">Incomplete</p>
                  </div>
                  <div>
                    <p className="font-semibold text-brand-600 dark:text-brand-300">{s.totalHours}h</p>
                    <p className="text-[var(--text-muted)]">Hours</p>
                  </div>
                </div>
              </Card>
              {(rowsByEmployee.get(s.user_id) ?? []).map((row) => (
                <AttendanceDayCard key={row.id} row={row} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
