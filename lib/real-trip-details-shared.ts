import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TripDetail, TripStatus } from "@/lib/trip-details";
import { formatAvailabilityWindow, formatDurationRange } from "@/lib/trip-dates";

/**
 * Shape-only helpers shared between the client (lib/real-trip-details.ts)
 * and server (lib/real-trip-details-server.ts) trip readers. Deliberately
 * has NO import of either @/lib/supabase/client or @/lib/supabase/server —
 * the server client pulls in next/headers, which breaks the build the
 * moment anything importing it gets bundled into a Client Component (see
 * TripActionPanel.tsx). Splitting the shaping logic out here keeps that
 * import out of the client bundle entirely.
 */

export type SupaClient = SupabaseClient<Database>;

function mapStatus(status: Database["public"]["Enums"]["trip_status"], joined: number, max: number): TripStatus {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "hidden" || status === "draft") return "closed";
  if (max > 0 && joined >= max) return "full";
  return "open";
}

function formatBudget(min: number | null, max: number | null): string {
  if (min && max && min !== max) return `₹${min.toLocaleString("en-IN")}–${max.toLocaleString("en-IN")}`;
  const n = max ?? min;
  return n ? `₹${n.toLocaleString("en-IN")}` : "";
}

export async function fetchTripDetail(supabase: SupaClient, id: string): Promise<TripDetail | null> {
  const { data: trip, error } = await supabase
    .from("trips")
    .select(
      "id, title, description, kind, status, availability_start, availability_end, duration_min, duration_max, budget_min, budget_max, max_group_size, min_age, max_age, gender_restriction, organizer_id, destinations(name, cover_image_url), users!trips_organizer_id_fkey(name, verification_status, avatar_url)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !trip) return null;

  const { count: membersJoined } = await supabase
    .from("trip_members")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", id)
    .eq("status", "accepted");

  const { data: memberRows } = await supabase
    .from("trip_members")
    .select("user_id, joined_at, users(name, avatar_url)")
    .eq("trip_id", id)
    .eq("status", "accepted")
    .neq("user_id", trip.organizer_id)
    .order("joined_at", { ascending: true });

  const { data: trustRow } = await supabase
    .from("trust_scores")
    .select("score")
    .eq("user_id", trip.organizer_id)
    .maybeSingle();

  const dest = Array.isArray(trip.destinations) ? trip.destinations[0] : trip.destinations;
  const organizer = Array.isArray(trip.users) ? trip.users[0] : trip.users;
  const joined = membersJoined ?? 0;

  return {
    id: trip.id,
    destination: dest?.name ?? "—",
    region: dest?.name ? `${dest.name}, India` : "—",
    title: trip.title,
    dates: formatAvailabilityWindow(trip.availability_start, trip.availability_end),
    duration: formatDurationRange(trip.duration_min, trip.duration_max),
    tripType: "",
    budgetLabel: trip.kind === "verified_partner" ? "Price" : "Estimated budget",
    budget: formatBudget(trip.budget_min, trip.budget_max),
    kind: trip.kind === "verified_partner" ? "partner" : "community",
    status: mapStatus(trip.status, joined, trip.max_group_size),
    imgSrc: dest?.cover_image_url ?? "/placeholders/manali.svg",
    organizer: {
      kind: "individual",
      id: trip.organizer_id,
      name: organizer?.name ?? "Trip Organizer",
      avatarUrl: organizer?.avatar_url ?? null,
      tripsHosted: 1,
      responseTime: "Usually responds within a day",
      trustScore: trustRow ? Number(trustRow.score).toFixed(1) : "5.0",
      verified: organizer?.verification_status === "id_verified",
    },
    membersJoined: joined,
    membersMax: trip.max_group_size,
    members: (memberRows ?? []).map((m) => {
      const u = Array.isArray(m.users) ? m.users[0] : m.users;
      return { id: m.user_id, name: u?.name ?? "GoTogether Member", avatarUrl: u?.avatar_url ?? null };
    }),
    about: trip.description ?? "No description added yet.",
    minAge: trip.min_age,
    maxAge: trip.max_age,
    genderRestriction: trip.gender_restriction,
  };
}
