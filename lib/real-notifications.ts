import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Real notifications, backed by public.notifications (see
 * database.types.ts — id, user_id, type, title, body, related_trip_id,
 * read_at, created_at). RLS already scopes every row to its own user_id,
 * same pattern as chat_participants/trip_members elsewhere in the app.
 *
 * Nothing in the product writes to this table yet — no code path inserts
 * a row on join_request_received/accepted/rejected, waitlist_promoted,
 * trip_cancelled, new_message, review_received, verification_decided, or
 * attendance_reminder (the notification_type enum's own values name every
 * event this was designed for). So this reader is honest: it returns
 * whatever real rows exist (today, none), rather than a page that only
 * ever shows "you're all caught up" — once a write path is added for any
 * of those events, this page renders it with no further changes needed.
 */

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type Notification = {
  id: string;
  type: NotificationRow["type"];
  title: string;
  body: string | null;
  relatedTripId: string | null;
  read: boolean;
  timeAgo: string;
};

function shape(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    relatedTripId: row.related_trip_id,
    read: row.read_at !== null,
    timeAgo: formatRelativeTime(row.created_at),
  };
}

/** Most recent notifications for this user, newest first. */
export async function getMyNotifications(userId: string): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map(shape);
}

/** Count of unread notifications, for the header bell badge. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error || count === null) return 0;
  return count;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}
