import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leaveRequestDayCount } from "@/lib/leave";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ msg: "Not authenticated" }, { status: 401 });
  }

  const [{ data: leaveTypes }, { data: requests, error }] = await Promise.all([
    supabase.from("leave_types").select("*").eq("is_active", true).order("name"),
    supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false }),
  ]);

  if (error) {
    return NextResponse.json({ msg: "Could not load leave requests" }, { status: 500 });
  }

  // Informational only — days used this calendar year per leave type, from
  // approved requests. Never blocks a new application.
  const currentYear = String(new Date().getFullYear());
  const usedByType = new Map<string, number>();
  (requests ?? [])
    .filter((r) => r.status === "approved" && r.start_date.startsWith(currentYear))
    .forEach((r) => {
      usedByType.set(r.leave_type_id, (usedByType.get(r.leave_type_id) ?? 0) + leaveRequestDayCount(r));
    });

  return NextResponse.json({
    leaveTypes: leaveTypes ?? [],
    requests: requests ?? [],
    usedByType: Object.fromEntries(usedByType),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ msg: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const leave_type_id = String(body.leave_type_id ?? "");
  const start_date = String(body.start_date ?? "");
  const end_date = String(body.end_date ?? start_date);
  const is_half_day = Boolean(body.is_half_day);
  const reason = body.reason ? String(body.reason).trim() : null;

  const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  if (!leave_type_id || !validDate(start_date) || !validDate(end_date)) {
    return NextResponse.json({ msg: "Leave type and dates are required" }, { status: 422 });
  }
  if (end_date < start_date) {
    return NextResponse.json({ msg: "End date can't be before start date" }, { status: 422 });
  }
  if (is_half_day && end_date !== start_date) {
    return NextResponse.json({ msg: "Half-day leave must be a single date" }, { status: 422 });
  }

  const { data: leaveType } = await supabase
    .from("leave_types")
    .select("id")
    .eq("id", leave_type_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!leaveType) {
    return NextResponse.json({ msg: "Invalid leave type" }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      user_id: user.id,
      leave_type_id,
      start_date,
      end_date,
      is_half_day,
      reason,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ msg: "Could not submit leave request" }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}
