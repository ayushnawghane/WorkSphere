"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function recentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const elapsedDays = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's non-standard flag for "already added to home screen"
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone || recentlyDismissed()) return;

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = /safari/i.test(window.navigator.userAgent) && !/crios|fxios/i.test(window.navigator.userAgent);
    if (isIos && isSafari) {
      setShowIosHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDeferredPrompt(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const visible = Boolean(deferredPrompt) || showIosHint;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed inset-x-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-black/[0.06] bg-[var(--bg-elevated)] p-3.5 shadow-card dark:border-white/[0.08]"
          style={{ bottom: "calc(var(--safe-bottom) + 88px)" }}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            {showIosHint ? <Share className="size-5" /> : <Download className="size-5" />}
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text)]">Install WorkSphere</p>
            <p className="text-xs text-[var(--text-muted)]">
              {showIosHint
                ? "Tap the Share icon, then “Add to Home Screen”"
                : "Add it to your home screen for one-tap punch in/out"}
            </p>
          </div>

          {!showIosHint && (
            <Button onClick={install} className="shrink-0 px-3 py-1.5 text-xs">
              Install
            </Button>
          )}
          <button
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
