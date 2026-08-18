import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-black/10 bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}
