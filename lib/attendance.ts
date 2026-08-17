import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attendance, Database } from "@/lib/database.types";

const PHOTO_BUCKET = "punch-photos";
const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * `attendance.punch_in_photo_url` / `punch_out_photo_url` store the storage
 * *path* (e.g. "{user_id}/2026-08-16-in.jpg"), not a public URL — the bucket
 * is private. Resolve them to short-lived signed URLs right before sending
 * a row to the client.
 */
export async function withSignedPhotoUrls(
  supabase: SupabaseClient<Database>,
  row: Attendance
): Promise<Attendance> {
  const paths = [row.punch_in_photo_url, row.punch_out_photo_url].filter(
    (p): p is string => Boolean(p)
  );

  if (paths.length === 0) return row;

  const { data } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  const urlByPath = new Map(
    (data ?? []).map((d) => [d.path, d.signedUrl] as const)
  );

  return {
    ...row,
    punch_in_photo_url: row.punch_in_photo_url
      ? urlByPath.get(row.punch_in_photo_url) ?? null
      : null,
    punch_out_photo_url: row.punch_out_photo_url
      ? urlByPath.get(row.punch_out_photo_url) ?? null
      : null,
  };
}

export { PHOTO_BUCKET };
