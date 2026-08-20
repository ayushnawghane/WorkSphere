"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Branch, Holiday } from "@/lib/database.types";

export interface HolidayFormValues {
  name: string;
  date: string;
  branch_id: string;
}

export function HolidayForm({
  initial,
  branches,
  submitting,
  onSubmit,
}: {
  initial?: Holiday | null;
  branches: Branch[];
  submitting: boolean;
  onSubmit: (values: HolidayFormValues) => void;
}) {
  const [values, setValues] = useState<HolidayFormValues>({
    name: initial?.name ?? "",
    date: initial?.date ?? "",
    branch_id: initial?.branch_id ?? "",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="flex flex-col gap-3"
    >
      <Field label="Holiday name">
        <input
          className={inputClass}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Diwali"
          required
        />
      </Field>

      <Field label="Date">
        <input
          className={inputClass}
          type="date"
          value={values.date}
          onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
          required
        />
      </Field>

      <Field label="Applies to">
        <select
          className={inputClass}
          value={values.branch_id}
          onChange={(e) => setValues((v) => ({ ...v, branch_id: e.target.value }))}
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      <Button type="submit" fullWidth loading={submitting} className="mt-2">
        {initial ? "Save changes" : "Add holiday"}
      </Button>
    </form>
  );
}
