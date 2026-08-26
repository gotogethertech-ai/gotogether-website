import { createClient } from "@/lib/supabase/client";
import type { TripDetail } from "@/lib/trip-details";
import { fetchTripDetail } from "@/lib/real-trip-details-shared";

/**
 * Client-side real trip reads/writes — used by Client Components (Trip
 * Details' interactive panel, Host Management, etc.). Deliberately does
 * NOT import lib/supabase/server (which pulls in next/headers and breaks
 * the build if it ends up in a client bundle) — see
 * lib/real-trip-details-server.ts for the Server Component counterpart,
 * and lib/real-trip-details-shared.ts for the shaping logic both share.
 */

export async function getRealTripDetail(id: string): Promise<TripDetail | null> {
  return fetchTripDetail(createClient(), id);
}

export type ViewerRelationship = "none" | "pending" | "member" | "host";

/** Real viewer-relationship lookup, replacing lib/trip-relationship.ts's
 * mock-array scan. Checked in order: organizer -> accepted member ->
 * pending/waitlisted join request -> none. */
export async function getRealTripRelationship(tripId: string, userId: string | null): Promise<ViewerRelationship> {
  if (!userId) return "none";
  const supabase = createClient();

  const { data: trip } = await supabase.from("trips").select("organizer_id").eq("id", tripId).maybeSingle();
  if (trip?.organizer_id === userId) return "host";

  const { data: membership } = await supabase
    .from("trip_members")
    .select("status")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();
  if (membership) return "member";

  const { data: request } = await supabase
    .from("join_requests")
    .select("status")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .in("status", ["pending", "waitlisted"])
    .maybeSingle();
  if (request) return "pending";

  return "none";
}

/** Sends a real join request — inserted under join_requests_insert_self
 * RLS (auth.uid() must equal user_id). A trip already at capacity is
 * inserted as "waitlisted" instead of "pending" so it lands directly on
 * the organizer's Waiting List, matching the FIFO promotion invariant
 * (requested_at is the ordering key — see migration 002's comment). */
export async function sendJoinRequest(tripId: string, userId: string, isFull: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("join_requests").insert({
    trip_id: tripId,
    user_id: userId,
    status: isFull ? "waitlisted" : "pending",
  });
  if (error) throw new Error(error.message);
}

/** Removes the caller's own accepted membership (Leave Trip). RLS's
 * trip_members_update policy allows a member to update their own row. */
export async function leaveTrip(tripId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("trip_members")
    .update({ status: "left", left_at: new Date().toISOString() })
    .eq("trip_id", tripId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
