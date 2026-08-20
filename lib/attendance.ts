import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attendance, Database } from "@/lib/database.types";
import { istMinutesSinceMidnight, timeStringToMinutes, weekdayOf } from "@/lib/utils";

const PHOTO_BUCKET = "punch-photos";
const SIGNED_URL_TTL_SECONDS = 3600;
const LATE_GRACE_MINUTES = 10;

/**
 * `attendance.punch_in_photo_url` / `punch_out_photo_url` store the storage
 * *path* (e.g. "{user_id}/2026-08-16-in.jpg"), not a public URL — the bucket
 * is private. Resolve them to short-lived signed URLs right before sending
 * a row to the client.
 */
export async function withSignedPhotoUrls(
  supabase: SupabaseClient<Database>,
  row: Attendance
): Promise<Attendance> {
  const paths = [row.punch_in_photo_url, row.punch_out_photo_url].filter(
    (p): p is string => Boolean(p)
  );

  if (paths.length === 0) return row;

  const { data } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  const urlByPath = new Map(
    (data ?? []).map((d) => [d.path, d.signedUrl] as const)
  );

  return {
    ...row,
    punch_in_photo_url: row.punch_in_photo_url
      ? urlByPath.get(row.punch_in_photo_url) ?? null
      : null,
    punch_out_photo_url: row.punch_out_photo_url
      ? urlByPath.get(row.punch_out_photo_url) ?? null
      : null,
  };
}

export { PHOTO_BUCKET };

export type DayStatus = "present" | "incomplete" | "absent" | "off" | "holiday" | "leave";

export interface LeaveDayInfo {
  leaveTypeName: string;
  isHalfDay: boolean;
}

export interface DayEntry {
  date: string;
  status: DayStatus;
  attendance: Attendance | null;
  isLate: boolean;
  holidayName: string | null;
  leaveInfo: LeaveDayInfo | null;
}

export interface MonthSummary {
  presentDays: number;
  incompleteDays: number;
  absentDays: number;
  lateDays: number;
  holidayDays: number;
  leaveDays: number;
  totalHours: string;
}

/**
 * Builds every calendar day of the month (ascending) tagged with a status —
 * present / incomplete / holiday / leave / absent (a working day per the
 * branch's working_days with no punch and no holiday/approved leave) / off
 * (non-working day, before the employee existed, or still in the future) —
 * plus a late flag and a summary.
 *
 * `holidays` and `approvedLeave` are pre-expanded by the caller to one entry
 * per calendar date (date -> info) so this function stays a pure lookup —
 * see lib/leave.ts's expandDateRange for turning a leave request's date
 * range into per-day entries.
 *
 * A punch always wins over holiday/leave for the *status* (someone who
 * actually came in and worked shows as Present/Incomplete), but
 * holidayName/leaveInfo are still attached whenever applicable so the UI can
 * show e.g. "Present (half-day leave)".
 */
export function buildMonthAttendance({
  year,
  month,
  workingDays,
  workStartTime,
  joinedDate,
  todayIST,
  rows,
  holidays = new Map(),
  approvedLeave = new Map(),
}: {
  year: number;
  month: number; // 1-12
  workingDays: number[];
  workStartTime: string | null;
  joinedDate: string;
  todayIST: string;
  rows: Attendance[];
  holidays?: Map<string, string>;
  approvedLeave?: Map<string, LeaveDayInfo>;
}): { days: DayEntry[]; summary: MonthSummary } {
  const byDate = new Map(rows.map((r) => [r.attendance_date, r]));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const workStartMinutes = workStartTime ? timeStringToMinutes(workStartTime) : null;

  const days: DayEntry[] = [];
  let presentDays = 0;
  let incompleteDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let holidayDays = 0;
  let leaveDays = 0;
  let totalMinutes = 0;

  for (let d = 1; d <= lastDay; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const attendance = byDate.get(date) ?? null;
    const isWorkingDay = workingDays.includes(weekdayOf(date));
    const isFuture = date > todayIST;
    const isBeforeJoined = date < joinedDate;
    const holidayName = holidays.get(date) ?? null;
    const leaveInfo = approvedLeave.get(date) ?? null;

    let isLate = false;
    if (attendance?.punch_in && workStartMinutes !== null) {
      isLate = istMinutesSinceMidnight(attendance.punch_in) > workStartMinutes + LATE_GRACE_MINUTES;
    }

    let status: DayStatus;
    if (attendance?.punch_in && attendance?.punch_out) {
      status = "present";
      presentDays += 1;
      totalMinutes += Math.max(
        0,
        Math.floor((new Date(attendance.punch_out).getTime() - new Date(attendance.punch_in).getTime()) / 60000)
      );
    } else if (attendance?.punch_in) {
      status = "incomplete";
      incompleteDays += 1;
    } else if (holidayName) {
      status = "holiday";
      holidayDays += 1;
    } else if (leaveInfo) {
      status = "leave";
      leaveDays += 1;
    } else if (isWorkingDay && !isFuture && !isBeforeJoined) {
      status = "absent";
      absentDays += 1;
    } else {
      status = "off";
    }

    if (isLate) lateDays += 1;

    days.push({ date, status, attendance, isLate, holidayName, leaveInfo });
  }

  return {
    days,
    summary: {
      presentDays,
      incompleteDays,
      absentDays,
      lateDays,
      holidayDays,
      leaveDays,
      totalHours: (totalMinutes / 60).toFixed(1),
    },
  };
}
