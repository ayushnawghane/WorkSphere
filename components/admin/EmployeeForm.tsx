"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Branch } from "@/lib/database.types";

export interface EmployeeWithEmail {
  id: string;
  email: string | null;
  employee_code: string;
  full_name: string;
  phone: string | null;
  branch_id: string | null;
  role: "employee" | "admin";
  punch_type: "app" | "selfie";
  location_required: boolean;
  is_active: boolean;
}

export interface EmployeeFormValues {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  employee_code: string;
  branch_id: string;
  role: "employee" | "admin";
  punch_type: "app" | "selfie";
  location_required: boolean;
}

export function EmployeeForm({
  initial,
  branches,
  submitting,
  onSubmit,
}: {
  initial?: EmployeeWithEmail | null;
  branches: Branch[];
  submitting: boolean;
  onSubmit: (values: EmployeeFormValues) => void;
}) {
  const [values, setValues] = useState<EmployeeFormValues>({
    email: initial?.email ?? "",
    password: "",
    full_name: initial?.full_name ?? "",
    phone: initial?.phone ?? "",
    employee_code: initial?.employee_code ?? "",
    branch_id: initial?.branch_id ?? "",
    role: initial?.role ?? "employee",
    punch_type: initial?.punch_type ?? "app",
    location_required: initial?.location_required ?? true,
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
      {!isEdit && (
        <>
          <Field label="Email">
            <input
              className={inputClass}
              type="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              required
            />
          </Field>
          <Field label="Temporary password">
            <input
              className={inputClass}
              type="text"
              minLength={6}
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              required
            />
          </Field>
        </>
      )}

      <Field label="Full name">
        <input
          className={inputClass}
          value={values.full_name}
          onChange={(e) => setValues((v) => ({ ...v, full_name: e.target.value }))}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <input
            className={inputClass}
            type="tel"
            value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
          />
        </Field>
        <Field label="Employee code">
          <input
            className={inputClass}
            value={values.employee_code}
            onChange={(e) => setValues((v) => ({ ...v, employee_code: e.target.value }))}
            required
          />
        </Field>
      </div>

      <Field label="Branch">
        <select
          className={inputClass}
          value={values.branch_id}
          onChange={(e) => setValues((v) => ({ ...v, branch_id: e.target.value }))}
        >
          <option value="">No branch</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <select
            className={inputClass}
            value={values.role}
            onChange={(e) => setValues((v) => ({ ...v, role: e.target.value as "employee" | "admin" }))}
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Punch-in type">
          <select
            className={inputClass}
            value={values.punch_type}
            onChange={(e) => setValues((v) => ({ ...v, punch_type: e.target.value as "app" | "selfie" }))}
          >
            <option value="app">App (one tap)</option>
            <option value="selfie">Selfie</option>
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text)]">
        <input
          type="checkbox"
          checked={values.location_required}
          onChange={(e) => setValues((v) => ({ ...v, location_required: e.target.checked }))}
          className="size-4 rounded accent-brand-600"
        />
        Require being at the branch to punch in/out
      </label>

      <Button type="submit" fullWidth loading={submitting} className="mt-2">
        {isEdit ? "Save changes" : "Add employee"}
      </Button>
    </form>
  );
}
