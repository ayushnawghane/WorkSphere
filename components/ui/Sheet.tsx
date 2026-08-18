"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Generic bottom-sheet modal, extracted from the pattern in
 * CameraCapture.tsx (same backdrop/slide-up/safe-bottom treatment) so admin
 * forms don't duplicate that boilerplate. CameraCapture keeps its own
 * inline implementation — its camera-preview states don't map cleanly onto
 * this generic shell.
 */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="safe-bottom max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-[var(--bg-elevated)] p-5 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
