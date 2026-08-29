import { createClient } from "@/lib/supabase/client";
import type { ProfileData, Review } from "@/lib/profiles-data";

/**
 * Real-user profile data, sourced from Supabase (public.users +
 * trust_scores), shaped into the same ProfileData contract the existing
 * ProfileSections components already render.
 *
 * Honesty rule: the trips/reviews/badges/join-request system has no real
 * backend yet (public.trips, trip_members, reviews all have 0 rows in
 * production — the rest of the app still runs on lib/trip-details.ts mock
 * data). So every field this file can't back with a real row defaults to
 * an honest zero/empty value rather than a fabricated number, per the
 * project's own no-fabricated-data principle (see auth-context.tsx). The
 * 4 Travel Activity stats are the one exception: they read
 * users.trips_joined_override / trips_completed_override /
 * trips_organized_override / cities_explored_override (migration 041) —
 * explicit admin-set numbers (unset = null = still renders as 0), not a
 * computed count. When the trips backend is built, only the "activity"
 * section below needs to change to real computed counts —
 * identity/verification/trust score already read real data.
 */

const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function verificationBadges(status: string): { label: string; description: string }[] {
  const badges: { label: string; description: string }[] = [];
  if (status === "phone_verified" || status === "id_pending" || status === "id_verified") {
    badges.push({ label: "Email Verified", description: "Signed in with a verified Google account" });
  }
  if (status === "id_verified") {
    badges.push({ label: "ID Verified", description: "Identity confirmed through an official government-issued document" });
  }
  return badges;
}

/** Shapes raw `reviews` rows (joined to reviewer name/initials and trip
 * title) into the ProfileData.reviews contract. Shared shape logic between
 * the client (this file) and server (real-profile-server.ts) readers. */
export function shapeReviews(
  rows:
    | {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        reviewer_id: string;
        users: { name: string; initials: string | null } | { name: string; initials: string | null }[] | null;
        trips: { title: string } | { title: string }[] | null;
      }[]
    | null
): Review[] {
  if (!rows) return [];
  return rows.map((r) => {
    const reviewer = Array.isArray(r.users) ? r.users[0] : r.users;
    const trip = Array.isArray(r.trips) ? r.trips[0] : r.trips;
    const name = reviewer?.name ?? "GoTogether Member";
    return {
      id: r.id,
      reviewerId: r.reviewer_id,
      reviewerName: name,
      reviewerInitials: reviewer?.initials ?? initialsFrom(name),
      tripName: trip?.title ?? "",
      date: MONTH_YEAR.format(new Date(r.created_at)),
      text: r.comment ?? "",
      tags: [],
    };
  });
}

/**
 * Fetch a real user's profile by their Supabase auth id (public.users.id)
 * and shape it into ProfileData. Returns null if no such user exists.
 */
export async function getRealProfileById(userId: string): Promise<ProfileData | null> {
  const supabase = createClient();
  const [{ data: row }, { data: trust }, { data: reviewRows }] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).maybeSingle(),
    supabase.from("trust_scores").select("score").eq("user_id", userId).maybeSingle(),
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, reviewer_id, users!reviews_reviewer_id_fkey(name, initials), trips(title)")
      .eq("reviewee_id", userId)
      .eq("visibility", "published")
      .order("created_at", { ascending: false }),
  ]);

  if (!row) return null;

  const memberSince = row.created_at ? MONTH_YEAR.format(new Date(row.created_at)) : "";
  const reviews = shapeReviews(reviewRows);

  return {
    slug: row.id,
    name: row.name,
    initials: row.initials ?? initialsFrom(row.name),
    avatarUrl: row.avatar_url,
    city: "",
    memberSince,
    bio: row.bio ?? "",
    verifications: verificationBadges(row.verification_status),
    trustScore: Number(trust?.score ?? 5),
    reviewCount: reviews.length,
    tripsCompleted: row.trips_completed_override ?? 0,
    stats: {
      tripsJoined: row.trips_joined_override ?? 0,
      tripsCompleted: row.trips_completed_override ?? 0,
      tripsOrganized: row.trips_organized_override ?? 0,
      citiesExplored: row.cities_explored_override ?? 0,
      responseRate: null,
      avgReplyTime: null,
      memberSince,
    },
    badges: [],
    trustBreakdown: [],
    reviews,
    history: [],
  };
}

/** UUIDs (Supabase user ids) always look like this — used to decide
 * whether a /profile/[slug] route should be resolved against real
 * Supabase data or against the legacy mock profiles (still used by
 * trip/organizer/member/review UI that has no real backend yet). */
export function looksLikeUserId(slug: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
}
