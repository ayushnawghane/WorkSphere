import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client. Bypasses RLS entirely — only ever import this inside
 * app/api/** route handlers, after the caller's session has already been
 * verified with the session-scoped server client. Never expose to the
 * client bundle.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

const PAGE_SIZE = 1000;

/**
 * Pages through a 1-indexed, `perPage`-capped listing (Supabase's
 * `auth.admin.listUsers`, or a PostgREST `.range()` query) until a page
 * comes back short, collecting every row. Both call sites cap at 1000 rows
 * per request — without this loop, anything past the first page/1000 rows
 * is silently dropped rather than erroring.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<T[]>
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const rows = await fetchPage(page, PAGE_SIZE);
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    page += 1;
  }

  return all;
}
