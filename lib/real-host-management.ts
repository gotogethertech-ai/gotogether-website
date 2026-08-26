import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type {
  PendingApplicant,
  Participant,
  WaitingListEntry,
  HostManagementRecord,
} from "@/lib/host-management-data";
import type { HostedTrip } from "@/lib/my-trips-data";
import { formatTripTiming } from "@/lib/trip-dates";

/**
 * Real Host Trip Management reads + writes, replacing lib/host-management-data.ts's
 * hardcoded per-trip mock records. Every read/write here goes through the
 * real Supabase client under the trips_update_own / trip_members_* /
 * join_requests_* RLS policies (organizer_id must equal auth.uid() — see
 * migration 006/008's policy definitions), so a host can only ever manage
 * their own real trips.
 */

function daysAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

// Requests older than this many hours are treated as past their SLA
// (hoursRemaining floors at 0) — matches the mock data's "urgent at <=24h"
// convention without inventing a real SLA policy that doesn't exist yet.
const REQUEST_SLA_HOURS = 72;

function hoursRemaining(iso: string): number {
  const elapsedHours = (Date.now() - new Date(iso).getTime()) / 3600000;
  return Math.max(0, Math.round(REQUEST_SLA_HOURS - elapsedHours));
}

/** Fetch the real trip (as a HostedTrip, for the parts of the UI that
 * still expect that shape) plus its pending/accepted/waitlisted rows. Only
 * returns data for a trip the caller organizes — callers should already
 * be gating on that via the page's own auth flow, but every write below
 * also re-checks it through RLS regardless. */
