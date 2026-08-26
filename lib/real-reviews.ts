import { createClient } from "@/lib/supabase/client";

/**
 * Real trip reviews — the last unwired piece of the trust system. Profiles
 * and company pages have displayed ratings since early in the project, but
 * nothing let a traveller actually write one; this closes that loop.
 *
 * Reviews here are peer-to-peer (one accepted trip member rating another
 * accepted member from that same completed trip — organizer included on
 * both sides), matching the reviews_insert_eligible RLS policy and the
 * submit_trip_review RPC (migration 032) exactly: both independently
 * enforce trip.status = 'completed' and accepted membership for both
 * parties, so this reader/writer can't be tricked into showing or
 * submitting something the database would reject anyway.
 *
 * Submission goes through submit_trip_review rather than a raw insert
 * because recompute_trust_score (which must run after every new review so
 * Trust Score stays live) is SECURITY DEFINER and not grantable to
 * `authenticated` directly — the RPC does insert + recompute + notify the
 * reviewee in one transaction.
 */

export type ReviewableCoTraveller = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isOrganizer: boolean;
  alreadyReviewed: boolean;
};

/** Every accepted co-traveller on a completed trip the caller could
 * review — organizer plus every other accepted member, minus the caller
 * themself, each flagged with whether the caller already reviewed them
 * for this trip (submit_trip_review rejects a duplicate, so the UI hides
 * it up front instead of surfacing a server error). Returns an empty list
 * (not an error) if the trip isn't completed or the caller wasn't an
 * accepted member — the same conditions the RPC itself enforces. */
export async function getReviewableCoTravellers(
  tripId: string,
  callerId: string
): Promise<{ tripTitle: string; people: ReviewableCoTraveller[] }> {
  const supabase = createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select("title, status, organizer_id")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip || trip.status !== "completed") return { tripTitle: trip?.title ?? "", people: [] };

  const { data: callerMembership } = await supabase
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", callerId)
    .eq("status", "accepted")
    .maybeSingle();
  if (!callerMembership) return { tripTitle: trip.title, people: [] };

  const { data: memberRows } = await supabase
    .from("trip_members")
    .select("user_id, users(name, avatar_url)")
    .eq("trip_id", tripId)
    .eq("status", "accepted")
    .neq("user_id", callerId);

  const { data: alreadyReviewed } = await supabase
    .from("reviews")
    .select("reviewee_id")
    .eq("trip_id", tripId)
    .eq("reviewer_id", callerId);
  const reviewedIds = new Set((alreadyReviewed ?? []).map((r) => r.reviewee_id));

  const people: ReviewableCoTraveller[] = (memberRows ?? []).map((m) => {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    return {
      id: m.user_id,
      name: u?.name ?? "GoTogether Member",
      avatarUrl: u?.avatar_url ?? null,
      isOrganizer: m.user_id === trip.organizer_id,
      alreadyReviewed: reviewedIds.has(m.user_id),
    };
  });

  // Organizer might not appear in trip_members if they never "joined"
  // their own trip as a member row — add them explicitly when missing.
  if (trip.organizer_id !== callerId && !people.some((p) => p.id === trip.organizer_id)) {
    const { data: organizer } = await supabase
      .from("users")
      .select("name, avatar_url")
      .eq("id", trip.organizer_id)
      .maybeSingle();
    if (organizer) {
      people.unshift({
        id: trip.organizer_id,
        name: organizer.name,
        avatarUrl: organizer.avatar_url,
        isOrganizer: true,
        alreadyReviewed: reviewedIds.has(trip.organizer_id),
      });
    }
  }

  // Organizer first, then everyone else in the order returned.
  people.sort((a, b) => Number(b.isOrganizer) - Number(a.isOrganizer));

  return { tripTitle: trip.title, people };
}

/** Submits one review via the submit_trip_review RPC — validated
 * server-side (trip completed, both accepted members, no duplicate,
 * rating 1-5), and updates the reviewee's Trust Score + notifies them as
 * part of the same transaction. Throws with a message safe to show the
 * user on any rejection. */
export async function submitReview(params: {
  tripId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("submit_trip_review", {
    p_trip_id: params.tripId,
    p_reviewee_id: params.revieweeId,
    p_rating: params.rating,
    p_comment: params.comment?.trim() || undefined,
  });
  if (error) {
    throw new Error(error.message || "Couldn't submit your review. Try again.");
  }
}

/** Whether this trip still has at least one un-reviewed accepted
 * co-traveller for the caller — drives the "Leave Review" affordance on
 * My Trips' past-trips list. */
export async function hasReviewableCoTravellers(tripId: string, callerId: string): Promise<boolean> {
  const { people } = await getReviewableCoTravellers(tripId, callerId);
  return people.some((p) => !p.alreadyReviewed);
}
