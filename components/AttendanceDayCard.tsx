import { motion } from "framer-motion";
import { LogIn, LogOut, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatTime, formatWeekday, workedHours } from "@/lib/utils";
import type { Attendance } from "@/lib/database.types";

export function AttendanceDayCard({ row }: { row: Attendance }) {
  const day = new Date(row.attendance_date + "T00:00:00");
  const complete = Boolean(row.punch_in && row.punch_out);
  const weekday = formatWeekday(day);
  const isSunday = weekday === "Sun";

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      <Card className="flex items-center gap-3 p-3">
        <div
          className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-xl text-white ${
            isSunday
              ? "bg-gradient-to-br from-rose-500 to-orange-400"
              : "bg-gradient-to-br from-brand-700 to-brand-500"
          }`}
        >
          <span className="text-base font-bold leading-none">
            {String(day.getDate()).padStart(2, "0")}
          </span>
          <span className="mt-0.5 text-[10px] uppercase leading-none opacity-90">{weekday}</span>
        </div>

        <div className="flex flex-1 items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-sm font-medium text-[var(--text)]">
              <LogIn className="size-3.5 text-[var(--text-muted)]" />
              {formatTime(row.punch_in)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm font-medium text-[var(--text)]">
              <LogOut className="size-3.5 text-[var(--text-muted)]" />
              {formatTime(row.punch_out)}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                complete
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
              }`}
            >
              {complete ? "Complete" : "Incomplete"}
            </span>
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock className="size-3" />
              {workedHours(row.punch_in, row.punch_out)}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
