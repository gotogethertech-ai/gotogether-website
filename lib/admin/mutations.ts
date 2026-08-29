import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { PriceBreakdownItem } from "@/components/ui/PriceBreakdownEditor";
import type { ItineraryDay } from "@/components/ui/ItineraryEditor";

/**
 * Admin panel mutations — thin wrappers around the admin_* Postgres RPCs
 * (migrations 015/016). Each RPC is one atomic transaction server-side
 * (write + audit-log row together, per Developer Spec §11: "an action
 * that succeeds without an audit row is a bug") and re-checks
 * authorization itself, so these wrappers exist only to give the RPC
 * calls typed signatures and consistent error surfacing — never to
 * assemble multi-table writes client-side.
 */

/** Thrown when a stale action targets an already-decided record (§12) —
 * e.g. approving a verification another admin just rejected. Callers
 * should catch this specifically and refetch rather than showing a
 * generic failure. */
export class AlreadyDecidedError extends Error {
  constructor() {
    super("This was already decided by another admin. Refresh to see the current state.");
    this.name = "AlreadyDecidedError";
  }
}

async function callRpc<T extends keyof Database["public"]["Functions"]>(
  fn: T,
  args: Database["public"]["Functions"][T]["Args"]
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.message.includes("ALREADY_DECIDED") || error.code === "40001") {
      throw new AlreadyDecidedError();
    }
    throw new Error(error.message);
  }
}

// ── Verification (§7) ───────────────────────────────────────────────
export const approveVerification = (verificationId: string) =>
  callRpc("admin_approve_verification", { p_verification_id: verificationId });

export const rejectVerification = (
  verificationId: string,
  reason: Database["public"]["Enums"]["verification_rejection_reason"]
) => callRpc("admin_reject_verification", { p_verification_id: verificationId, p_rejection_reason: reason });

// ── Enforcement ladder (§5) ─────────────────────────────────────────
export const warnUser = (userId: string, reason: string) => callRpc("admin_warn_user", { p_user_id: userId, p_reason: reason });

export const restrictUser = (userId: string, reason: string) =>
  callRpc("admin_restrict_user", { p_user_id: userId, p_reason: reason });

export const liftRestriction = (userId: string, reason?: string) =>
  callRpc("admin_lift_restriction", { p_user_id: userId, p_reason: reason });

export const suspendUser = (userId: string, reason: string) =>
  callRpc("admin_suspend_user", { p_user_id: userId, p_reason: reason });

export const reinstateUser = (userId: string, reason?: string) =>
  callRpc("admin_reinstate_user", { p_user_id: userId, p_reason: reason });

export const removeUser = (userId: string, reason: string) => callRpc("admin_remove_user", { p_user_id: userId, p_reason: reason });

// ── Direct user creation (real, immediately-usable account — no
// pending-registration step) — routed through a server route since it
// needs the service-role Admin API to create a real auth.users row.
export type CreateDirectUserResult = { id: string; tempPassword: string };

export async function createDirectUser(input: { name: string; email: string; phone?: string }): Promise<CreateDirectUserResult> {
  const res = await fetch("/api/admin/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to create account.");
  return body as CreateDirectUserResult;
}

// ── Profile editing (basic fields) ────────────────────────────────────
export async function updateUserProfile(
  userId: string,
  patch: Partial<{
    name: string;
    bio: string;
    gender: string;
    dateOfBirth: string;
    phone: string;
    email: string;
    avatarUrl: string;
    smokingPreference: string;
    drinkingPreference: string;
    // Admin-set overrides for the profile page's Travel Activity tiles
    // (migration 041) — not real computed counts, just what staff types
    // in. Undefined/null leaves the stored value unchanged; the matching
    // clear* flag resets it back to null (renders as 0).
    tripsJoinedOverride: number | null;
    clearTripsJoinedOverride: boolean;
    tripsCompletedOverride: number | null;
    clearTripsCompletedOverride: boolean;
    tripsOrganizedOverride: number | null;
    clearTripsOrganizedOverride: boolean;
    citiesExploredOverride: number | null;
    clearCitiesExploredOverride: boolean;
  }>
): Promise<void> {
  await callRpc("admin_update_user_profile", {
    p_user_id: userId,
    p_name: patch.name,
    p_bio: patch.bio,
    p_gender: patch.gender,
    p_date_of_birth: patch.dateOfBirth,
    p_phone: patch.phone,
    p_email: patch.email,
    p_avatar_url: patch.avatarUrl,
    p_smoking_preference: patch.smokingPreference,
    p_drinking_preference: patch.drinkingPreference,
    p_trips_joined_override: patch.tripsJoinedOverride ?? undefined,
    p_clear_trips_joined_override: patch.clearTripsJoinedOverride,
    p_trips_completed_override: patch.tripsCompletedOverride ?? undefined,
    p_clear_trips_completed_override: patch.clearTripsCompletedOverride,
    p_trips_organized_override: patch.tripsOrganizedOverride ?? undefined,
    p_clear_trips_organized_override: patch.clearTripsOrganizedOverride,
    p_cities_explored_override: patch.citiesExploredOverride ?? undefined,
    p_clear_cities_explored_override: patch.clearCitiesExploredOverride,
  });
}

