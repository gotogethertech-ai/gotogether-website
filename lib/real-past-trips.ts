import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Real "Past Trips" homepage showcase — completed trips (status =
 * 'completed', set only via the organizer's explicit "Mark as Completed"
 * action in Host Management, never automatically by date — see migration
 * 035/036's mark_trip_completed()). Server Component only (app/page.tsx),
 * same next/headers bundling reasoning as lib/real-homepage-server.ts.
 *
 * Deliberately does NOT reuse fetchLiveTrips (lib/real-explore-shared.ts) —
 * that helper hardcodes `.in("status", ["live", "in_progress"])` and this
 * needs `status = 'completed'` instead, plus a much thinner shape (no
 * pricing/budget/trust — Past Trips is a proof-of-activity showcase, not
 * a joinable listing).
 */
export type PastTrip = {
  id: string;
  title: string;
  destination: string;
  dates: string;
  memberCount: number;
  imgSrc: string;
  imgAlt: string;
};

export async function getRecentCompletedTrips(limit = 6): Promise<PastTrip[]> {
  const supabase = await createServerSupabaseClient();

  const { data: trips, error } = await supabase
    .from("trips")
    .select(
      "id, title, availability_start, availability_end, fixed_start_date, fixed_end_date, kind, destinations(name, cover_image_url)"
    )
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !trips || trips.length === 0) return [];

  const tripIds = trips.map((t) => t.id);
  const { data: members } = await supabase
    .from("trip_members")
    .select("trip_id")
    .in("trip_id", tripIds)
    .eq("status", "accepted");
  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(m.trip_id, (memberCounts.get(m.trip_id) ?? 0) + 1);
  }

  return trips.map((t) => {
    const dest = Array.isArray(t.destinations) ? t.destinations[0] : t.destinations;
    const start = t.kind === "verified_partner" ? t.fixed_start_date : t.availability_start;
    const end = t.kind === "verified_partner" ? t.fixed_end_date : t.availability_end;
    return {
      id: t.id,
      title: t.title,
      destination: dest?.name ?? "—",
      dates: formatCompletedRange(start, end),
      memberCount: memberCounts.get(t.id) ?? 0,
      imgSrc: dest?.cover_image_url ?? "/placeholders/manali.svg",
      imgAlt: dest?.name ?? t.title,
    };
  });
}

function formatCompletedRange(start: string | null, end: string | null): string {
  if (!start) return "";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startLabel = new Date(start).toLocaleDateString("en-US", opts);
  if (!end || end === start) return startLabel;
  return `${startLabel} – ${new Date(end).toLocaleDateString("en-US", opts)}`;
}
