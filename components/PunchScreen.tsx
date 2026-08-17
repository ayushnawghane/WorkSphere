"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, LogOut, CheckCircle2, MapPin, Loader2 } from "lucide-react";
import { CameraCapture } from "@/components/CameraCapture";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getCurrentPosition, type Coords } from "@/lib/geo";
import { formatTime } from "@/lib/utils";
import type { Attendance, Branch, Profile } from "@/lib/database.types";

export function PunchScreen() {
  const router = useRouter();
  const { show } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);

  const [now, setNow] = useState(new Date());
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<Coords | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchToday = async () => {
    const res = await fetch("/api/attendance/today");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    const data = await res.json();
    setProfile(data.profile ?? null);
    setBranch(data.branch ?? null);
    setAttendance(data.attendance ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const punchedInOnly = Boolean(attendance?.punch_in && !attendance?.punch_out);
  const doneForToday = Boolean(attendance?.punch_in && attendance?.punch_out);

  const buttonLabel = doneForToday ? "Done for today" : punchedInOnly ? "Punch Out" : "Punch In";
  const busy = locating || submitting;

  const elapsed = useMemo(() => {
    if (!punchedInOnly || !attendance?.punch_in) return null;
    const ms = now.getTime() - new Date(attendance.punch_in).getTime();
    if (ms <= 0) return "0h 00m 00s";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }, [now, punchedInOnly, attendance?.punch_in]);

  const startPunch = async () => {
    if (doneForToday || busy) return;
    setLocating(true);
    try {
      const coords = await getCurrentPosition();
      setPendingCoords(coords);
      setCameraOpen(true);
    } catch (err) {
      show(err instanceof Error ? err.message : "Couldn't get your location.", "error");
    } finally {
      setLocating(false);
    }
  };

  const submitPunch = async (photo?: File) => {
    if (!pendingCoords) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("lat", String(pendingCoords.lat));
      formData.append("lng", String(pendingCoords.lng));
      if (photo) formData.append("photo", photo);

      const res = await fetch("/api/attendance/punch", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        show(data.msg || "Something went wrong.", "error");
      } else {
        show(data.msg, "success");
        setAttendance(data.attendance);
      }
    } catch {
      show("Network error — please try again.", "error");
    } finally {
      setSubmitting(false);
      setCameraOpen(false);
      setPendingCoords(null);
    }
  };

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-6 px-5 pt-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {loading ? (
          <Skeleton className="h-8 w-48" />
        ) : (
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {greeting}, {firstName || "there"}
          </h1>
        )}
        {branch && (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <MapPin className="size-3.5" />
            {branch.name}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-center"
      >
        <p className="text-4xl font-bold tracking-tight text-brand-700 dark:text-brand-300">
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "2-digit", year: "numeric" })}
        </p>
      </motion.div>

      <div className="flex flex-col items-center gap-4 py-2">
        <div className="relative flex size-48 items-center justify-center">
          {!doneForToday && (
            <span
              className={`absolute inset-0 rounded-full ${
                punchedInOnly ? "bg-rose-500/15" : "bg-brand-500/15"
              } animate-pulse-ring`}
            />
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startPunch}
            disabled={doneForToday || busy || loading}
            className={`relative z-10 flex size-44 flex-col items-center justify-center gap-2 rounded-full border-4 text-sm font-semibold shadow-card transition-colors disabled:cursor-not-allowed ${
              doneForToday
                ? "border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                : punchedInOnly
                  ? "border-rose-400 bg-white text-rose-600 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-500/10"
                  : "border-brand-400 bg-white text-brand-700 hover:bg-brand-50 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
            }`}
          >
            {busy ? (
              <Loader2 className="size-9 animate-spin" />
            ) : doneForToday ? (
              <CheckCircle2 className="size-9" />
            ) : punchedInOnly ? (
              <LogOut className="size-9" />
            ) : (
              <LogIn className="size-9" />
            )}
            <span>{busy ? "Please wait…" : buttonLabel}</span>
          </motion.button>
        </div>

        {elapsed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-sm text-[var(--text-muted)]"
          >
            On the clock for {elapsed}
          </motion.p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center gap-1 py-4">
          <LogIn className="size-4 text-brand-600 dark:text-brand-300" />
          <p className="text-lg font-semibold text-[var(--text)]">
            {loading ? <Skeleton className="h-5 w-16" /> : formatTime(attendance?.punch_in ?? null)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Punch In</p>
        </Card>
        <Card className="flex flex-col items-center gap-1 py-4">
          <LogOut className="size-4 text-brand-600 dark:text-brand-300" />
          <p className="text-lg font-semibold text-[var(--text)]">
            {loading ? <Skeleton className="h-5 w-16" /> : formatTime(attendance?.punch_out ?? null)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">Punch Out</p>
        </Card>
      </div>

      <CameraCapture
        open={cameraOpen}
        title={punchedInOnly ? "Punch out selfie" : "Punch in selfie"}
        onCapture={(file) => submitPunch(file)}
        onSkip={() => submitPunch()}
        onClose={() => {
          setCameraOpen(false);
          setPendingCoords(null);
        }}
      />
    </div>
  );
}
