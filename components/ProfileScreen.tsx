"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, MapPinned, LogOut, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import type { Branch, Profile } from "@/lib/database.types";

export function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/attendance/today");
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      setProfile(data.profile ?? null);
      setBranch(data.branch ?? null);
      setLoading(false);
    })();
  }, [router]);

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const initials = profile?.full_name
    ?.split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <h1 className="text-2xl font-bold text-[var(--text)]">Profile</h1>

      <Card className="flex flex-col items-center gap-3 p-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
          {loading ? <Skeleton className="size-16 rounded-full" /> : initials || <User className="size-7" />}
        </div>
        {loading ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <div className="text-center">
            <p className="font-semibold text-[var(--text)]">{profile?.full_name}</p>
            <p className="text-xs text-[var(--text-muted)]">{profile?.employee_code}</p>
          </div>
        )}
      </Card>

      <Card className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
        <InfoRow icon={Building2} label="Branch" value={loading ? undefined : branch?.name ?? "Not assigned"} />
        <InfoRow
          icon={MapPinned}
          label="Location check"
          value={loading ? undefined : profile?.location_required ? "Required" : "Not required"}
        />
        <InfoRow
          icon={BadgeCheck}
          label="Status"
          value={loading ? undefined : profile?.is_active ? "Active" : "Inactive"}
        />
      </Card>

      <Button variant="secondary" fullWidth loading={signingOut} onClick={signOut}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Icon className="size-4" />
        {label}
      </div>
      {value === undefined ? (
        <Skeleton className="h-4 w-20" />
      ) : (
        <span className="text-sm font-medium text-[var(--text)]">{value}</span>
      )}
    </div>
  );
}
