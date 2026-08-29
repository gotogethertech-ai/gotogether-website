import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileData, Review } from "@/lib/profiles-data";

/** Server-component counterpart to lib/real-profile.ts's getRealProfileById
 * — same shaping logic, but via the server Supabase client (cookie-based
 * session, used from Server Components like app/profile/[slug]/page.tsx
 * where the browser client isn't available). See real-profile.ts for the
 * honesty-rule rationale on which fields are real vs. honest zeros. */

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
 * title) into the ProfileData.reviews contract. Duplicated from
 * real-profile.ts rather than shared, since that file imports the
 * "use client" browser Supabase client — importing it here would pull
 * that into the server bundle. */
function shapeReviews(
  rows:
    | {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        reviewer_id: string;
        reviewer_display_name?: string | null;
        users: { name: string; initials: string | null } | { name: string; initials: string | null }[] | null;
        trips: { title: string } | { title: string }[] | null;
      }[]
    | null
): Review[] {
  if (!rows) return [];
  return rows.map((r) => {
    const reviewer = Array.isArray(r.users) ? r.users[0] : r.users;
    const trip = Array.isArray(r.trips) ? r.trips[0] : r.trips;
    // reviewer_display_name (migration 043) overrides the real linked
    // account's name for an admin-authored review typed under a free-text
    // name — null for every normal peer review.
    const name = r.reviewer_display_name ?? reviewer?.name ?? "GoTogether Member";
    return {
      id: r.id,
      reviewerId: r.reviewer_display_name ? undefined : r.reviewer_id,
      reviewerName: name,
      reviewerInitials: r.reviewer_display_name ? initialsFrom(name) : reviewer?.initials ?? initialsFrom(name),
      tripName: trip?.title ?? "",
      date: MONTH_YEAR.format(new Date(r.created_at)),
      text: r.comment ?? "",
      tags: [],
    };
  });
}

export async function getRealProfileByIdServer(userId: string): Promise<ProfileData | null> {
  const supabase = await createServerSupabaseClient();
  const [{ data: row }, { data: trust }, { data: reviewRows }] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).maybeSingle(),
    supabase.from("trust_scores").select("score").eq("user_id", userId).maybeSingle(),
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, reviewer_id, reviewer_display_name, users!reviews_reviewer_id_fkey(name, initials), trips(title)")
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
 * Supabase data or against the legacy mock profiles. */
export function looksLikeUserId(slug: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
}
