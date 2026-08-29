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
        trip_title_override?: string | null;
        users: { name: string; initials: string | null } | { name: string; initials: string | null }[] | null;
        trips: { title: string } | { title: string }[] | null;
      }[]
    | null
): Review[] {
  if (!rows) return [];
  return rows.map((r) => {
    const reviewer = Array.isArray(r.users) ? r.users[0] : r.users;
    const trip = Array.isArray(r.trips) ? r.trips[0] : r.trips;
    // reviewer_display_name (migration 043) overrides the shown name.
    // reviewer_id is always a real users row (NOT NULL, defaults to the
    // acting admin when Add Review's reviewer field wasn't tied to a
    // specific account) — so it's only safe to link the name to that
    // account when the shown name actually IS that account's real name:
    // either a normal peer review (no override at all), or an admin
    // review where the typed name matches the picked account's real name
    // exactly. Any other override means no real account backs the shown
    // name, so the link is suppressed.
    const name = r.reviewer_display_name ?? reviewer?.name ?? "GoTogether Member";
    const nameMatchesLinkedAccount = !r.reviewer_display_name || r.reviewer_display_name === reviewer?.name;
    return {
      id: r.id,
      reviewerId: nameMatchesLinkedAccount ? r.reviewer_id : undefined,
      reviewerName: name,
      reviewerInitials: r.reviewer_display_name ? initialsFrom(name) : reviewer?.initials ?? initialsFrom(name),
      rating: r.rating,
      tripName: r.trip_title_override ?? trip?.title ?? "",
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
      .select("id, rating, comment, created_at, reviewer_id, reviewer_display_name, trip_title_override, users!reviews_reviewer_id_fkey(name, initials), trips(title)")
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
