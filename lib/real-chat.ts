import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TripChat, ChatMessage } from "@/lib/chat-data";
import { formatTripTiming } from "@/lib/trip-dates";

/**
 * Real trip group chat, replacing lib/chat-data.ts's hardcoded
 * tripChats/directMessages — this app is a real product now, not a
 * design showcase (see the Aug 23 "not a showcase" instruction, now
 * applied to chat). Every trip a user is an accepted member of gets a
 * real chat_rooms row and the user a chat_participants row automatically
 * (DB triggers — see migration 013), so this module only reads/writes
 * messages.* and never has to create rooms/participants itself.
 *
 * "Direct messages" (1:1, is_direct = true) aren't provisioned by
 * anything in the app yet — no UI anywhere creates a DM — so the DM list
 * is honestly empty rather than showing fake contacts.
 */

type SupaClient = SupabaseClient<Database>;

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

/** One row per trip group chat this user belongs to, for the left-hand
 * conversation list. Ordered by most recent message first, mirroring the
 * mock data's implicit ordering. Rooms with no messages yet still show
 * (with an empty preview) so a brand-new trip's chat is reachable. */
export async function getMyTripChats(userId: string): Promise<TripChat[]> {
  const supabase = createClient();

  const { data: participantRows } = await supabase
    .from("chat_participants")
    .select("room_id")
    .eq("user_id", userId);
  const roomIds = (participantRows ?? []).map((r) => r.room_id);
  if (roomIds.length === 0) return [];

  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("id, trip_id, is_direct")
    .in("id", roomIds)
    .eq("is_direct", false);
  const tripRooms = (rooms ?? []).filter(
    (r): r is { id: string; trip_id: string; is_direct: boolean } => !!r.trip_id
  );
  if (tripRooms.length === 0) return [];

  const tripIds = tripRooms.map((r) => r.trip_id);
  const { data: trips } = await supabase
    .from("trips")
    .select("id, title, kind, availability_start, availability_end, duration_min, duration_max")
    .in("id", tripIds);
  const tripById = new Map((trips ?? []).map((t) => [t.id, t]));

  const memberCounts = new Map<string, number>();
  const { data: members } = await supabase
    .from("trip_members")
    .select("trip_id")
    .in("trip_id", tripIds)
    .eq("status", "accepted");
  for (const m of members ?? []) memberCounts.set(m.trip_id, (memberCounts.get(m.trip_id) ?? 0) + 1);

  const results: TripChat[] = [];
  for (const room of tripRooms) {
    const trip = tripById.get(room.trip_id);
    if (!trip) continue;

    const { data: lastMsgRows } = await supabase
      .from("messages")
      .select("id, body, sender_id, created_at")
      .eq("room_id", room.id)
      .order("seq", { ascending: false })
      .limit(1);
    const lastMsg = lastMsgRows?.[0];

    let lastMessagePreview = "No messages yet";
    if (lastMsg) {
      const senderName = await resolveSenderName(supabase, lastMsg.sender_id, userId);
      lastMessagePreview = senderName ? `${senderName}: ${lastMsg.body}` : lastMsg.body;
    }

    const dates = formatTripTiming({
      availabilityStart: trip.availability_start,
      availabilityEnd: trip.availability_end,
      durationMin: trip.duration_min,
      durationMax: trip.duration_max,
    });
    const count = memberCounts.get(room.trip_id) ?? 0;

    results.push({
      tripId: room.trip_id,
      title: trip.title,
      subtitle: `${dates} · ${count} member${count === 1 ? "" : "s"}`,
      lastMessage: lastMessagePreview,
      time: lastMsg ? formatRelativeTime(lastMsg.created_at) : "",
      unread: 0, // read-state tracking isn't modeled yet (no last-read column)
      badge: trip.kind === "verified_partner" ? "VP" : String(count),
      badgeVariant: trip.kind === "verified_partner" ? "partner" : "default",
      messages: [], // loaded on demand by getRoomMessages when a chat is opened
    });
  }

  return results;
}

async function resolveSenderName(supabase: SupaClient, senderId: string, viewerId: string): Promise<string | null> {
  if (senderId === viewerId) return null;
  const { data } = await supabase.from("users").select("name").eq("id", senderId).maybeSingle();
  return data?.name ?? null;
}

/** The chat_rooms.id for a trip, needed to subscribe/insert since
 * messages are keyed by room_id, not trip_id directly. */
export async function getRoomIdForTrip(tripId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("chat_rooms").select("id").eq("trip_id", tripId).maybeSingle();
  return data?.id ?? null;
}

/** Full message history for one room, oldest first, shaped for the
 * existing chat UI (ChatMessage). */
export async function getRoomMessages(roomId: string, viewerId: string): Promise<ChatMessage[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("messages")
    .select("id, body, sender_id, created_at")
    .eq("room_id", roomId)
    .order("seq", { ascending: true });
  if (!rows || rows.length === 0) return [];

  const senderIds = Array.from(new Set(rows.map((r) => r.sender_id).filter((id) => id !== viewerId)));
  const nameById = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: senders } = await supabase.from("users").select("id, name").in("id", senderIds);
    for (const s of senders ?? []) nameById.set(s.id, s.name);
  }

  return rows.map((r) => ({
    id: r.id,
    fromSelf: r.sender_id === viewerId,
    senderName: r.sender_id === viewerId ? undefined : (nameById.get(r.sender_id) ?? "Trip member"),
    text: r.body,
  }));
}

/** Sends a message. RLS's messages_insert_participant policy requires the
 * sender to already be a chat_participants row in this room — true for
 * any accepted trip member, kept in sync by the DB triggers in
 * migration 013. `seq` is required by the generated Insert type but is
 * always overwritten by the messages_set_seq BEFORE INSERT trigger
 * (next_message_seq()), so the value passed here is never actually
 * stored. */
export async function sendMessage(roomId: string, senderId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: senderId, body: trimmed, seq: 0 });
  if (error) throw new Error(error.message);
}

/** Resolves a single sender's display name — used by the realtime
 * handler to label an incoming message from someone else, mirroring
 * resolveSenderName's logic for the initial history load. */
export async function getSenderName(senderId: string): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.from("users").select("name").eq("id", senderId).maybeSingle();
  return data?.name ?? "Trip member";
}

export type IncomingMessageRow = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/** Subscribes to new messages in a room via Supabase Realtime (see
 * migration 013's `alter publication supabase_realtime add table
 * messages`). Returns an unsubscribe function. */
export function subscribeToRoomMessages(roomId: string, onMessage: (row: IncomingMessageRow) => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
      (payload) => onMessage(payload.new as IncomingMessageRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
