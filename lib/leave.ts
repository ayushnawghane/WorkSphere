import type { LeaveRequest } from "@/lib/database.types";

/** Inclusive list of YYYY-MM-DD days between start and end (both YYYY-MM-DD). */
export function expandDateRange(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);

  while (cursor.getTime() <= last.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return days;
}

/** Day-count for a leave request — 0.5 for a half-day, otherwise the inclusive range length. */
export function leaveRequestDayCount(
  request: Pick<LeaveRequest, "start_date" | "end_date" | "is_half_day">
): number {
  if (request.is_half_day) return 0.5;
  return expandDateRange(request.start_date, request.end_date).length;
}
