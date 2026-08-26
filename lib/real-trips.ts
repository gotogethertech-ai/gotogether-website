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

  const { min, max } = budgetRange(fields);

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      organizer_id: organizerId,
      kind: fields.kind,
      company_id: fields.kind === "verified_partner" ? fields.companyId : null,
      title: fields.title.trim(),
      description: fields.description.trim() || null,
      destination_id: destRow.id,
      availability_start: fields.availabilityStart || null,
      availability_end: fields.availabilityEnd || null,
      duration_min: fields.durationMin,
      duration_max: fields.durationMax,
      budget_min: min,
      budget_max: max,
      max_group_size: fields.maxGroup,
      min_age: fields.minAge,
      max_age: fields.maxAge,
      gender_restriction: fields.genderRestriction,
      status: "live",
    })
    .select("id")
    .single();

  if (tripError || !trip) {
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
