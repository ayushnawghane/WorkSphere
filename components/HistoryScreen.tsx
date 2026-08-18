"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { AttendanceDayCard } from "@/components/AttendanceDayCard";
import { MONTH_NAMES } from "@/lib/utils";
import type { DayEntry, MonthSummary } from "@/lib/attendance";

const now = new Date();
const YEAR_OPTIONS = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

export function HistoryScreen() {
  const router = useRouter();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<DayEntry[]>([]);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const res = await fetch(`/api/attendance/history?year=${year}&month=${month}`);
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (cancelled) return;
      setDays(data.days ?? []);
      setSummary(data.summary ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [year, month, router]);

  const visibleDays = days.filter((d) => d.status !== "off");

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Attendance History</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Review your punch records by month
        </p>
      </div>

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
          className="w-28 rounded-xl border border-black/10 bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text)] outline-none focus:border-brand-500 dark:border-white/10"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col items-center gap-0.5 py-3">
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? <Skeleton className="h-6 w-8" /> : summary?.presentDays ?? 0}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">Present</span>
        </Card>
        <Card className="flex flex-col items-center gap-0.5 py-3">
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
            {loading ? <Skeleton className="h-6 w-8" /> : summary?.absentDays ?? 0}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">Absent</span>
        </Card>
        <Card className="flex flex-col items-center gap-0.5 py-3">
          <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {loading ? <Skeleton className="h-6 w-8" /> : summary?.lateDays ?? 0}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">Late</span>
        </Card>
      </div>

      {!loading && summary && (
        <p className="-mt-2 text-center text-xs text-[var(--text-muted)]">
          {summary.incompleteDays} incomplete · {summary.totalHours}h total
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)
        ) : visibleDays.length > 0 ? (
          visibleDays.map((entry) => <AttendanceDayCard key={entry.date} entry={entry} />)
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarX className="size-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-[var(--text-muted)]">
              No attendance records for {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
