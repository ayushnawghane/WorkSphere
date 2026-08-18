"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { cn, WEEKDAY_LABELS } from "@/lib/utils";
import type { Branch } from "@/lib/database.types";

export interface BranchFormValues {
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: string;
  working_days: number[];
  work_start_time: string;
  work_end_time: string;
}

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6]; // Mon-Sat

/** "09:30:00" (DB) <-> "09:30" (<input type="time">) */
const toTimeInput = (t: string) => t.slice(0, 5);
const toDbTime = (t: string) => `${t}:00`;

export function BranchForm({
  initial,
  submitting,
  onSubmit,
}: {
  initial?: Branch | null;
  submitting: boolean;
  onSubmit: (values: BranchFormValues) => void;
}) {
  const [values, setValues] = useState<BranchFormValues>({
    name: initial?.name ?? "",
    latitude: initial ? String(initial.latitude) : "",
    longitude: initial ? String(initial.longitude) : "",
    radius_meters: initial ? String(initial.radius_meters) : "150",
    working_days: initial?.working_days ?? DEFAULT_WORKING_DAYS,
    work_start_time: initial ? toTimeInput(initial.work_start_time) : "09:30",
    work_end_time: initial ? toTimeInput(initial.work_end_time) : "18:30",
  });

  const set =
    (key: "name" | "latitude" | "longitude" | "radius_meters") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  const toggleDay = (day: number) => {
    setValues((v) => ({
      ...v,
      working_days: v.working_days.includes(day)
        ? v.working_days.filter((d) => d !== day)
        : [...v.working_days, day].sort((a, b) => a - b),
    }));
  };

  const hasCoords = values.latitude !== "" && values.longitude !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="flex flex-col gap-3"
    >
      <Field label="Branch name">
        <input className={inputClass} value={values.name} onChange={set("name")} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude">
          <input
            className={inputClass}
            type="number"
            step="any"
            value={values.latitude}
            onChange={set("latitude")}
            required
          />
        </Field>
        <Field label="Longitude">
          <input
            className={inputClass}
            type="number"
            step="any"
            value={values.longitude}
            onChange={set("longitude")}
            required
          />
        </Field>
      </div>
      <Field label="Geofence radius (meters)">
        <input
          className={inputClass}
          type="number"
          min="10"
          value={values.radius_meters}
          onChange={set("radius_meters")}
          required
        />
      </Field>

      {hasCoords && (
        <a
          href={`https://www.google.com/maps?q=${values.latitude},${values.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-300"
        >
          <MapPin className="size-3.5" /> View on map
        </a>
      )}

      <Field label="Working days">
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                values.working_days.includes(day)
                  ? "bg-brand-600 text-white"
                  : "bg-black/5 text-slate-500 dark:bg-white/10 dark:text-slate-400"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start time">
          <input
            className={inputClass}
            type="time"
            value={values.work_start_time}
            onChange={(e) => setValues((v) => ({ ...v, work_start_time: e.target.value }))}
            required
          />
        </Field>
        <Field label="End time">
          <input
            className={inputClass}
            type="time"
            value={values.work_end_time}
            onChange={(e) => setValues((v) => ({ ...v, work_end_time: e.target.value }))}
            required
          />
        </Field>
      </div>

      <Button type="submit" fullWidth loading={submitting} className="mt-2">
        {initial ? "Save changes" : "Add branch"}
      </Button>
    </form>
  );
}

export { toDbTime };
