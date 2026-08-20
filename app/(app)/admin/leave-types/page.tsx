"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Ban, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { LeaveTypeForm, type LeaveTypeFormValues } from "@/components/admin/LeaveTypeForm";
import type { LeaveType } from "@/lib/database.types";

export default function AdminLeaveTypesPage() {
  const { show } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    const res = await fetch("/api/admin/leave-types");
    const data = await res.json();
    setLeaveTypes(data.leaveTypes ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (leaveType: LeaveType) => {
    setEditing(leaveType);
    setSheetOpen(true);
  };

  const submit = async (values: LeaveTypeFormValues) => {
    setSubmitting(true);
    const payload = {
      name: values.name,
      is_paid: values.is_paid,
      annual_quota: values.annual_quota === "" ? null : Number(values.annual_quota),
      color: values.color,
      ...(editing ? { is_active: values.is_active } : {}),
    };
    const res = await fetch(editing ? `/api/admin/leave-types/${editing.id}` : "/api/admin/leave-types", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show(editing ? "Leave type updated" : "Leave type added", "success");
    setSheetOpen(false);
    fetchAll();
  };

  const toggleActive = async (leaveType: LeaveType) => {
    const nextActive = !leaveType.is_active;
    if (!confirm(`${nextActive ? "Reactivate" : "Deactivate"} "${leaveType.name}"?`)) return;

    const res = await fetch(`/api/admin/leave-types/${leaveType.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: nextActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show(nextActive ? "Leave type reactivated" : "Leave type deactivated", "success");
    fetchAll();
  };

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Leave Types</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="size-3.5" /> Add leave type
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
        ) : leaveTypes.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">No leave types yet.</p>
        ) : (
          leaveTypes.map((lt) => (
            <motion.div key={lt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="flex items-center justify-between gap-3 p-4">
                <button onClick={() => openEdit(lt)} className="flex flex-1 items-center gap-3 text-left">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: lt.color }} />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-[var(--text)]">{lt.name}</p>
                      {!lt.is_active && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {lt.is_paid ? "Paid" : "Unpaid"}
                      {lt.annual_quota != null ? ` · ${lt.annual_quota} days/year` : ""}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => toggleActive(lt)}
                  className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10"
                  aria-label={lt.is_active ? "Deactivate" : "Reactivate"}
                >
                  {lt.is_active ? <Ban className="size-4" /> : <RotateCcw className="size-4" />}
                </button>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Sheet
        open={sheetOpen}
        title={editing ? "Edit leave type" : "Add leave type"}
        onClose={() => setSheetOpen(false)}
      >
        <LeaveTypeForm initial={editing} submitting={submitting} onSubmit={submit} />
      </Sheet>
    </div>
  );
}
