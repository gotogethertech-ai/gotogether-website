import { createClient } from "@/lib/supabase/client";
import type {
  ActiveTrip,
  PendingRequest,
  UpcomingTrip,
  PastGoingTrip,
  RecentRequest,
} from "@/lib/my-trips-data";
import { formatTripTiming, daysUntilAvailabilityStart } from "@/lib/trip-dates";

/**
 * Real "my relationship to trips I'm going on" reads, replacing the
 * hardcoded arrays in lib/my-trips-data.ts (activeTrips, pendingRequests,
 * upcomingTrips, pastGoingTrips, recentRequests) — this app is a real
 * product now, not a design showcase (see the Aug 23 "not a showcase"
 * instruction, reiterated for the "Going" tab specifically).
 *
 * Source of truth: join_requests (this user's own requests, RLS-scoped to
 * their own rows) and trip_members (this user's own accepted/left/removed
 * memberships). No fallback to sample data — an empty result is rendered
 * as an honest empty state by the calling components, same as every other
 * real-data page in this pass.
 *
 * Trip rows are fetched as a separate batched query (rather than an
 * embedded `trips(...)` select) because Supabase's generated types can't
 * infer a dynamically-built embedded-select string, which otherwise
 * collapses every row to `GenericStringError`.
 */

type TripRow = {
  id: string;
  title: string;
  status: string;
  availability_start: string | null;
  availability_end: string | null;
  duration_min: number | null;
  duration_max: number | null;
  destinations: { name: string | null; cover_image_url: string | null } | { name: string | null; cover_image_url: string | null }[] | null;
  users: { name: string | null } | { name: string | null }[] | null;
};

function oneOf<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

function formatTiming(trip: TripRow): string {
  return formatTripTiming({
    availabilityStart: trip.availability_start,
    availabilityEnd: trip.availability_end,
    durationMin: trip.duration_min,
    durationMax: trip.duration_max,
  });
}

function daysAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
}

export type GoingData = {
  active: ActiveTrip[];
  pending: PendingRequest[];
  upcoming: UpcomingTrip[];
  past: PastGoingTrip[];
  recentRequests: RecentRequest[];
};

const EMPTY: GoingData = { active: [], pending: [], upcoming: [], past: [], recentRequests: [] };

/** Everything the "Going" side of My Trips needs, in one pass: the
 * priority-zone active banner + pending/waitlisted requests, plus the
 * Going tab's upcoming/past/recent-requests lists. Kept as one function
 * (rather than five) since they all read from the same two small tables
 * for one user and MyTripsClient needs all of them together anyway. */
