"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ClipboardX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { leaveRequestDayCount } from "@/lib/leave";
import type { Branch, LeaveRequest } from "@/lib/database.types";
import type { EmployeeWithEmail } from "@/components/admin/EmployeeForm";

interface EnrichedLeaveRequest extends LeaveRequest {
  employee_name: string;
  employee_code: string;
  branch_name: string | null;
  leave_type_name: string;
  leave_type_is_paid: boolean;
}

const STATUS_BADGE: Record<LeaveRequest["status"], string> = {
  pending: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  approved: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  rejected: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

export default function AdminLeaveRequestsPage() {
  const { show } = useToast();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "">("pending");
  const [branchId, setBranchId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeWithEmail[]>([]);
  const [requests, setRequests] = useState<EnrichedLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<EnrichedLeaveRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const fetchRequests = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (branchId) params.set("branch_id", branchId);
    if (employeeId) params.set("employee_id", employeeId);
    const res = await fetch(`/api/admin/leave-requests?${params}`);
    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, branchId, employeeId]);

  const decide = async (req: EnrichedLeaveRequest, decision: "approved" | "rejected", note?: string) => {
    setBusyId(req.id);
    const res = await fetch(`/api/admin/leave-requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision, review_note: note || null }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show(decision === "approved" ? "Leave approved" : "Leave rejected", "success");
    setRejecting(null);
    fetchRequests();
  };

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <h1 className="text-2xl font-bold text-[var(--text)]">Leave Requests</h1>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {(["pending", "approved", "rejected", ""] as const).map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                status === s
                  ? "bg-brand-600 text-white"
                  : "bg-black/5 text-slate-500 dark:bg-white/10 dark:text-slate-400"
              }`}
            >
              {s || "All"}
            </button>
          ))}
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

      <div className="flex flex-col gap-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ClipboardX className="size-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-[var(--text-muted)]">No leave requests for these filters.</p>
          </div>
        ) : (
          requests.map((req) => (
            <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{req.employee_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {req.employee_code}
                      {req.branch_name ? ` · ${req.branch_name}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[req.status]}`}>
                    {req.status}
                  </span>
                </div>

                <div className="text-sm text-[var(--text)]">
                  <span className="font-medium">{req.leave_type_name}</span>
                  {" · "}
                  {req.start_date === req.end_date
                    ? formatDate(req.start_date + "T00:00:00")
                    : `${formatDate(req.start_date + "T00:00:00")} – ${formatDate(req.end_date + "T00:00:00")}`}
                  {req.is_half_day ? " (half day)" : ""}
                  {" · "}
                  {leaveRequestDayCount(req)} day{leaveRequestDayCount(req) === 1 ? "" : "s"}
                </div>

                {req.reason && <p className="text-xs text-[var(--text-muted)]">&ldquo;{req.reason}&rdquo;</p>}
                {req.review_note && (
                  <p className="text-xs text-[var(--text-muted)]">Note: &ldquo;{req.review_note}&rdquo;</p>
                )}

                {req.status === "pending" && (
                  <div className="mt-1 flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      loading={busyId === req.id}
                      onClick={() => decide(req, "approved")}
                    >
                      <Check className="size-4" /> Approve
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={() => setRejecting(req)}>
                      <X className="size-4" /> Reject
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <RejectSheet
        request={rejecting}
        busy={busyId === rejecting?.id}
        onClose={() => setRejecting(null)}
        onReject={(note) => rejecting && decide(rejecting, "rejected", note)}
      />
    </div>
  );
}

function RejectSheet({
  request,
  busy,
  onClose,
  onReject,
}: {
  request: EnrichedLeaveRequest | null;
  busy: boolean;
  onClose: () => void;
  onReject: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <Sheet open={Boolean(request)} title={`Reject — ${request?.employee_name ?? ""}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onReject(note);
          setNote("");
        }}
        className="flex flex-col gap-3"
      >
        <Field label="Note to employee (optional)">
          <textarea
            className={`${inputClass} min-h-20 resize-none`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="danger" fullWidth loading={busy}>
          Reject request
        </Button>
      </form>
    </Sheet>
  );
}
