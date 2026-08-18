import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

type RequireAdminResult =
  | { ok: true; userId: string; profile: Profile }
  | { ok: false; response: NextResponse };

/**
 * Call at the top of every app/api/admin/** route handler. The RLS
 * policies in db/006_admin.sql are a backstop — this is the real access
 * boundary, same as the session check in app/api/attendance/punch/route.ts.
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ msg: "Not authenticated" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ msg: "Admin access required" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id, profile };
}
