import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam === "pending" || statusParam === "approved" || statusParam === "rejected"
      ? statusParam
      : null;
  const employeeId = searchParams.get("employee_id");
  const branchId = searchParams.get("branch_id");

  const admin = createAdminClient();

  const [{ data: profiles }, { data: branches }, { data: leaveTypes }] = await Promise.all([
    admin.from("profiles").select("id, full_name, employee_code, branch_id"),
    admin.from("branches").select("id, name"),
    admin.from("leave_types").select("id, name, is_paid"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const leaveTypeById = new Map((leaveTypes ?? []).map((lt) => [lt.id, lt]));

  let query = admin.from("leave_requests").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (employeeId) query = query.eq("user_id", employeeId);

  const { data: requests, error } = await query;

  if (error) {
    return NextResponse.json({ msg: "Could not load leave requests" }, { status: 500 });
  }

  const relevant = (requests ?? []).filter((r) => {
    if (!branchId) return true;
    return profileById.get(r.user_id)?.branch_id === branchId;
  });

  const enriched = relevant.map((r) => {
    const profile = profileById.get(r.user_id);
    return {
      ...r,
      employee_name: profile?.full_name ?? "Unknown",
      employee_code: profile?.employee_code ?? "",
      branch_name: profile?.branch_id ? branchNameById.get(profile.branch_id) ?? null : null,
      leave_type_name: leaveTypeById.get(r.leave_type_id)?.name ?? "Leave",
      leave_type_is_paid: leaveTypeById.get(r.leave_type_id)?.is_paid ?? true,
    };
  });

  return NextResponse.json({ requests: enriched });
}
