import { motion } from "framer-motion";
import { LogIn, LogOut, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatTime, formatWeekday, workedHours } from "@/lib/utils";
import type { DayEntry } from "@/lib/attendance";

const STATUS_STYLES: Record<DayEntry["status"], { label: string; badge: string; tile: string }> = {
  present: {
    label: "Present",
    badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    tile: "bg-gradient-to-br from-brand-700 to-brand-500",
  },
  incomplete: {
    label: "Incomplete",
    badge: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    tile: "bg-gradient-to-br from-brand-700 to-brand-500",
  },
  absent: {
    label: "Absent",
    badge: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    tile: "bg-gradient-to-br from-rose-500 to-orange-400",
  },
  off: {
    label: "Off",
    badge: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400",
    tile: "bg-gradient-to-br from-slate-400 to-slate-300",
  },
  holiday: {
    label: "Holiday",
    badge: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    tile: "bg-gradient-to-br from-violet-500 to-purple-400",
  },
  leave: {
    label: "Leave",
    badge: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    tile: "bg-gradient-to-br from-sky-500 to-cyan-400",
  },
};

export function AttendanceDayCard({ entry }: { entry: DayEntry }) {
  const day = new Date(entry.date + "T00:00:00");
  const weekday = formatWeekday(day);
  const style = STATUS_STYLES[entry.status];

  const extraName = entry.holidayName
    ? entry.holidayName
    : entry.leaveInfo
      ? `${entry.leaveInfo.leaveTypeName}${entry.leaveInfo.isHalfDay ? " (half day)" : ""}`
      : null;

  // No punch that day (pure holiday/leave/absent/off) — show the reason
  // instead of a pair of "--:--" punch rows.
  const showPunchRows = Boolean(entry.attendance?.punch_in);

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      <Card className="flex items-center gap-3 p-3">
        <div className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-xl text-white ${style.tile}`}>
          <span className="text-base font-bold leading-none">
            {String(day.getDate()).padStart(2, "0")}
          </span>
          <span className="mt-0.5 text-[10px] uppercase leading-none opacity-90">{weekday}</span>
        </div>

        <div className="flex flex-1 items-center justify-between">
          <div>
            {showPunchRows ? (
              <>
                <div className="flex items-center gap-1 text-sm font-medium text-[var(--text)]">
                  <LogIn className="size-3.5 text-[var(--text-muted)]" />
                  {formatTime(entry.attendance?.punch_in ?? null)}
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm font-medium text-[var(--text)]">
                  <LogOut className="size-3.5 text-[var(--text-muted)]" />
                  {formatTime(entry.attendance?.punch_out ?? null)}
                </div>
                {extraName && <p className="mt-1 text-xs text-[var(--text-muted)]">{extraName}</p>}
              </>
            ) : (
              <p className="text-sm font-medium text-[var(--text)]">{extraName ?? style.label}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-1">
              {entry.isLate && (
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  Late
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                {style.label}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock className="size-3" />
              {workedHours(entry.attendance?.punch_in ?? null, entry.attendance?.punch_out ?? null)}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
