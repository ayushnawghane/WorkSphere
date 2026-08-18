"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, MapPin, Ban, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { BranchForm, toDbTime, type BranchFormValues } from "@/components/admin/BranchForm";
import { formatTimeOfDay, formatWorkingDays } from "@/lib/utils";
import type { Branch } from "@/lib/database.types";

export default function AdminBranchesPage() {
  const { show } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchBranches = async () => {
    const res = await fetch("/api/admin/branches");
    const data = await res.json();
    setBranches(data.branches ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setSheetOpen(true);
  };

  const submit = async (values: BranchFormValues) => {
    setSubmitting(true);
    const payload = {
      name: values.name,
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      radius_meters: Number(values.radius_meters),
      working_days: values.working_days,
      work_start_time: toDbTime(values.work_start_time),
      work_end_time: toDbTime(values.work_end_time),
    };
    const res = await fetch(editing ? `/api/admin/branches/${editing.id}` : "/api/admin/branches", {
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
    show(editing ? "Branch updated" : "Branch added", "success");
    setSheetOpen(false);
    fetchBranches();
  };

  const toggleActive = async (branch: Branch) => {
    const nextActive = !branch.is_active;
    if (!confirm(`${nextActive ? "Reactivate" : "Deactivate"} "${branch.name}"?`)) return;

    const res = await fetch(`/api/admin/branches/${branch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: nextActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show(nextActive ? "Branch reactivated" : "Branch deactivated", "success");
    fetchBranches();
  };

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Branches</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="size-3.5" /> Add branch
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
        ) : branches.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">No branches yet.</p>
        ) : (
          branches.map((branch) => (
            <motion.div key={branch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => openEdit(branch)} className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text)]">{branch.name}</p>
                      {!branch.is_active && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <MapPin className="size-3" />
                      {branch.latitude.toFixed(5)}, {branch.longitude.toFixed(5)} · {branch.radius_meters}m radius
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {formatWorkingDays(branch.working_days)} · {formatTimeOfDay(branch.work_start_time)}–
                      {formatTimeOfDay(branch.work_end_time)}
                    </p>
                  </button>
                  <button
                    onClick={() => toggleActive(branch)}
                    className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10"
                    aria-label={branch.is_active ? "Deactivate" : "Reactivate"}
                  >
                    {branch.is_active ? <Ban className="size-4" /> : <RotateCcw className="size-4" />}
                  </button>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Sheet open={sheetOpen} title={editing ? "Edit branch" : "Add branch"} onClose={() => setSheetOpen(false)}>
        <BranchForm initial={editing} submitting={submitting} onSubmit={submit} />
      </Sheet>
    </div>
  );
}
