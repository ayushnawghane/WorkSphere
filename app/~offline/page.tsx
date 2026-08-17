import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg)] px-6 text-center">
      <WifiOff className="size-10 text-slate-400" />
      <h1 className="text-lg font-semibold text-[var(--text)]">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-[var(--text-muted)]">
        Punching in/out needs a connection to verify your location. Reconnect and try again.
      </p>
    </div>
  );
}
