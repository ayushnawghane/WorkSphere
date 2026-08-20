"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { LeaveType } from "@/lib/database.types";

export interface LeaveTypeFormValues {
  name: string;
  is_paid: boolean;
  annual_quota: string;
  color: string;
  is_active: boolean;
}

const COLOR_PRESETS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function LeaveTypeForm({
  initial,
  submitting,
  onSubmit,
}: {
  initial?: LeaveType | null;
  submitting: boolean;
  onSubmit: (values: LeaveTypeFormValues) => void;
}) {
  const [values, setValues] = useState<LeaveTypeFormValues>({
    name: initial?.name ?? "",
    is_paid: initial?.is_paid ?? true,
    annual_quota: initial?.annual_quota != null ? String(initial.annual_quota) : "",
    color: initial?.color ?? COLOR_PRESETS[0],
    is_active: initial?.is_active ?? true,
  });

  const isEdit = Boolean(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="flex flex-col gap-3"
    >
      <Field label="Leave type name">
        <input
          className={inputClass}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Casual Leave"
          required
        />
      </Field>

      <Field label="Annual quota (days, optional — informational only)">
        <input
          className={inputClass}
          type="number"
          min="0"
          value={values.annual_quota}
          onChange={(e) => setValues((v) => ({ ...v, annual_quota: e.target.value }))}
          placeholder="No limit"
        />
      </Field>

      <Field label="Color">
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValues((v) => ({ ...v, color: c }))}
              className={`size-7 rounded-full border-2 ${
                values.color === c ? "border-[var(--text)]" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm text-[var(--text)]">
        <input
          type="checkbox"
          checked={values.is_paid}
          onChange={(e) => setValues((v) => ({ ...v, is_paid: e.target.checked }))}
          className="size-4 rounded accent-brand-600"
        />
        Paid leave
      </label>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm text-[var(--text)]">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
            className="size-4 rounded accent-brand-600"
          />
          Active (visible to employees when applying)
        </label>
      )}

      <Button type="submit" fullWidth loading={submitting} className="mt-2">
        {isEdit ? "Save changes" : "Add leave type"}
      </Button>
    </form>
  );
}
