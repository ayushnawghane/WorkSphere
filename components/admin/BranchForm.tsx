"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Branch } from "@/lib/database.types";

export interface BranchFormValues {
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: string;
}

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
  });

  const set = (key: keyof BranchFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

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

      <Button type="submit" fullWidth loading={submitting} className="mt-2">
        {initial ? "Save changes" : "Add branch"}
      </Button>
    </form>
  );
}
