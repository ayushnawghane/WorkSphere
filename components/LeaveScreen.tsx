"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, X, CalendarOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { leaveRequestDayCount } from "@/lib/leave";
import type { LeaveRequest, LeaveType } from "@/lib/database.types";

const STATUS_BADGE: Record<LeaveRequest["status"], string> = {
  pending: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  approved: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  rejected: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

export function LeaveScreen() {
  const router = useRouter();
  const { show } = useToast();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [usedByType, setUsedByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const leaveTypeById = new Map(leaveTypes.map((lt) => [lt.id, lt]));

  const fetchAll = async () => {
    const res = await fetch("/api/leave");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    const data = await res.json();
    setLeaveTypes(data.leaveTypes ?? []);
    setRequests(data.requests ?? []);
    setUsedByType(data.usedByType ?? {});
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (values: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    is_half_day: boolean;
    reason: string;
  }) => {
    setSubmitting(true);
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show("Leave request submitted", "success");
    setSheetOpen(false);
    fetchAll();
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this leave request?")) return;
    setCancellingId(id);
    const res = await fetch(`/api/leave/${id}`, { method: "DELETE" });
    const data = await res.json();
    setCancellingId(null);
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show("Leave request cancelled", "success");
    fetchAll();
  };

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Leave</h1>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="size-3.5" /> Apply
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : leaveTypes.length > 0 ? (
        <Card className="flex flex-wrap gap-x-5 gap-y-2 p-4">
          {leaveTypes.map((lt) => (
            <div key={lt.id} className="flex items-center gap-1.5 text-xs">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: lt.color }} />
              <span className="text-[var(--text-muted)]">{lt.name}</span>
              <span className="font-semibold text-[var(--text)]">
                {usedByType[lt.id] ?? 0}
                {lt.annual_quota != null ? ` / ${lt.annual_quota}` : ""}
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarOff className="size-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-[var(--text-muted)]">No leave requests yet.</p>
          </div>
        ) : (
          requests.map((req) => (
            <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="flex flex-col gap-1.5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {leaveTypeById.get(req.leave_type_id)?.name ?? "Leave"}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[req.status]}`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {req.start_date === req.end_date
                    ? formatDate(req.start_date + "T00:00:00")
                    : `${formatDate(req.start_date + "T00:00:00")} – ${formatDate(req.end_date + "T00:00:00")}`}
                  {req.is_half_day ? " (half day)" : ""}
                  {" · "}
                  {leaveRequestDayCount(req)} day{leaveRequestDayCount(req) === 1 ? "" : "s"}
                </p>
                {req.reason && <p className="text-xs text-[var(--text-muted)]">&ldquo;{req.reason}&rdquo;</p>}
                {req.review_note && (
                  <p className="text-xs text-[var(--text-muted)]">Note: &ldquo;{req.review_note}&rdquo;</p>
                )}
                {req.status === "pending" && (
                  <button
                    onClick={() => cancel(req.id)}
                    disabled={cancellingId === req.id}
                    className="mt-1 flex w-fit items-center gap-1 text-xs font-medium text-rose-600 disabled:opacity-50 dark:text-rose-400"
                  >
                    <X className="size-3.5" /> Cancel request
                  </button>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Sheet open={sheetOpen} title="Apply for leave" onClose={() => setSheetOpen(false)}>
        <LeaveRequestForm leaveTypes={leaveTypes} submitting={submitting} onSubmit={submit} />
      </Sheet>
    </div>
  );
}

function LeaveRequestForm({
  leaveTypes,
  submitting,
  onSubmit,
}: {
  leaveTypes: LeaveType[];
  submitting: boolean;
  onSubmit: (values: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    is_half_day: boolean;
    reason: string;
  }) => void;
}) {
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState("");

  const singleDay = startDate !== "" && startDate === endDate;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          leave_type_id: leaveTypeId,
          start_date: startDate,
          end_date: endDate,
          is_half_day: singleDay && isHalfDay,
          reason,
        });
      }}
      className="flex flex-col gap-3"
    >
      <Field label="Leave type">
        <select
          className={inputClass}
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          required
        >
          <option value="" disabled>
            Select a leave type
          </option>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name} {lt.is_paid ? "" : "(Unpaid)"}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input
            className={inputClass}
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (!endDate || e.target.value > endDate) setEndDate(e.target.value);
            }}
            required
          />
        </Field>
        <Field label="End date">
          <input
            className={inputClass}
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </Field>
      </div>

      {singleDay && (
        <label className="flex items-center gap-2 text-sm text-[var(--text)]">
          <input
            type="checkbox"
            checked={isHalfDay}
            onChange={(e) => setIsHalfDay(e.target.checked)}
            className="size-4 rounded accent-brand-600"
          />
          Half day
        </label>
      )}

      <Field label="Reason (optional)">
        <textarea
          className={`${inputClass} min-h-20 resize-none`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>

      <Button type="submit" fullWidth loading={submitting} disabled={!leaveTypeId} className="mt-2">
        Submit request
      </Button>
    </form>
  );
}
