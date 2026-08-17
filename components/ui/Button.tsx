"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-soft hover:bg-brand-700 disabled:bg-brand-300",
  secondary:
    "bg-white dark:bg-white/10 text-brand-700 dark:text-brand-200 border border-black/10 dark:border-white/10 hover:bg-brand-50 dark:hover:bg-white/15",
  ghost:
    "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", loading, fullWidth, children, disabled, ...props },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
          variantClasses[variant],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
