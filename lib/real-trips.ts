import { createClient } from "@/lib/supabase/client";
import type { CreateTripFields } from "@/lib/create-trip-context";
import type { HostedTrip } from "@/lib/my-trips-data";
import { formatTripTiming } from "@/lib/trip-dates";

/**
 * Real trip creation + "my hosted trips" reads, replacing the previous
 * frontend-only Create Trip flow (publish() just flipped a boolean — see
 * lib/create-trip-context.tsx's prior version — so a "created" trip never
 * actually existed anywhere and could never show up in My Trips).
 *
 * This inserts into public.trips (+ a trip_members row for the organizer,
 * matching the schema's convention that an organizer is also a member —
 * see migration 002) via the real Supabase client, under the trips_insert_own
 * / trip_members_insert RLS policies (organizer_id must equal auth.uid()).
 */

function budgetRange(fields: CreateTripFields): { min: number | null; max: number | null } {
  if (fields.budgetChip === "Custom") {
    const n = Number(fields.customBudget || 0);
    return { min: n || null, max: n || null };
  }
  // Chip ranges are display strings ("₹5,000 – ₹10,000" etc.) — parse the
  // numbers out of them rather than duplicating the list with numeric
  // bounds, so BUDGET_CHIPS in create-trip-context.tsx stays the single
  // source of truth for the displayed labels.
  const nums = (fields.budgetChip ?? "").match(/[\d,]+/g)?.map((s) => Number(s.replace(/,/g, ""))) ?? [];
  if (nums.length === 2) return { min: nums[0], max: nums[1] };
  if (nums.length === 1) {
    // "Under ₹5,000" -> max only; "₹25,000+" -> min only
    if ((fields.budgetChip ?? "").includes("Under")) return { min: null, max: nums[0] };
    return { min: nums[0], max: null };
  }
  return { min: null, max: null };
}

/** Publish a trip: resolves the picked destination slug to a real
 * public.destinations row, inserts the trip, then adds the organizer as an
 * accepted trip_members row. Returns the new trip's id, or throws with a
 * message safe to surface to the host. */
export async function publishTrip(fields: CreateTripFields, organizerId: string): Promise<string> {
  const supabase = createClient();

  // Defensive session check, right before the write that actually needs
  // it. The trips_insert_own RLS policy requires organizer_id to equal
  // auth.uid() from the request's own JWT — if the browser's access token
  // had quietly expired (or a background refresh hadn't finished yet) at
  // the moment Publish was clicked, the insert fails with Postgres's bare
  // "row-level security policy" denial even though the account, its
  // company membership, and verification are all otherwise fine (this
  // surfaced as exactly that symptom — see the Aug 28 investigation).
  // Forcing a fresh getUser() here (round-trips to Supabase Auth, unlike
  // getSession() which can return a stale cached token) either recovers a
  // token that was about to lapse, or fails fast with a message that
  // actually explains what happened instead of the generic RLS text.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user || userData.user.id !== organizerId) {
    throw new Error("Your session expired — refresh the page and sign in again before publishing.");
  }

  if (!fields.destinationSlug) throw new Error("Pick a destination before publishing.");

  const { data: destRow, error: destError } = await supabase
    .from("destinations")
    .select("id")
    .eq("slug", fields.destinationSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (destError || !destRow) {
    throw new Error("That destination isn't available anymore — pick a different one from the list.");
  }

  const isPartner = fields.kind === "verified_partner";
  const { min, max } = budgetRange(fields);

  // fields.companyId is set client-side when the Partner option was
  // picked (DestinationStep), but that value can go stale — most
  // concretely, the whole Create Trip draft is persisted to sessionStorage
  // un-keyed by account (see create-trip-context.tsx's STORAGE_KEY), so
  // switching signed-in accounts in the same tab mid-draft resumes a
  // partner trip's kind/companyId under a different user entirely. The
  // trips_insert_own RLS policy requires company_id to be set AND the
  // caller to actually belong to that verified company, so a stale/wrong
  // id fails with a bare "row-level security policy" error that gives the
  // host no idea what went wrong. Re-resolving it here, right before the
  // insert, means a real problem (never registered a company, switched
  // accounts mid-draft, or the company is no longer verified) gets a
  // clear message instead.
  //
  // IMPORTANT: company_users' own RLS policy (company_users_select_public)
  // is USING (true) — publicly readable with no per-row scoping — so this
  // query MUST filter by user_id itself; a bare .maybeSingle() with no
  // filter returns an arbitrary row from the whole table (any user's
  // company), not necessarily this caller's, and can silently pass a
  // verified-company check for someone who belongs to no company at all.
  let companyId: string | null = null;
  if (isPartner) {
    const { data: membership } = await supabase
      .from("company_users")
      .select("companies(id, status)")
      .eq("user_id", organizerId)
      .maybeSingle();
    const company = membership ? (Array.isArray(membership.companies) ? membership.companies[0] : membership.companies) : null;
    if (!company || company.status !== "verified") {
      throw new Error("Your company isn't verified — Partner trips can only be published once your company is approved.");
    }
    companyId = company.id;
  }

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      organizer_id: organizerId,
      kind: fields.kind,
      company_id: companyId,
      title: fields.title.trim(),
      description: fields.description.trim() || null,
      destination_id: destRow.id,
      // Verified Partner trips carry a confirmed fixed schedule + price
      // (DB constraint trips_fixed_pricing_only_for_partner enforces the
      // reverse too — community trips can never have these set) instead
      // of an availability window + budget range.
      availability_start: isPartner ? null : fields.availabilityStart || null,
      availability_end: isPartner ? null : fields.availabilityEnd || null,
      duration_min: isPartner ? null : fields.durationMin,
      duration_max: isPartner ? null : fields.durationMax,
      budget_min: isPartner ? null : min,
      budget_max: isPartner ? null : max,
      fixed_start_date: isPartner ? fields.fixedStartDate || null : null,
      fixed_end_date: isPartner ? fields.fixedEndDate || null : null,
      price: isPartner && fields.price ? Number(fields.price) : null,
      original_price: isPartner && fields.originalPrice ? Number(fields.originalPrice) : null,
      max_group_size: fields.maxGroup,
      min_age: fields.minAge,
      max_age: fields.maxAge,
      gender_restriction: fields.genderRestriction,
      status: "live",
    })
    .select("id")
    .single();

  if (tripError || !trip) {
    // Postgres's raw RLS-denial message ("new row violates row-level
    // security policy...") is meaningless to a host — surface something
    // actionable instead. Every other insert failure still passes its
    // real message through.
    if (tripError?.message?.toLowerCase().includes("row-level security")) {
      throw new Error(
        "Couldn't publish this trip — your account may not have permission to create this kind of trip right now. Try again, or contact support if it keeps happening."
      );
    }
    throw new Error(tripError?.message ?? "Couldn't publish the trip. Try again.");
  }

  // Organizer is also a member — mirrors the schema convention the rest
  // of the trip_members RLS policies assume (see migration 002/006).
  const { error: memberError } = await supabase
    .from("trip_members")
    .insert({ trip_id: trip.id, user_id: organizerId, status: "accepted" });
  if (memberError) {
    // The trip itself published successfully; a missing self-membership
    // row is a lesser problem than losing the whole trip, so this isn't
    // rethrown — surfaced only for debugging.
    console.error("Failed to add organizer as trip member:", memberError.message);
  }

  return trip.id;
}

