import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

/**
 * "Clicks" feature — Phase 1 only (schema, storage, create/draft/publish/
 * edit/delete of one's own Click). See migration 059 for the DB side
 * (clicks, click_photos tables, click-photos storage bucket, RLS).
 *
 * Deliberately scoped narrow, matching lib/real-trips.ts's shape: this
 * file owns writes to public.clicks/click_photos and the click-photos
 * storage bucket. Feed reads, likes, comments, follow, and moderation are
 * separate concerns for later phases — not present here.
 */

export type ClickStatus = Database["public"]["Enums"]["click_status"];
export type ClickTripType = Database["public"]["Enums"]["click_trip_type"];
export type ClickRow = Database["public"]["Tables"]["clicks"]["Row"];
export type ClickPhotoRow = Database["public"]["Tables"]["click_photos"]["Row"];

export const CLICK_TRIP_TYPES: { value: ClickTripType; label: string }[] = [
  { value: "backpacking", label: "Backpacking" },
  { value: "trekking", label: "Trekking" },
  { value: "road_trip", label: "Road Trip" },
  { value: "solo", label: "Solo" },
  { value: "friends", label: "Friends" },
  { value: "family", label: "Family" },
  { value: "adventure", label: "Adventure" },
  { value: "weekend", label: "Weekend" },
  { value: "nature", label: "Nature" },
  { value: "beach", label: "Beach" },
  { value: "cultural", label: "Cultural" },
  { value: "other", label: "Other" },
];

// Matches migration 059's storage bucket config exactly (file_size_limit,
// allowed_mime_types) — client-side validation here is a UX nicety only;
// the bucket policy is the actual enforcement, so keep these in sync but
// never treat the client check as sufficient on its own.
export const CLICK_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const CLICK_PHOTO_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const CLICK_MAX_PHOTOS = 15;

// Phase 6 perf: a Click allows up to 15 photos, and phone cameras
// routinely produce 4000px+ JPEGs in the 4-8MB range — uploading those
// as-is means slow uploads on mobile connections and Next's image
// optimizer repeatedly downsizing a multi-megabyte original for every
// requested feed-card/thumbnail size. Downscaling to this cap before
// upload (long edge, canvas re-encode) keeps the *original* stored file
// itself reasonably sized without needing a separate thumbnail column —
// it's still large enough to look sharp in the full-screen gallery.
const CLICK_PHOTO_UPLOAD_MAX_DIMENSION = 2000;
const CLICK_PHOTO_UPLOAD_QUALITY = 0.82;

/** Downscales/re-encodes an image file client-side before upload, capping
 * its longest edge at CLICK_PHOTO_UPLOAD_MAX_DIMENSION. Returns the
 * original file unchanged if it's already small enough, or if any step
 * fails (canvas/createImageBitmap unsupported, decode error) — this is a
 * best-effort size optimization, never a hard requirement for upload to
 * proceed. PNG is re-encoded as PNG (no transparency loss); JPEG/WEBP are
 * re-encoded in their original format. */
async function compressClickPhoto(file: File): Promise<File> {
  try {
    if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

    const bitmap = await createImageBitmap(file);
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    if (longestEdge <= CLICK_PHOTO_UPLOAD_MAX_DIMENSION) {
      bitmap.close();
      return file;
    }

    const scale = CLICK_PHOTO_UPLOAD_MAX_DIMENSION / longestEdge;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, CLICK_PHOTO_UPLOAD_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file; // re-encode didn't actually help — keep the original

    return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file; // never block an upload over a compression failure
  }
}
export const CLICK_MIN_PHOTOS_TO_PUBLISH = 1;
export const CLICK_TITLE_MAX = 120;
export const CLICK_STORY_MAX = 20000;

export class ClickValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClickValidationError";
  }
}

export type ClickDraftFields = {
  title: string;
  story: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  tripType: ClickTripType | null;
  tripId: string | null;
};