export async function getMyGoingTrips(userId: string): Promise<GoingData> {
  const supabase = createClient();

  const [{ data: memberships }, { data: requests }] = await Promise.all([
    supabase
      .from("trip_members")
      .select("trip_id, status, joined_at")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false }),
    supabase
      .from("join_requests")
      .select("trip_id, status, requested_at, decided_at")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false }),
  ]);

  if (!memberships?.length && !requests?.length) return EMPTY;

  const tripIds = Array.from(
    new Set([...(memberships ?? []).map((m) => m.trip_id), ...(requests ?? []).map((r) => r.trip_id)])
  );
  const tripsById = new Map<string, TripRow>();
  if (tripIds.length > 0) {
    const { data: trips } = await supabase
      .from("trips")
      .select(
        "id, title, status, availability_start, availability_end, duration_min, duration_max, destinations(name, cover_image_url), users!trips_organizer_id_fkey(name)"
      )
      .in("id", tripIds);
    for (const t of trips ?? []) tripsById.set(t.id, t as TripRow);
  }

  const active: ActiveTrip[] = [];
  const upcoming: UpcomingTrip[] = [];
  const past: PastGoingTrip[] = [];

  // "Review window open" = at least one accepted co-traveller on this
  // completed trip the caller hasn't reviewed yet. Computed as one batched
  // pass across every completed trip the caller is a member of, rather
  // than a query per trip, then looked up per-trip below — mirrors
  // lib/real-reviews.ts's per-trip logic but batched for a list view.
  const completedTripIds = (memberships ?? [])
    .filter((m) => m.status === "accepted" && tripsById.get(m.trip_id)?.status === "completed")
    .map((m) => m.trip_id);
  const reviewWindowOpenByTrip = new Map<string, boolean>();
  if (completedTripIds.length > 0) {
    const [{ data: coMembers }, { data: myReviews }] = await Promise.all([
      supabase
        .from("trip_members")
        .select("trip_id, user_id")
        .in("trip_id", completedTripIds)
        .eq("status", "accepted")
        .neq("user_id", userId),
      supabase.from("reviews").select("trip_id, reviewee_id").eq("reviewer_id", userId).in("trip_id", completedTripIds),
    ]);
    const reviewedPairs = new Set((myReviews ?? []).map((r) => `${r.trip_id}:${r.reviewee_id}`));
    for (const tripId of completedTripIds) {
      // Uses accepted co-members only (a heuristic for whether to show the
      // "Leave Review" button) — the review page itself
      // (lib/real-reviews.ts) is the authoritative check and additionally
      // covers an organizer who never got a trip_members row, so this can
      // under-show but never over-show the button.
      const coMemberIds = (coMembers ?? []).filter((c) => c.trip_id === tripId).map((c) => c.user_id);
      const hasUnreviewed = coMemberIds.some((id) => !reviewedPairs.has(`${tripId}:${id}`));
      reviewWindowOpenByTrip.set(tripId, hasUnreviewed);
    }
  }

  for (const m of memberships ?? []) {
    const trip = tripsById.get(m.trip_id);
    if (!trip) continue;
    const dest = oneOf(trip.destinations);
    const imgSrc = dest?.cover_image_url ?? "/placeholders/manali.svg";

    if (m.status === "accepted") {
      if (trip.status === "in_progress") {
        active.push({ tripId: trip.id, title: trip.title, role: "going", imgSrc });
      } else if (trip.status === "live" || trip.status === "draft") {
        const remaining = daysUntilAvailabilityStart(trip.availability_start);
        upcoming.push({
          tripId: trip.id,
          destination: dest?.name ?? "—",
          dates: formatTiming(trip),
          countdown: remaining >= 0 ? `in ${remaining} day${remaining === 1 ? "" : "s"}` : "underway",
          title: trip.title,
          status: "Confirmed",
          imgSrc,
        });
      } else if (trip.status === "completed") {
        past.push({
          tripId: trip.id,
          destination: dest?.name ?? "—",
          dates: formatTiming(trip),
          title: trip.title,
          status: "Completed",
          reviewWindowOpen: reviewWindowOpenByTrip.get(trip.id) ?? false,
          imgSrc,
        });
      } else if (trip.status === "cancelled") {
        past.push({
          tripId: trip.id,
          destination: dest?.name ?? "—",
          dates: formatTiming(trip),
          title: trip.title,
          status: "Cancelled",
          reason: "This trip was cancelled by the organizer.",
          imgSrc,
        });
      }
    } else if (m.status === "removed") {
      past.push({
        tripId: trip.id,
        destination: dest?.name ?? "—",
        dates: formatTiming(trip),
        title: trip.title,
        status: "Removed",
        imgSrc,
      });
    }
  }

  const pending: PendingRequest[] = [];
  const recentRequests: RecentRequest[] = [];
  let waitlistIndex = 0;

  for (const r of requests ?? []) {
    const trip = tripsById.get(r.trip_id);
    if (!trip) continue;
    const organizer = oneOf(trip.users);

    if (r.status === "pending" || r.status === "waitlisted") {
      if (r.status === "waitlisted") waitlistIndex += 1;
      pending.push({
        tripId: trip.id,
        title: trip.title,
        dates: formatTiming(trip),
        organizer: organizer?.name ?? "Trip Organizer",
        status: r.status === "waitlisted" ? "waitlist" : "pending",
        waitlistPosition: r.status === "waitlisted" ? waitlistIndex : undefined,
        requestedDaysAgo: daysAgo(r.requested_at),
      });
    } else if (r.status === "rejected") {
      recentRequests.push({
        tripId: trip.id,
        title: trip.title,
        status: "rejected",
        daysAgo: daysAgo(r.decided_at ?? r.requested_at),
        cooldownElapsed: daysAgo(r.decided_at ?? r.requested_at) >= 7,
      });
    }
  }

  return { active, pending, upcoming, past, recentRequests };
}

/** Withdraw a still-open (pending/waitlisted) join request. Allowed by the
 * join_requests_withdraw_self RLS policy (migration 012), which lets the
 * requester update only their own still-open row — the pre-existing
 * join_requests_update policy only covered the trip organizer. There's no
 * delete policy so this marks it "withdrawn" rather than removing the
 * row. */
export async function withdrawJoinRequest(tripId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("join_requests")
    .update({ status: "withdrawn", decided_at: new Date().toISOString() })
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .in("status", ["pending", "waitlisted"]);
  if (error) throw new Error(error.message);
}
