import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTime(iso: string | null): string {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatWeekday(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Today's date in Asia/Kolkata as YYYY-MM-DD — matches the
 * `attendance_date` column. Always IST regardless of the server's own
 * timezone (Vercel functions run in UTC), so a punch at, say, 1am IST
 * files under the correct IST calendar day rather than the previous UTC day.
 */
export function todayLocalDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function workedHours(punchIn: string | null, punchOut: string | null): string {
  if (!punchIn || !punchOut) return "--";
  const ms = new Date(punchOut).getTime() - new Date(punchIn).getTime();
  if (ms <= 0) return "--";
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
