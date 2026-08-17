import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { distanceInMeters } from "@/lib/geo";
import { todayLocalDate } from "@/lib/utils";
import { PHOTO_BUCKET, withSignedPhotoUrls } from "@/lib/attendance";
import type { Json } from "@/lib/database.types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ msg: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    return NextResponse.json(
      { msg: "Employee not found or inactive" },
      { status: 422 }
    );
  }

  const formData = await request.formData();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const photo = formData.get("photo");

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { msg: "Location is required to punch in/out" },
      { status: 422 }
    );
  }

  let branch = null;
  if (profile.branch_id) {
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("id", profile.branch_id)
      .maybeSingle();
    branch = data;
  }

  if (profile.location_required) {
    if (!branch) {
      return NextResponse.json(
        { msg: "No branch assigned — contact HR" },
        { status: 422 }
      );
    }
    const distance = distanceInMeters(branch.latitude, branch.longitude, lat, lng);
    if (distance > branch.radius_meters) {
      return NextResponse.json(
        {
          msg: `You are ${Math.round(distance)}m away from ${branch.name} — move within ${branch.radius_meters}m to punch.`,
        },
        { status: 422 }
      );
    }
  }

  // Everything past this point is the authoritative write path — uses the
  // service-role client so the geofence/time checks above can't be bypassed
  // by a client that skips straight to a direct table write.
  const admin = createAdminClient();
  const attendance_date = todayLocalDate();

  const { data: existing } = await admin
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .eq("attendance_date", attendance_date)
    .maybeSingle();

  if (existing?.punch_in && existing?.punch_out) {
    return NextResponse.json(
      { msg: "You have already punched out today" },
      { status: 409 }
    );
  }

  const direction: "in" | "out" = existing?.punch_in ? "out" : "in";
  const nowIso = new Date().toISOString();

  let photoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    photoPath = `${user.id}/${attendance_date}-${direction}.jpg`;
    const { error: uploadError } = await admin.storage
      .from(PHOTO_BUCKET)
      .upload(photoPath, photo, {
        contentType: photo.type || "image/jpeg",
        upsert: true,
      });
    if (uploadError) {
      return NextResponse.json({ msg: "Failed to upload photo" }, { status: 500 });
    }
  }

  const existingLog: Json[] = Array.isArray(existing?.log_data)
    ? (existing!.log_data as Json[])
    : [];
  const log_data = [...existingLog, { ts: nowIso, lat, lng, direction }] as Json;

  const { data: saved, error: saveError } =
    direction === "in"
      ? await admin
          .from("attendance")
          .insert({
            user_id: user.id,
            branch_id: profile.branch_id,
            attendance_date,
            punch_in: nowIso,
            punch_in_lat: lat,
            punch_in_lng: lng,
            punch_in_photo_url: photoPath,
            log_data,
          })
          .select("*")
          .single()
      : await admin
          .from("attendance")
          .update({
            punch_out: nowIso,
            punch_out_lat: lat,
            punch_out_lng: lng,
            punch_out_photo_url: photoPath,
            log_data,
          })
          .eq("id", existing!.id)
          .select("*")
          .single();

  if (saveError || !saved) {
    return NextResponse.json({ msg: "Could not save attendance" }, { status: 500 });
  }

  return NextResponse.json({
    msg: direction === "in" ? "Punched in successfully" : "Punched out successfully",
    attendance: await withSignedPhotoUrls(supabase, saved),
  });
}
