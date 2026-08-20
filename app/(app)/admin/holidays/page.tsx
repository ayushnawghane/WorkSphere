"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { HolidayForm, type HolidayFormValues } from "@/components/admin/HolidayForm";
import { formatDate, formatWeekday } from "@/lib/utils";
import type { Branch, Holiday } from "@/lib/database.types";

const now = new Date();
const YEAR_OPTIONS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

export default function AdminHolidaysPage() {
  const { show } = useToast();
  const [year, setYear] = useState(now.getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

  const fetchAll = async () => {
    setLoading(true);
    const [holidayRes, branchRes] = await Promise.all([
      fetch(`/api/admin/holidays?year=${year}`),
      fetch("/api/admin/branches"),
    ]);
    const holidayData = await holidayRes.json();
    const branchData = await branchRes.json();
    setHolidays(holidayData.holidays ?? []);
    setBranches(branchData.branches ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (holiday: Holiday) => {
    setEditing(holiday);
    setSheetOpen(true);
  };

  const submit = async (values: HolidayFormValues) => {
    setSubmitting(true);
    const payload = { name: values.name, date: values.date, branch_id: values.branch_id || null };
    const res = await fetch(editing ? `/api/admin/holidays/${editing.id}` : "/api/admin/holidays", {
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
    show(editing ? "Holiday updated" : "Holiday added", "success");
    setSheetOpen(false);
    fetchAll();
  };

  const remove = async (holiday: Holiday) => {
    if (!confirm(`Delete "${holiday.name}"?`)) return;
    const res = await fetch(`/api/admin/holidays/${holiday.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show("Holiday deleted", "success");
    fetchAll();
  };

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Holidays</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="size-3.5" /> Add holiday
        </button>
      </div>

      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="w-28 rounded-xl border border-black/10 bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text)] outline-none focus:border-brand-500 dark:border-white/10"
      >
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
        ) : holidays.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarDays className="size-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-[var(--text-muted)]">No holidays added for {year}.</p>
          </div>
        ) : (
          holidays.map((holiday) => (
            <motion.div key={holiday.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="flex items-center justify-between gap-3 p-4">
                <button onClick={() => openEdit(holiday)} className="flex-1 text-left">
                  <p className="text-sm font-semibold text-[var(--text)]">{holiday.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {formatWeekday(holiday.date + "T00:00:00")}, {formatDate(holiday.date + "T00:00:00")} ·{" "}
                    {holiday.branch_id ? branchNameById.get(holiday.branch_id) ?? "Unknown branch" : "All branches"}
                  </p>
                </button>
                <button
                  onClick={() => remove(holiday)}
                  className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  aria-label="Delete holiday"
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Sheet open={sheetOpen} title={editing ? "Edit holiday" : "Add holiday"} onClose={() => setSheetOpen(false)}>
        <HolidayForm initial={editing} branches={branches} submitting={submitting} onSubmit={submit} />
      </Sheet>
    </div>
  );
}
