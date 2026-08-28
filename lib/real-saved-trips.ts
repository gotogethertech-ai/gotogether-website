import { createClient } from "@/lib/supabase/client";
import type { ExploreTrip } from "@/lib/mock-data";
import { formatTripListingDates, formatTripListingBudget } from "@/lib/trip-dates";

/**
 * Saved Trips (bookmarks) — self-service reads/writes against
 * public.saved_trips (migration 028_saved_trips), independent of
 * trip_members (joining) / join_requests (applying). RLS scopes every
 * row to auth.uid() = user_id, so these calls only ever touch the
 * signed-in caller's own saves — no userId parameter needed beyond what
 * the session already provides.
 */

/** All trip ids the signed-in user has saved — used to seed each
 * ExploreTripCard's initial bookmark state. Returns an empty set for a
 * signed-out visitor (Save is auth-gated, same as Create Trip/Join). */
export async function getSavedTripIds(): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase.from("saved_trips").select("trip_id");
  return new Set((data ?? []).map((r) => r.trip_id));
}

export async function saveTrip(userId: string, tripId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("saved_trips")
    .insert({ user_id: userId, trip_id: tripId });
  // Re-saving an already-saved trip hits the (user_id, trip_id) unique
  // constraint — treat that as a harmless no-op rather than surfacing an
  // error, since the UI's optimistic toggle can race a double-click.
  if (error && error.code !== "23505") throw new Error(error.message);
}

export async function unsaveTrip(userId: string, tripId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("saved_trips")
    .delete()
    .eq("user_id", userId)
    .eq("trip_id", tripId);
  if (error) throw new Error(error.message);
}

/**
 * The signed-in user's saved trips, shaped as ExploreTrip[] (same contract
 * as getRealExploreTrips) so the /saved-trips page can reuse
 * ExploreTripCard directly. Trips the user saved but that have since been
 * deleted, or are no longer publicly visible (draft/hidden), are silently
 * dropped — RLS on `trips` already filters those out of the join.
 */
export async function getSavedTrips(): Promise<ExploreTrip[]> {
  const supabase = createClient();
  const { data: saves } = await supabase
    .from("saved_trips")
    .select("trip_id, created_at")
    .order("created_at", { ascending: false });
  if (!saves || saves.length === 0) return [];

  const tripIds = saves.map((s) => s.trip_id);
  const { data: trips } = await supabase
    .from("trips")
    .select(
      "id, title, kind, availability_start, availability_end, duration_min, duration_max, budget_min, budget_max, fixed_start_date, fixed_end_date, price, original_price, max_group_size, min_age, max_age, gender_restriction, organizer_id, destinations(name, cover_image_url), users!trips_organizer_id_fkey(name)"
    )
    .in("id", tripIds);
  if (!trips || trips.length === 0) return [];

  const { data: members } = await supabase
    .from("trip_members")
    .select("trip_id")
    .in("trip_id", tripIds)
    .eq("status", "accepted");
  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(m.trip_id, (memberCounts.get(m.trip_id) ?? 0) + 1);
  }

  const organizerIds = Array.from(new Set(trips.map((t) => t.organizer_id).filter(Boolean)));
  const trustByOrganizer = new Map<string, number>();
  if (organizerIds.length > 0) {
    const { data: trustRows } = await supabase.from("trust_scores").select("user_id, score").in("user_id", organizerIds);
    for (const r of trustRows ?? []) trustByOrganizer.set(r.user_id, Number(r.score));
  }

  const byId = new Map(trips.map((t) => [t.id, t]));
  // Preserve the caller's saved_trips.created_at order (most-recently
  // saved first) rather than whatever order `.in()` happened to return.
  return saves
    .map((s) => byId.get(s.trip_id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t): ExploreTrip => {
      const dest = Array.isArray(t.destinations) ? t.destinations[0] : t.destinations;
      const organizer = Array.isArray(t.users) ? t.users[0] : t.users;
      const joined = memberCounts.get(t.id) ?? 0;
      const trust = trustByOrganizer.get(t.organizer_id);
      return {
        id: t.id,
        destination: dest?.name ?? "—",
        title: t.title,
        dates: formatTripListingDates({
          kind: t.kind,
          availabilityStart: t.availability_start,
          availabilityEnd: t.availability_end,
          durationMin: t.duration_min,
          durationMax: t.duration_max,
          fixedStartDate: t.fixed_start_date,
          fixedEndDate: t.fixed_end_date,
        }),
        organizer: organizer?.name ?? "Trip Organizer",
        trust: trust !== undefined ? trust.toFixed(1) : "5.0",
        members: `${joined}/${t.max_group_size}`,
        budget: formatTripListingBudget({ kind: t.kind, budgetMin: t.budget_min, budgetMax: t.budget_max, price: t.price }),
        type: t.kind === "verified_partner" ? "partner" : "community",
        imgSrc: dest?.cover_image_url ?? "/placeholders/manali.svg",
        minAge: t.min_age,
        maxAge: t.max_age,
        genderRestriction: t.gender_restriction,
        budgetMin: t.budget_min,
        budgetMax: t.budget_max,
        durationMin: t.duration_min,
        durationMax: t.duration_max,
        price: t.price,
        originalPrice: t.original_price,
      };
    });
}
