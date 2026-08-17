import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/[0.06] bg-[var(--bg-elevated)] shadow-card dark:border-white/[0.06]",
        className
      )}
      {...props}
    />
  );
}
