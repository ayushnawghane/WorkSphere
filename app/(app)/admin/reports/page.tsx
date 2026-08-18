"use client";

import { useEffect, useState } from "react";
import { Download, CalendarX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { AttendanceDayCard } from "@/components/AttendanceDayCard";
import { MONTH_NAMES, workedHours } from "@/lib/utils";
import type { DayEntry, MonthSummary } from "@/lib/attendance";
import type { Branch } from "@/lib/database.types";
import type { EmployeeWithEmail } from "@/components/admin/EmployeeForm";

interface EmployeeReport {
  user_id: string;
  employee_name: string;
  employee_code: string;
  branch_name: string | null;
  days: DayEntry[];
  summary: MonthSummary;
}

const now = new Date();
const YEAR_OPTIONS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

const STATUS_LABEL: Record<DayEntry["status"], string> = {
  present: "Present",
  incomplete: "Incomplete",
  absent: "Absent",
  off: "-",
};

export default function AdminReportsPage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [branchId, setBranchId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeWithEmail[]>([]);
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/admin/branches"), fetch("/api/admin/employees")]).then(
      async ([branchRes, empRes]) => {
        const branchData = await branchRes.json();
        const empData = await empRes.json();
        setBranches(branchData.branches ?? []);
        setEmployeeOptions(empData.employees ?? []);
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
        setReports(data.employees ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year, month, branchId, employeeId]);

  // Employees whose schedule has nothing to say this month (no branch, or
  // joined after month-end) — every day is "off", so there's nothing to show.
  const visibleReports = reports.filter(
    (r) => r.summary.presentDays + r.summary.absentDays + r.summary.incompleteDays > 0
  );

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines: string[] = [];

    for (const emp of visibleReports) {
      const dayNums = emp.days.map((d) => Number(d.date.slice(-2)));
      const statusFor = (d: DayEntry) =>
        d.status === "present" && d.isLate ? "Late" : STATUS_LABEL[d.status];

      lines.push(
        [esc(emp.employee_code), esc(emp.employee_name), esc(emp.branch_name ?? ""), esc(""), esc("Date"), ...dayNums.map(esc)].join(",")
      );
      lines.push(["", "", "", "", esc("Status"), ...emp.days.map((d) => esc(statusFor(d)))].join(","));
      lines.push(
        [
          "",
          "",
          "",
          "",
          esc("Punch In"),
          ...emp.days.map((d) => esc(d.attendance?.punch_in ? new Date(d.attendance.punch_in).toLocaleTimeString() : "")),
        ].join(",")
      );
      lines.push(
        [
          "",
          "",
          "",
          "",
          esc("Punch Out"),
          ...emp.days.map((d) => esc(d.attendance?.punch_out ? new Date(d.attendance.punch_out).toLocaleTimeString() : "")),
        ].join(",")
      );
      lines.push(
        [
          "",
          "",
          "",
          "",
          esc("Worked Hrs"),
          ...emp.days.map((d) => esc(workedHours(d.attendance?.punch_in ?? null, d.attendance?.punch_out ?? null))),
        ].join(",")
      );
      lines.push(["", "", "", "", esc("Present Days"), esc(emp.summary.presentDays)].join(","));
      lines.push(["", "", "", "", esc("Absent Days"), esc(emp.summary.absentDays)].join(","));
      lines.push(["", "", "", "", esc("Late Days"), esc(emp.summary.lateDays)].join(","));
      lines.push(["", "", "", "", esc("Total Hours"), esc(emp.summary.totalHours)].join(","));
      lines.push("");
    }

    const csv = lines.join("\n");
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
          disabled={visibleReports.length === 0}
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
            {employeeOptions.map((e) => (
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
      ) : visibleReports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <CalendarX className="size-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-[var(--text-muted)]">No attendance records for these filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {visibleReports.map((emp) => (
            <div key={emp.user_id} className="flex flex-col gap-2.5">
              <Card className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{emp.employee_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {emp.employee_code}
                    {emp.branch_name ? ` · ${emp.branch_name}` : ""}
                  </p>
                </div>
                <div className="flex gap-3 text-center text-xs">
                  <div>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{emp.summary.presentDays}</p>
                    <p className="text-[var(--text-muted)]">Present</p>
                  </div>
                  <div>
                    <p className="font-semibold text-rose-600 dark:text-rose-400">{emp.summary.absentDays}</p>
                    <p className="text-[var(--text-muted)]">Absent</p>
                  </div>
                  <div>
                    <p className="font-semibold text-orange-600 dark:text-orange-400">{emp.summary.lateDays}</p>
                    <p className="text-[var(--text-muted)]">Late</p>
                  </div>
                  <div>
                    <p className="font-semibold text-brand-600 dark:text-brand-300">{emp.summary.totalHours}h</p>
                    <p className="text-[var(--text-muted)]">Hours</p>
                  </div>
                </div>
              </Card>
              {emp.days
                .filter((d) => d.status !== "off")
                .reverse()
                .map((entry) => (
                  <AttendanceDayCard key={entry.date} entry={entry} />
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
