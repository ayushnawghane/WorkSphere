"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, History, CalendarOff, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/history", label: "History", icon: History },
  { href: "/leave", label: "Leave", icon: CalendarOff },
  { href: "/profile", label: "Profile", icon: User },
];

const ADMIN_ITEM = { href: "/admin", label: "Admin", icon: ShieldCheck };

export function BottomNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/attendance/today")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(data?.profile?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-[var(--bg-elevated)]/90 backdrop-blur-lg dark:border-white/[0.06]">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-medium"
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-brand-50 dark:bg-brand-500/15"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={cn(
                  "relative size-5",
                  active
                    ? "text-brand-600 dark:text-brand-300"
                    : "text-slate-400 dark:text-slate-500"
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cn(
                  "relative",
                  active
                    ? "text-brand-600 dark:text-brand-300"
                    : "text-slate-400 dark:text-slate-500"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
