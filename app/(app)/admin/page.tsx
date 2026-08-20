import Link from "next/link";
import { Building2, Users, ClipboardList, LogIn, CalendarDays, Tags, CalendarCheck2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { todayLocalDate } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: activeEmployees },
    { count: activeBranches },
    { count: punchedInToday },
    { count: pendingLeaveRequests },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("attendance_date", todayLocalDate())
      .not("punch_in", "is", null),
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const links = [
    { href: "/admin/branches", label: "Branches", icon: Building2, desc: "Locations & geofences" },
    { href: "/admin/employees", label: "Employees", icon: Users, desc: "Logins & assignments" },
    { href: "/admin/reports", label: "Reports", icon: ClipboardList, desc: "Attendance across everyone" },
    { href: "/admin/holidays", label: "Holidays", icon: CalendarDays, desc: "Company holiday calendar" },
    { href: "/admin/leave-types", label: "Leave Types", icon: Tags, desc: "Casual, sick, and other leave" },
    {
      href: "/admin/leave-requests",
      label: "Leave Requests",
      icon: CalendarCheck2,
      desc: "Review and approve time off",
      badge: pendingLeaveRequests ?? 0,
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-5 pt-6">
      <h1 className="text-2xl font-bold text-[var(--text)]">Admin</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col items-center gap-0.5 py-4">
          <span className="text-xl font-bold text-brand-600 dark:text-brand-300">{activeEmployees ?? 0}</span>
          <span className="text-[11px] text-[var(--text-muted)]">Employees</span>
        </Card>
        <Card className="flex flex-col items-center gap-0.5 py-4">
          <span className="text-xl font-bold text-brand-600 dark:text-brand-300">{activeBranches ?? 0}</span>
          <span className="text-[11px] text-[var(--text-muted)]">Branches</span>
        </Card>
        <Card className="flex flex-col items-center gap-0.5 py-4">
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{punchedInToday ?? 0}</span>
          <span className="text-[11px] text-[var(--text-muted)]">In today</span>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        {links.map(({ href, label, icon: Icon, desc, badge }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                <Icon className="size-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
                <p className="text-xs text-[var(--text-muted)]">{desc}</p>
              </div>
              {Boolean(badge) && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </Card>
          </Link>
        ))}
      </div>

      <Link href="/home" className="flex items-center justify-center gap-1.5 py-2 text-sm text-[var(--text-muted)]">
        <LogIn className="size-4" /> Back to punch in/out
      </Link>
    </div>
  );
}