// ── Trust Score direct override (admin-only) ──────────────────────────
export const setTrustScore = (userId: string, score: number, reason?: string) =>
  callRpc("admin_set_trust_score", { p_user_id: userId, p_score: score, p_reason: reason });

// ── Admin-authored / admin-edited reviews (admin-only) ────────────────
// Exactly one of tripId / tripTitleOverride must be given (migration 045):
// tripId links to a real trip (its title is looked up normally, same as a
// peer review); tripTitleOverride is free text with no backing trip row.
// reviewerId links to a real account (the profile-name link works, same
// as a peer review); reviewerDisplayName is free text shown instead of
// that account's name — pass BOTH together to show a chosen real user's
// name while still linking their profile, or reviewerDisplayName alone
// (reviewerId omitted, defaults to the acting admin) when the name typed
// doesn't match any real account.
/** revieweeId targets a user's profile; revieweeCompanyId targets a
 * travel company's profile (migration 048) — pass exactly one, never
 * both. Everything else (free-text trip/reviewer, rating, comment) works
 * identically for either target. */
export async function writeReview(input: {
  revieweeId?: string;
  revieweeCompanyId?: string;
  tripId?: string;
  tripTitleOverride?: string;
  rating: number;
  comment: string;
  reviewerId?: string;
  reviewerDisplayName?: string;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_write_review", {
    p_reviewee_id: input.revieweeId,
    p_reviewee_company_id: input.revieweeCompanyId,
    p_trip_id: input.tripId,
    p_trip_title_override: input.tripTitleOverride,
    p_rating: input.rating,
    p_comment: input.comment,
    p_reviewer_id: input.reviewerId,
    p_reviewer_display_name: input.reviewerDisplayName,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export const editReview = (reviewId: string, patch: { rating?: number; comment?: string }) =>
  callRpc("admin_edit_review", { p_review_id: reviewId, p_rating: patch.rating, p_comment: patch.comment });

/** First "edit company" mutation (previously only create/verify/suspend/
 * remove existed) — currently used for the counsellor phone number
 * (migration 052) but covers the other editable fields too. */
export async function updateCompany(input: {
  companyId: string;
  name?: string;
  contactEmail?: string;
  registrationNumber?: string;
  gstNumber?: string;
  counsellorPhone?: string | null;
  clearCounsellorPhone?: boolean;
}): Promise<void> {
  await callRpc("admin_update_company", {
    p_company_id: input.companyId,
    p_name: input.name,
    p_contact_email: input.contactEmail,
    p_registration_number: input.registrationNumber,
    p_gst_number: input.gstNumber,
    p_counsellor_phone: input.counsellorPhone ?? undefined,
    p_clear_counsellor_phone: input.clearCounsellorPhone,
  });
}

/** Admin-authored "trip run by this company" display record (migration
 * 051) — name + date range shown on the company's public profile,
 * non-clickable (no backing trips row, no booking/members). Counts toward
 * the company's "trips run" stat alongside real trips — see
 * getRealCompanies() in lib/real-companies.ts. */
export async function addCompanyTripRecord(input: {
  companyId: string;
  title: string;
  startDate: string;
  endDate?: string;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_add_company_trip_record", {
    p_company_id: input.companyId,
    p_title: input.title,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export const removeCompanyTripRecord = (recordId: string) =>
  callRpc("admin_remove_company_trip_record", { p_record_id: recordId });

// ── Trip moderation (§6) ────────────────────────────────────────────
export const hideTrip = (tripId: string, reason: string) => callRpc("admin_hide_trip", { p_trip_id: tripId, p_reason: reason });

export const unhideTrip = (tripId: string, reason?: string) =>
  callRpc("admin_unhide_trip", { p_trip_id: tripId, p_reason: reason });

export const closeTripRegistrations = (tripId: string, reason?: string) =>
  callRpc("admin_close_trip_registrations", { p_trip_id: tripId, p_reason: reason });

export const reopenTripRegistrations = (tripId: string, reason?: string) =>
  callRpc("admin_reopen_trip_registrations", { p_trip_id: tripId, p_reason: reason });

export const forceCancelTrip = (tripId: string, reason: string) =>
  callRpc("admin_force_cancel_trip", { p_trip_id: tripId, p_reason: reason });

// Soft-delete, matching every other destructive admin action in this app
// (companies, reviews, users) — never a hard DELETE FROM trips. Sets
// status = 'deleted' (migration 040), which every browse/query-time filter
// already excludes by construction since they allowlist ["live",
// "in_progress"] rather than denylist hidden statuses. Admin role only
// (same tier as force-cancel), requires a reason, audit-logged.
export const deleteTrip = (tripId: string, reason: string) =>
  callRpc("admin_delete_trip", { p_trip_id: tripId, p_reason: reason });

// Multi-select variants for the admin trips list's checkbox bulk actions.
export const bulkDeleteTrips = (tripIds: string[], reason: string) =>
  callRpc("admin_bulk_delete_trips", { p_trip_ids: tripIds, p_reason: reason });

export const bulkHideTrips = (tripIds: string[], reason?: string) =>
  callRpc("admin_bulk_hide_trips", { p_trip_ids: tripIds, p_reason: reason });

export const removeTripMember = (tripId: string, userId: string, reason: string) =>
  callRpc("admin_remove_trip_member", { p_trip_id: tripId, p_user_id: userId, p_reason: reason });

/** Thrown when a trip is already at max_group_size (accepted members). */
export class TripFullError extends Error {
  constructor() {
    super("This trip is already full.");
    this.name = "TripFullError";
  }
}

export async function addTripMember(tripId: string, userId: string, reason?: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_add_trip_member", { p_trip_id: tripId, p_user_id: userId, p_reason: reason });
  if (error) {
    if (error.message.includes("TRIP_FULL")) throw new TripFullError();
    throw new Error(error.message);
  }
}

// ── Reviews (§9) ─────────────────────────────────────────────────────
export const hideReview = (reviewId: string, reason: string) => callRpc("admin_hide_review", { p_review_id: reviewId, p_reason: reason });

export const removeReview = (reviewId: string, reason: string) =>
  callRpc("admin_remove_review", { p_review_id: reviewId, p_reason: reason });

export const restoreReview = (reviewId: string, reason?: string) =>
  callRpc("admin_restore_review", { p_review_id: reviewId, p_reason: reason });

// ── Companies ────────────────────────────────────────────────────────
export const verifyCompany = (companyId: string, reason?: string) =>
  callRpc("admin_verify_company", { p_company_id: companyId, p_reason: reason });

export const suspendCompany = (companyId: string, reason: string) =>
  callRpc("admin_suspend_company", { p_company_id: companyId, p_reason: reason });

export const removeCompany = (companyId: string, reason: string) =>
  callRpc("admin_remove_company", { p_company_id: companyId, p_reason: reason });

export async function createCompany(input: {
  name: string;
  contactEmail?: string;
  registrationNumber?: string;
  ownerUserId?: string;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_create_company", {
    p_name: input.name,
    p_contact_email: input.contactEmail,
    p_registration_number: input.registrationNumber,
    p_owner_user_id: input.ownerUserId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

// ── Testimonials — direct table writes (admin-only via RLS, no RPC
// needed since there's no cross-table cascade to make atomic) ────────
export async function createTestimonial(input: {
  quote: string;
  attributedName: string;
  attributedLocation?: string;
  userId?: string;
  consentRecorded: boolean;
  publish: boolean;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("testimonials").insert({
    quote: input.quote.trim(),
    attributed_name: input.attributedName.trim(),
    attributed_location: input.attributedLocation?.trim() || null,
    user_id: input.userId || null,
    consent_recorded_at: input.consentRecorded ? new Date().toISOString() : null,
    // is_published can only be true when consent is on file — enforced
    // here as well as being the honest reading of §10, even though the
    // DB doesn't have a CHECK constraint for it.
    is_published: input.consentRecorded ? input.publish : false,
  });
  if (error) throw new Error(error.message);
}

export async function updateTestimonial(
  id: string,
  patch: Partial<{ quote: string; attributedName: string; attributedLocation: string | null; isPublished: boolean; consentRecorded: boolean }>
): Promise<void> {
  const supabase = createClient();
  const update: Database["public"]["Tables"]["testimonials"]["Update"] = {};
  if (patch.quote !== undefined) update.quote = patch.quote.trim();
  if (patch.attributedName !== undefined) update.attributed_name = patch.attributedName.trim();
  if (patch.attributedLocation !== undefined) update.attributed_location = patch.attributedLocation;
  if (patch.consentRecorded !== undefined) update.consent_recorded_at = patch.consentRecorded ? new Date().toISOString() : null;
  if (patch.isPublished !== undefined) update.is_published = patch.isPublished;
  const { error } = await supabase.from("testimonials").update(update).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTestimonial(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Admin-created trips (any user can be made organizer/host) ────────
// Routed through the admin_create_trip RPC rather than a direct insert:
// the trips_insert_own RLS policy only allows auth.uid() = organizer_id,
// with no is_staff() branch, so an admin creating a trip "on behalf of"
// someone else would be silently rejected by RLS. The RPC (migration 019,
// relaxed in migration 021 to drop the ID-verification requirement)
// re-checks is_staff() and writes the audit log row in the same transaction.
export async function adminCreateTripForOrganizer(input: {
  organizerId: string;
  title: string;
  destinationId: string;
  availabilityStart: string;
  availabilityEnd: string;
  durationMin: number;
  durationMax: number;
  maxGroupSize: number;
  description?: string;
  minAge?: number;
  maxAge?: number;
  genderRestriction?: Database["public"]["Enums"]["trip_gender_restriction"];
  // Community (default) or Partner — Partner requires companyId (migration
  // 030). Unlike the self-service register_company path, the admin isn't
  // restricted to companies with status = 'verified' here — is_staff() is
  // already the gate, and an admin assigning a trip to a company mid-review
  // is a legitimate operational action.
  kind?: Database["public"]["Enums"]["trip_kind"];
  companyId?: string;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_create_trip", {
    p_organizer_id: input.organizerId,
    p_title: input.title,
    p_destination_id: input.destinationId,
    p_availability_start: input.availabilityStart,
    p_availability_end: input.availabilityEnd,
    p_duration_min: input.durationMin,
    p_duration_max: input.durationMax,
    p_max_group_size: input.maxGroupSize,
    p_description: input.description,
    p_min_age: input.minAge,
    p_max_age: input.maxAge,
    p_gender_restriction: input.genderRestriction,
    p_kind: input.kind,
    p_company_id: input.companyId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Thrown when a max_group_size edit would drop below the current accepted member count. */
export class MaxGroupSizeBelowMemberCountError extends Error {
  constructor() {
    super("Max group size can't be lower than the current number of accepted members.");
    this.name = "MaxGroupSizeBelowMemberCountError";
  }
}

// ── Admin trip editing (any field, including reassigning the organizer) ──
// Routed through the admin_update_trip RPC (migration 022) for the same
// reason trip creation is: re-checks is_staff(), guards against shrinking
// max_group_size below the current accepted member count, keeps the new
// organizer's membership in sync, and writes a before/after audit row.
export async function updateTrip(
  tripId: string,
  patch: Partial<{
    title: string;
    description: string;
    destinationId: string;
    availabilityStart: string;
    availabilityEnd: string;
    durationMin: number;
    durationMax: number;
    maxGroupSize: number;
    budgetMin: number;
    budgetMax: number;
    minAge: number;
    maxAge: number;
    genderRestriction: Database["public"]["Enums"]["trip_gender_restriction"];
    coverImageUrl: string;
    clearCoverImage: boolean;
    organizerId: string;
    kind: Database["public"]["Enums"]["trip_kind"];
    companyId: string;
    clearCompany: boolean;
    // Verified Partner only (migration 037/038) — descriptive pricing
    // breakdown, inclusions/exclusions lists, and day-wise itinerary OR a
    // PDF upload instead. NULL/undefined means "leave unchanged"; the
    // matching clear* flag means "set to null" (see admin_update_trip).
    priceBreakdown: PriceBreakdownItem[];
    clearPriceBreakdown: boolean;
    inclusions: string[];
    clearInclusions: boolean;
    exclusions: string[];
    clearExclusions: boolean;
    itineraryDays: ItineraryDay[];
    clearItineraryDays: boolean;
    itineraryPdfUrl: string;
    clearItineraryPdfUrl: boolean;
  }>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_update_trip", {
    p_trip_id: tripId,
    p_title: patch.title,
    p_description: patch.description,
    p_destination_id: patch.destinationId,
    p_availability_start: patch.availabilityStart,
    p_availability_end: patch.availabilityEnd,
    p_duration_min: patch.durationMin,
    p_duration_max: patch.durationMax,
    p_max_group_size: patch.maxGroupSize,
    p_budget_min: patch.budgetMin,
    p_budget_max: patch.budgetMax,
    p_min_age: patch.minAge,
    p_max_age: patch.maxAge,
    p_gender_restriction: patch.genderRestriction,
    p_cover_image_url: patch.coverImageUrl,
    p_clear_cover_image: patch.clearCoverImage,
    p_organizer_id: patch.organizerId,
    p_kind: patch.kind,
    p_company_id: patch.companyId,
    p_clear_company: patch.clearCompany,
    p_price_breakdown: patch.priceBreakdown as unknown as Database["public"]["Tables"]["trips"]["Row"]["price_breakdown"],
    p_clear_price_breakdown: patch.clearPriceBreakdown,
    p_inclusions: patch.inclusions,
    p_clear_inclusions: patch.clearInclusions,
    p_exclusions: patch.exclusions,
    p_clear_exclusions: patch.clearExclusions,
    p_itinerary_days: patch.itineraryDays as unknown as Database["public"]["Tables"]["trips"]["Row"]["itinerary_days"],
    p_clear_itinerary_days: patch.clearItineraryDays,
    p_itinerary_pdf_url: patch.itineraryPdfUrl,
    p_clear_itinerary_pdf_url: patch.clearItineraryPdfUrl,
  });
  if (error) {
    if (error.message.includes("MAX_GROUP_SIZE_BELOW_MEMBER_COUNT")) throw new MaxGroupSizeBelowMemberCountError();
    throw new Error(error.message);
  }
}

/** Must match migration 027_avatars_storage_bucket's bucket constraints,
 * same limits the self-service EditProfileClient enforces client-side. */
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Admin-side avatar upload — staff is permitted to write into any user's
 * folder in the avatars bucket via the `OR is_staff()` clause on its
 * storage RLS policies (migration 047), so an admin can set a photo for a
 * user who never signs in to set their own (e.g. an admin-created user).
 * Uploads under `userId` (not the signed-in admin's id) so it lands in the
 * same path the user's own EditProfileClient would use, and overwrites any
 * existing avatar at that fixed path (upsert: true, same as self-service). */
export async function uploadAvatarAsAdmin(userId: string, file: File): Promise<string> {
  const ext = AVATAR_MIME_TO_EXT[file.type];
  if (!ext) throw new Error("Please choose a JPEG, PNG, or WEBP image");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("Image must be 5MB or smaller");

  const supabase = createClient();
  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so the new photo shows immediately instead of a
  // browser-cached copy of the old file at the same URL.
  return `${publicUrl}?t=${Date.now()}`;
}

/** Admin-side itinerary PDF upload — staff is permitted to write into any
 * organizer's folder in the trip-documents bucket via the `OR is_staff()`
 * clause on its storage RLS policies (migration 037), so this uploads
 * under the trip's organizerId (not the signed-in admin's id) to keep the
 * file colocated with the rest of that organizer's uploads. */
export async function uploadItineraryPdfAsAdmin(organizerId: string, file: File): Promise<string> {
  const supabase = createClient();
  const path = `${organizerId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("trip-documents").upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("trip-documents").getPublicUrl(path);
  return data.publicUrl;
}

// ── Destinations (launch-tier catalog, admin-managed) ─────────────────
// "Remove" is always a deactivate, never a hard delete — a trip's
// destination_id foreign key must never be able to go dangling. The admin
// UI can still reactivate a retired destination later.
export async function createDestination(input: {
  name: string;
  slug: string;
  category?: string;
  coverImageUrl?: string;
  tagline?: string;
  description?: string;
  sortOrder?: number;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_create_destination", {
    p_name: input.name,
    p_slug: input.slug,
    p_category: input.category,
    p_cover_image_url: input.coverImageUrl,
    p_tagline: input.tagline,
    p_description: input.description,
    p_sort_order: input.sortOrder,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function updateDestination(
  destinationId: string,
  patch: Partial<{
    name: string;
    category: string;
    coverImageUrl: string;
    tagline: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
  }>
): Promise<void> {
  await callRpc("admin_update_destination", {
    p_destination_id: destinationId,
    p_name: patch.name,
    p_category: patch.category,
    p_cover_image_url: patch.coverImageUrl,
    p_tagline: patch.tagline,
    p_description: patch.description,
    p_sort_order: patch.sortOrder,
    p_is_active: patch.isActive,
  });
}

export const deactivateDestination = (destinationId: string) =>
  callRpc("admin_deactivate_destination", { p_destination_id: destinationId });

export const reactivateDestination = (destinationId: string) =>
  callRpc("admin_reactivate_destination", { p_destination_id: destinationId });
