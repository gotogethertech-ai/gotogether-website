import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ExploreTrip } from "@/lib/mock-data";
import { formatTripListingDates, formatTripListingBudget } from "@/lib/trip-dates";

/**
 * Shared trip-list fetch + shaping, used by both the client Explore page
 * (lib/real-explore.ts) and the server-rendered homepage
 * (lib/real-explore-server.ts). No import of lib/supabase/client or
 * lib/supabase/server here — same next/headers bundling concern as
 * lib/real-trip-details-shared.ts.
 */

type SupaClient = SupabaseClient<Database>;

export async function fetchLiveTrips(supabase: SupaClient, limit?: number): Promise<ExploreTrip[]> {
  let query = supabase
    .from("trips")
    .select(
      "id, title, kind, status, availability_start, availability_end, duration_min, duration_max, budget_min, budget_max, fixed_start_date, fixed_end_date, price, original_price, max_group_size, min_age, max_age, gender_restriction, organizer_id, destinations(name, cover_image_url), users!trips_organizer_id_fkey(name)"
    )
    .in("status", ["live", "in_progress"])
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data: allTrips, error } = await query;
  if (error || !allTrips) return [];

  // A community trip stops taking new joiners once its availability window
  // has fully passed (joining closes at availability_end, not at the
  // window's start — see the Aug 28 trip-lifecycle discussion). This is a
  // query-time filter only: the trip's DB status stays "live" until the
  // organizer explicitly marks it completed via Host Management. Partner
  // trips are excluded from this filter — they run on fixed_start_date/
  // fixed_end_date, a different (confirmed-departure) date model.
  const todayIso = new Date().toISOString().slice(0, 10);
  const trips = allTrips.filter(
    (t) => t.kind === "verified_partner" || !t.availability_end || t.availability_end >= todayIso
  );

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

  const organizerIds = Array.from(new Set(trips.map((t) => t.organizer_id).filter(Boolean)));
  const trustByOrganizer = new Map<string, number>();
  if (organizerIds.length > 0) {
    const { data: trustRows } = await supabase.from("trust_scores").select("user_id, score").in("user_id", organizerIds);
    for (const r of trustRows ?? []) trustByOrganizer.set(r.user_id, Number(r.score));
  }

  return trips.map((t): ExploreTrip => {
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