/** Create a new Click row in 'draft' status. Returns the new click's id.
 * Photos are uploaded separately (uploadClickPhoto) once an id exists,
 * since the storage path is keyed by click_id — see migration 059's
 * click-photos bucket path convention ({user_id}/{click_id}/{filename}). */
export async function createClickDraft(userId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clicks")
    .insert({ user_id: userId, title: "", story: "", status: "draft" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't start a new Click. Try again.");
  return data.id;
}

function validateFields(fields: ClickDraftFields, { forPublish }: { forPublish: boolean }): void {
  const title = fields.title.trim();
  const story = fields.story.trim();

  if (forPublish && title.length === 0) throw new ClickValidationError("Give your Click a title before publishing.");
  if (title.length > CLICK_TITLE_MAX) throw new ClickValidationError(`Title must be ${CLICK_TITLE_MAX} characters or fewer.`);
  if (forPublish && story.length === 0) throw new ClickValidationError("Write a little about the trip before publishing.");
  if (story.length > CLICK_STORY_MAX) throw new ClickValidationError("That story is too long — try trimming it down.");
  if (fields.destination.length > 200) throw new ClickValidationError("Destination is too long.");
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
    throw new ClickValidationError("End date can't be before the start date.");
  }
}

/** Save fields onto an existing Click without changing its status —
 * covers both "save as draft" and editing an already-published Click's
 * text/metadata (edit permission is enforced by clicks_update_own RLS,
 * not here). */
export async function saveClickFields(clickId: string, fields: ClickDraftFields): Promise<void> {
  validateFields(fields, { forPublish: false });
  const supabase = createClient();
  const { error } = await supabase
    .from("clicks")
    .update({
      title: fields.title.trim(),
      story: fields.story.trim(),
      destination: fields.destination.trim() || null,
      start_date: fields.startDate || null,
      end_date: fields.endDate || null,
      trip_type: fields.tripType,
      trip_id: fields.tripId,
    })
    .eq("id", clickId);
  if (error) throw new Error(error.message);
}

/** Publish a Click: validates required fields + at least one photo exist,
 * sets the cover image (first photo by display_order unless already set),
 * then flips status to 'published'. */
export async function publishClick(clickId: string, fields: ClickDraftFields): Promise<void> {
  validateFields(fields, { forPublish: true });
  const supabase = createClient();

  const { data: photos, error: photosError } = await supabase
    .from("click_photos")
    .select("image_url")
    .eq("click_id", clickId)
    .order("display_order", { ascending: true })
    .limit(1);
  if (photosError) throw new Error(photosError.message);
  if (!photos || photos.length < CLICK_MIN_PHOTOS_TO_PUBLISH) {
    throw new ClickValidationError("Add at least one photo before publishing.");
  }

  const { error } = await supabase
    .from("clicks")
    .update({
      title: fields.title.trim(),
      story: fields.story.trim(),
      destination: fields.destination.trim() || null,
      start_date: fields.startDate || null,
      end_date: fields.endDate || null,
      trip_type: fields.tripType,
      trip_id: fields.tripId,
      cover_image_url: photos[0].image_url,
      status: "published",
    })
    .eq("id", clickId);
  if (error) throw new Error(error.message);
}

/** Soft-delete: sets status = 'deleted' rather than removing the row, per
 * the feature spec's moderation/audit requirement — mirrors trips' own
 * soft-delete-by-status convention rather than a hard DELETE. */
export async function deleteClick(clickId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("clicks").update({ status: "deleted" }).eq("id", clickId);
  if (error) throw new Error(error.message);
}

export async function getClickForEdit(clickId: string): Promise<(ClickRow & { photos: ClickPhotoRow[] }) | null> {
  const supabase = createClient();
  const [{ data: click }, { data: photos }] = await Promise.all([
    supabase.from("clicks").select("*").eq("id", clickId).maybeSingle(),
    supabase.from("click_photos").select("*").eq("click_id", clickId).order("display_order", { ascending: true }),
  ]);
  if (!click) return null;
  return { ...click, photos: photos ?? [] };
}

/** My Clicks — both published and drafts, for the profile "My Clicks"
 * section (spec section 22: drafts are creator-only, enforced by RLS —
 * this just reads whatever the caller is allowed to see for their own
 * user_id, which is everything they own regardless of status). */
export async function getMyClicks(userId: string): Promise<ClickRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clicks")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

/** Uploads one photo file for a Click and inserts its click_photos row at
 * the given display_order. Throws ClickValidationError for client-side
 * validation failures (safe to show directly to the user), plain Error
 * for upload/DB failures. Caller is responsible for choosing display_order
 * (e.g. the photo's index in the selected batch) — the UNIQUE(click_id,
 * display_order) constraint means re-ordering must update existing rows,
 * not just insert new ones at reused positions. */
export async function uploadClickPhoto(
  userId: string,
  clickId: string,
  file: File,
  displayOrder: number
): Promise<ClickPhotoRow> {
  const ext = CLICK_PHOTO_MIME_TO_EXT[file.type];
  if (!ext) throw new ClickValidationError("Please choose a JPEG, PNG, or WEBP image.");
  if (file.size > CLICK_PHOTO_MAX_BYTES) throw new ClickValidationError("Each photo must be 8MB or smaller.");

  const uploadFile = await compressClickPhoto(file);

  const supabase = createClient();
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${clickId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("click-photos")
    .upload(path, uploadFile, { contentType: uploadFile.type });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("click-photos").getPublicUrl(path);

  const { data, error } = await supabase
    .from("click_photos")
    .insert({ click_id: clickId, image_url: publicUrl, storage_path: path, display_order: displayOrder })
    .select("*")
    .single();
  if (error || !data) {
    // Photo file is already uploaded to storage at this point; the DB row
    // failed (most likely the display_order UNIQUE constraint if the
    // caller raced two uploads at the same order). Clean up the orphaned
    // storage object so it isn't billed/retained with nothing referencing
    // it, then surface the real error.
    await supabase.storage.from("click-photos").remove([path]);
    throw new Error(error?.message ?? "Couldn't save that photo. Try again.");
  }
  return data;
}

export async function deleteClickPhoto(photoId: string, storagePath: string): Promise<void> {
  const supabase = createClient();
  const { error: dbError } = await supabase.from("click_photos").delete().eq("id", photoId);
  if (dbError) throw new Error(dbError.message);
  // Best-effort storage cleanup — the DB row (the thing RLS/UI actually
  // depend on) is already gone at this point, so a storage removal
  // failure here is logged, not thrown, matching how deleteClick doesn't
  // roll back a successful primary action over a secondary cleanup step.
  const { error: storageError } = await supabase.storage.from("click-photos").remove([storagePath]);
  if (storageError) console.error("Failed to remove click photo from storage:", storageError.message);
}

/** Reorders photos to match the given id list's order (index = new
 * display_order). Uses a two-pass update to avoid transiently colliding
 * with the UNIQUE(click_id, display_order) constraint when swapping two
 * photos' positions (e.g. 0<->1 would otherwise try to set one row to an
 * order the other row still holds, momentarily, mid-update). */
export async function reorderClickPhotos(clickId: string, orderedPhotoIds: string[]): Promise<void> {
  const supabase = createClient();
  const OFFSET = 10000; // comfortably above CLICK_MAX_PHOTOS
  for (let i = 0; i < orderedPhotoIds.length; i++) {
    const { error } = await supabase
      .from("click_photos")
      .update({ display_order: OFFSET + i })
      .eq("id", orderedPhotoIds[i])
      .eq("click_id", clickId);
    if (error) throw new Error(error.message);
  }
  for (let i = 0; i < orderedPhotoIds.length; i++) {
    const { error } = await supabase
      .from("click_photos")
      .update({ display_order: i })
      .eq("id", orderedPhotoIds[i])
      .eq("click_id", clickId);
    if (error) throw new Error(error.message);
  }
}
