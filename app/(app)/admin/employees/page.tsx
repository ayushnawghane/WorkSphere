"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Ban, RotateCcw, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { EmployeeForm, type EmployeeFormValues, type EmployeeWithEmail } from "@/components/admin/EmployeeForm";
import type { Branch } from "@/lib/database.types";

export default function AdminEmployeesPage() {
  const { show } = useToast();
  const [employees, setEmployees] = useState<EmployeeWithEmail[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeWithEmail | null>(null);
  const [resetTarget, setResetTarget] = useState<EmployeeWithEmail | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    const [empRes, branchRes] = await Promise.all([
      fetch("/api/admin/employees"),
      fetch("/api/admin/branches"),
    ]);
    const empData = await empRes.json();
    const branchData = await branchRes.json();
    setEmployees(empData.employees ?? []);
    setBranches((branchData.branches ?? []).filter((b: Branch) => b.is_active));
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (employee: EmployeeWithEmail) => {
    setEditing(employee);
    setSheetOpen(true);
  };

  const submit = async (values: EmployeeFormValues) => {
    setSubmitting(true);
    const res = await fetch(editing ? `/api/admin/employees/${editing.id}` : "/api/admin/employees", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editing
          ? {
              full_name: values.full_name,
              phone: values.phone,
              employee_code: values.employee_code,
              branch_id: values.branch_id || null,
              role: values.role,
              punch_type: values.punch_type,
              location_required: values.location_required,
            }
          : values
      ),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show(editing ? "Employee updated" : "Employee added", "success");
    setSheetOpen(false);
    fetchAll();
  };

  const toggleActive = async (employee: EmployeeWithEmail) => {
    const nextActive = !employee.is_active;
    if (!confirm(`${nextActive ? "Reactivate" : "Deactivate"} ${employee.full_name}?`)) return;

    const res = nextActive
      ? await fetch(`/api/admin/employees/${employee.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: true }),
        })
      : await fetch(`/api/admin/employees/${employee.id}`, { method: "DELETE" });

    const data = await res.json();
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show(nextActive ? "Employee reactivated" : "Employee deactivated", "success");
    fetchAll();
  };

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">Employees</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          <Plus className="size-3.5" /> Add employee
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
        ) : employees.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">No employees yet.</p>
        ) : (
          employees.map((employee) => (
            <motion.div key={employee.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => openEdit(employee)} className="flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-[var(--text)]">{employee.full_name}</p>
                      {employee.role === "admin" && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                          Admin
                        </span>
                      )}
                      {!employee.is_active && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {employee.employee_code} · {employee.email}
                      {employee.phone ? ` · ${employee.phone}` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setResetTarget(employee)}
                      className="rounded-full p-2 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10"
                      aria-label="Reset password"
                    >
                      <KeyRound className="size-4" />
                    </button>
                    <button
                      onClick={() => toggleActive(employee)}
                      className="rounded-full p-2 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10"
                      aria-label={employee.is_active ? "Deactivate" : "Reactivate"}
                    >
                      {employee.is_active ? <Ban className="size-4" /> : <RotateCcw className="size-4" />}
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Sheet
        open={sheetOpen}
        title={editing ? "Edit employee" : "Add employee"}
        onClose={() => setSheetOpen(false)}
      >
        <EmployeeForm initial={editing} branches={branches} submitting={submitting} onSubmit={submit} />
      </Sheet>

      <ResetPasswordSheet target={resetTarget} onClose={() => setResetTarget(null)} />
    </div>
  );
}

function ResetPasswordSheet({
  target,
  onClose,
}: {
  target: EmployeeWithEmail | null;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSubmitting(true);
    const res = await fetch(`/api/admin/employees/${target.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      show(data.msg || "Something went wrong.", "error");
      return;
    }
    show(`Password updated for ${target.full_name}`, "success");
    setPassword("");
    onClose();
  };

  return (
    <Sheet open={Boolean(target)} title={`Reset password — ${target?.full_name ?? ""}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="New temporary password">
          <input
            className={inputClass}
            type="text"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" fullWidth loading={submitting}>
          Set password
        </Button>
      </form>
    </Sheet>
  );
}