export async function getRealHostManagement(
  tripId: string,
  organizerId: string
): Promise<{ trip: HostedTrip; record: HostManagementRecord } | null> {
  const supabase = createClient();

  const { data: trip, error } = await supabase
    .from("trips")
    .select(
      "id, title, status, availability_start, availability_end, duration_min, duration_max, max_group_size, organizer_id, cancellation_reason, destinations(name, cover_image_url)"
    )
    .eq("id", tripId)
    .maybeSingle();

  if (error || !trip || trip.organizer_id !== organizerId) return null;

  const [{ data: joinRequests }, { data: members }] = await Promise.all([
    supabase
      .from("join_requests")
      .select("id, user_id, status, requested_at, users(name, initials)")
      .eq("trip_id", tripId)
      .order("requested_at", { ascending: true }),
    supabase
      .from("trip_members")
      .select("id, user_id, joined_at, status, users(name, initials)")
      .eq("trip_id", tripId)
      .eq("status", "accepted")
      .order("joined_at", { ascending: true }),
  ]);

  const trustByUser = new Map<string, number>();
  const userIds = [
    ...(joinRequests ?? []).map((r) => r.user_id),
    ...(members ?? []).map((m) => m.user_id),
  ];
  if (userIds.length > 0) {
    const { data: trustRows } = await supabase
      .from("trust_scores")
      .select("user_id, score")
      .in("user_id", Array.from(new Set(userIds)));
    for (const r of trustRows ?? []) trustByUser.set(r.user_id, Number(r.score));
  }

  const pendingApplicants: PendingApplicant[] = (joinRequests ?? [])
    .filter((r) => r.status === "pending")
    .map((r) => {
      const u = Array.isArray(r.users) ? r.users[0] : r.users;
      return {
        id: r.user_id,
        name: u?.name ?? "Traveller",
        initials: u?.initials ?? "?",
        trustScore: (trustByUser.get(r.user_id) ?? 5).toFixed(1),
        requestedDaysAgo: daysAgo(r.requested_at),
        hoursRemaining: hoursRemaining(r.requested_at),
      };
    });

  const waitingList: WaitingListEntry[] = (joinRequests ?? [])
    .filter((r) => r.status === "waitlisted")
    .map((r, i) => {
      const u = Array.isArray(r.users) ? r.users[0] : r.users;
      return {
        id: r.user_id,
        name: u?.name ?? "Traveller",
        initials: u?.initials ?? "?",
        position: i + 1,
      };
    });

  const participants: Participant[] = (members ?? []).map((m) => {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    const isOrganizer = m.user_id === organizerId;
    return {
      id: m.user_id,
      name: isOrganizer ? "You" : u?.name ?? "Traveller",
      initials: u?.initials ?? "?",
      trustScore: (trustByUser.get(m.user_id) ?? 5).toFixed(1),
      role: isOrganizer ? "organizer" : "member",
      joinedDate: isOrganizer ? "Hosted" : `Joined ${new Date(m.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    };
  });

  const dest = Array.isArray(trip.destinations) ? trip.destinations[0] : trip.destinations;
  const hostedTrip: HostedTrip = {
    tripId: trip.id,
    destination: dest?.name ?? "—",
    title: trip.title,
    status: mapStatus(trip.status),
    dates:
      trip.availability_start || trip.availability_end
        ? formatTripTiming({
            availabilityStart: trip.availability_start,
            availabilityEnd: trip.availability_end,
            durationMin: trip.duration_min,
            durationMax: trip.duration_max,
          })
        : undefined,
    membersJoined: participants.length,
    membersMax: trip.max_group_size,
    pendingRequests: pendingApplicants.length,
    waitingListCount: waitingList.length,
    imgSrc: dest?.cover_image_url ?? "/placeholders/manali.svg",
    cancelledReason: trip.cancellation_reason ?? undefined,
  };

  return {
    trip: hostedTrip,
    record: { tripId, pendingApplicants, participants, waitingList },
  };
}

function mapStatus(status: string): HostedTrip["status"] {
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
      return "draft";
  }
}

/** Accept a pending/waitlisted join request: flips it to "accepted" and
 * inserts the matching trip_members row. Not wrapped in a DB transaction
 * (no RPC exists for this yet) — if the membership insert fails after the
 * request is marked accepted, the caller sees an error and the two rows
 * are briefly inconsistent; acceptable for this stage, revisit with an RPC
 * if it proves to be a real problem. */
export async function acceptJoinRequest(tripId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error: reqError } = await supabase
    .from("join_requests")
    .update({ status: "accepted", decided_at: new Date().toISOString() })
    .eq("trip_id", tripId)
    .eq("user_id", userId);
  if (reqError) throw new Error(reqError.message);

  const { error: memberError } = await supabase
    .from("trip_members")
    .insert({ trip_id: tripId, user_id: userId, status: "accepted" });
  if (memberError) throw new Error(memberError.message);
}

export async function rejectJoinRequest(tripId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("join_requests")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("trip_id", tripId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Removes a member (sets their trip_members row to "removed") and, if
 * anyone is waitlisted, promotes the earliest waitlisted join_request to
 * accepted + a fresh trip_members row — mirrors the FIFO auto-promotion
 * invariant from migration 002's comment on join_requests.requested_at. */
export async function removeParticipant(tripId: string, userId: string, reason: string): Promise<void> {
  const supabase = createClient();
  const { error: removeError } = await supabase
    .from("trip_members")
    .update({ status: "removed", left_at: new Date().toISOString(), removed_reason: reason || null })
    .eq("trip_id", tripId)
    .eq("user_id", userId);
  if (removeError) throw new Error(removeError.message);

  const { data: nextInLine } = await supabase
    .from("join_requests")
    .select("user_id")
    .eq("trip_id", tripId)
    .eq("status", "waitlisted")
    .order("requested_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextInLine) {
    await acceptJoinRequest(tripId, nextInLine.user_id);
  }
}

export async function cancelTrip(tripId: string, reason: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("trips")
    .update({
      status: "cancelled",
      cancelled_by_role: "organizer",
      cancellation_reason: reason || null,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", tripId);
  if (error) throw new Error(error.message);
}

export async function publishDraftTrip(tripId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("trips").update({ status: "live" }).eq("id", tripId);
  if (error) throw new Error(error.message);
}

export async function deleteDraftTrip(tripId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) throw new Error(error.message);
}

/** Full editable trip row, for the Edit tab's form — a separate, wider read
 * from HostedTrip (kept thin on purpose for the list/overview views). */
export type EditableTripFields = {
  title: string;
  description: string;
  destinationId: string;
  availabilityStart: string;
  availabilityEnd: string;
  durationMin: number | null;
  durationMax: number | null;
  maxGroupSize: number;
  budgetMin: number | null;
  budgetMax: number | null;
  minAge: number | null;
  maxAge: number | null;
  genderRestriction: "any" | "women_only" | "men_only";
  coverImageUrl: string;
};

export async function getEditableTripFields(tripId: string, organizerId: string): Promise<EditableTripFields | null> {
  const supabase = createClient();
  const { data: trip, error } = await supabase
    .from("trips")
    .select(
      "title, description, destination_id, availability_start, availability_end, duration_min, duration_max, max_group_size, budget_min, budget_max, min_age, max_age, gender_restriction, cover_image_url, organizer_id"
    )
    .eq("id", tripId)
    .maybeSingle();

  if (error || !trip || trip.organizer_id !== organizerId) return null;

  return {
    title: trip.title,
    description: trip.description ?? "",
    destinationId: trip.destination_id ?? "",
    availabilityStart: trip.availability_start ?? "",
    availabilityEnd: trip.availability_end ?? "",
    durationMin: trip.duration_min,
    durationMax: trip.duration_max,
    maxGroupSize: trip.max_group_size,
    budgetMin: trip.budget_min,
    budgetMax: trip.budget_max,
    minAge: trip.min_age,
    maxAge: trip.max_age,
    genderRestriction: trip.gender_restriction,
    coverImageUrl: trip.cover_image_url ?? "",
  };
}

export async function updateTripDetails(
  tripId: string,
  patch: {
    title?: string;
    description?: string;
    destinationId?: string;
    availabilityStart?: string;
    availabilityEnd?: string;
    durationMin?: number | null;
    durationMax?: number | null;
    maxGroupSize?: number;
    budgetMin?: number | null;
    budgetMax?: number | null;
    minAge?: number | null;
    maxAge?: number | null;
    genderRestriction?: "any" | "women_only" | "men_only";
    coverImageUrl?: string;
  }
): Promise<void> {
  const supabase = createClient();
  const update: Database["public"]["Tables"]["trips"]["Update"] = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description || null;
  if (patch.destinationId !== undefined) update.destination_id = patch.destinationId;
  if (patch.availabilityStart !== undefined) update.availability_start = patch.availabilityStart;
  if (patch.availabilityEnd !== undefined) update.availability_end = patch.availabilityEnd;
  if (patch.durationMin !== undefined) update.duration_min = patch.durationMin;
  if (patch.durationMax !== undefined) update.duration_max = patch.durationMax;
  if (patch.maxGroupSize !== undefined) update.max_group_size = patch.maxGroupSize;
  if (patch.budgetMin !== undefined) update.budget_min = patch.budgetMin;
  if (patch.budgetMax !== undefined) update.budget_max = patch.budgetMax;
  if (patch.minAge !== undefined) update.min_age = patch.minAge;
  if (patch.maxAge !== undefined) update.max_age = patch.maxAge;
  if (patch.genderRestriction !== undefined) update.gender_restriction = patch.genderRestriction;
  if (patch.coverImageUrl !== undefined) update.cover_image_url = patch.coverImageUrl || null;
  const { error } = await supabase.from("trips").update(update).eq("id", tripId);
  if (error) throw new Error(error.message);
}

export async function closeRegistrations(tripId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("trips").update({ registrations_closed: true }).eq("id", tripId);
  if (error) throw new Error(error.message);
}