/** Real "trips I'm hosting", shaped into the existing HostedTrip contract
 * so components/my-trips/HostingTab.tsx (purely presentational) renders
 * them without any changes. */
export async function getMyHostedTrips(organizerId: string): Promise<HostedTrip[]> {
  const supabase = createClient();
  const { data: trips, error } = await supabase
    .from("trips")
    .select(
      "id, title, status, availability_start, availability_end, duration_min, duration_max, max_group_size, destination_id, destinations(name, cover_image_url)"
    )
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });

  if (error || !trips) return [];

  const tripIds = trips.map((t) => t.id);
  const memberCounts = new Map<string, number>();
  if (tripIds.length > 0) {
    const { data: members } = await supabase
      .from("trip_members")
      .select("trip_id")
      .in("trip_id", tripIds)
      .eq("status", "accepted");
    for (const m of members ?? []) {
      memberCounts.set(m.trip_id, (memberCounts.get(m.trip_id) ?? 0) + 1);
    }
  }

  return trips.map((t): HostedTrip => {
    const dest = Array.isArray(t.destinations) ? t.destinations[0] : t.destinations;
    const dates =
      t.availability_start || t.availability_end
        ? formatTripTiming({
            availabilityStart: t.availability_start,
            availabilityEnd: t.availability_end,
            durationMin: t.duration_min,
            durationMax: t.duration_max,
          })
        : undefined;
    return {
      tripId: t.id,
      destination: dest?.name ?? "—",
      title: t.title,
      status: mapTripStatus(t.status),
      dates,
      membersJoined: memberCounts.get(t.id) ?? 1,
      membersMax: t.max_group_size,
      imgSrc: dest?.cover_image_url ?? "/placeholders/manali.svg",
    };
  });
}

function mapTripStatus(status: string): HostedTrip["status"] {
  switch (status) {
    case "draft":
      return "draft";
    case "live":
      return "live";
    case "in_progress":
      return "in-progress";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      // "hidden" has no direct HostedTrip equivalent — closest honest
      // mapping is draft (not publicly visible), rather than inventing a
      // new status the rest of the UI doesn't know how to render.
      return "draft";
  }
}
