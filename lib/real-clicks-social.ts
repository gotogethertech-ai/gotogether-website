import { createClient } from "@/lib/supabase/client";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Clicks Phase 3 social layer — likes, comments, and follows. Deliberately
 * separate from lib/real-clicks.ts (Phase 1 writes: create/edit/publish/
 * photos) and lib/real-clicks-feed.ts (Phase 2 reads: feed/detail/profile
 * grid) — same file-per-concern split used throughout this feature.
 *
 * user_follows/click_likes/click_comments and their notification triggers
 * are defined in migrations 061-062; migration 063 fixed a genuine RLS bug
 * where an author soft-deleting their own comment (an UPDATE that sets
 * deleted_at) was rejected because the table's SELECT policy required
 * deleted_at IS NULL unconditionally — Postgres re-validates the SELECT
 * policy against the post-UPDATE row, so the author's own comment became
 * briefly "invisible" to itself mid-update. Fixed at the DB layer; nothing
 * here needs to work around it.
 *
 * Like/comment/follow counts and "does the current viewer ..." checks are
 * plain counted queries rather than denormalized counter columns — Clicks
 * engagement volumes don't yet justify the complexity of keeping a counter
 * column in sync via triggers (see spec section 28: "no complex algorithm
 * initially"). Revisit if a feed page ends up needing hundreds of these at
 * once (Phase 6 optimization).
 */

export type CommentAuthor = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  verificationStatus: string | null;
};

export type ClickComment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isOwn: boolean;
  author: CommentAuthor;
};

async function attachCommentAuthors(
  supabase: ReturnType<typeof createClient>,
  rows: Database["public"]["Tables"]["click_comments"]["Row"][],
  viewerId: string | null
): Promise<ClickComment[]> {
  if (rows.length === 0) return [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: authorRows } = await supabase
    .from("public_user_profiles")
    .select("id, name, initials, avatar_url, verification_status")
    .in("id", userIds);

  const authorsById = new Map<string, CommentAuthor>();
  for (const a of authorRows ?? []) {
    if (!a.id) continue;
    authorsById.set(a.id, {
      id: a.id,
      name: a.name ?? "GoTogether traveller",
      initials: a.initials ?? (a.name ?? "?").slice(0, 2).toUpperCase(),
      avatarUrl: a.avatar_url,
      verificationStatus: a.verification_status,
    });
  }

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isOwn: r.user_id === viewerId,
    author: authorsById.get(r.user_id) ?? {
      id: r.user_id,
      name: "GoTogether traveller",
      initials: "GT",
      avatarUrl: null,
      verificationStatus: null,
    },
  }));
}

/** Visible comments for a Click, oldest first (spec section 10 — a plain
 * chronological thread, no nested replies). Works signed-out (public
 * client) since RLS already scopes to non-deleted comments on a visible
 * Click; viewerId (when signed in) only affects the isOwn flag used to
 * show delete affordances client-side. */
export async function getClickComments(clickId: string, viewerId: string | null): Promise<ClickComment[]> {
  const supabase = viewerId ? createClient() : createPublicServerClient();
  const { data, error } = await supabase
    .from("click_comments")
    .select("*")
    .eq("click_id", clickId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return attachCommentAuthors(supabase, data, viewerId);
}

export async function getCommentCount(clickId: string): Promise<number> {
  const supabase = createPublicServerClient();
  const { count, error } = await supabase
    .from("click_comments")
    .select("id", { count: "exact", head: true })
    .eq("click_id", clickId)
    .is("deleted_at", null);
  if (error || count === null) return 0;
  return count;
}

export class CommentRateLimitError extends Error {
  constructor() {
    super("You're commenting too quickly. Wait a moment and try again.");
    this.name = "CommentRateLimitError";
  }
}

/** Post a comment (spec section 10). Validates length client-side to match
 * the DB CHECK (1-2000 chars) and pre-flights check_comment_rate_limit()
 * so the UI can show a friendly message instead of a raw insert error —
 * the DB function is still the source of truth (a second tab or a race
 * would still be caught by re-running it, since the insert itself doesn't
 * enforce the limit — only this explicit check does, matching how the spec
 * describes rate limiting as an app-level guard rather than a DB
 * constraint). */
export async function postClickComment(clickId: string, userId: string, content: string): Promise<ClickComment> {
  const trimmed = content.trim();
  if (trimmed.length === 0) throw new Error("Comment can't be empty.");
  if (trimmed.length > 2000) throw new Error("Comment is too long (max 2000 characters).");

  const supabase = createClient();
  const { data: underLimit, error: rpcError } = await supabase.rpc("check_comment_rate_limit");
  if (rpcError) throw rpcError;
  if (!underLimit) throw new CommentRateLimitError();

  const { data, error } = await supabase
    .from("click_comments")
    .insert({ click_id: clickId, user_id: userId, content: trimmed })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Couldn't post comment.");

  return (await attachCommentAuthors(supabase, [data], userId))[0];
}

/** Soft-delete (spec section 19 — comments are never hard-deleted, same
 * convention as clicks.status). RLS restricts this to the comment's own
 * author (or staff, via is_staff() in the same policy). */
export async function deleteClickComment(commentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("click_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) throw error;
}

/** Like state + count for a Click, plus whether the given viewer has liked
 * it. viewerId is null when signed out (isLiked is always false then). */
export async function getClickLikeState(clickId: string, viewerId: string | null): Promise<{ count: number; isLiked: boolean }> {
  const supabase = createPublicServerClient();
  const countPromise = supabase.from("click_likes").select("user_id", { count: "exact", head: true }).eq("click_id", clickId);
  const likedPromise = viewerId
    ? supabase.from("click_likes").select("user_id").eq("click_id", clickId).eq("user_id", viewerId).maybeSingle()
    : Promise.resolve({ data: null });

  const [{ count }, { data: likedRow }] = await Promise.all([countPromise, likedPromise]);
  return { count: count ?? 0, isLiked: !!likedRow };
}

/** Like a Click (spec section 9). UNIQUE(click_id, user_id) makes a
 * duplicate like a clean no-op rather than a visible error — the optimistic
 * UI should never call this when it already believes the Click is liked,
 * but this makes a race (two tabs, a stale click) harmless either way. */
export async function likeClick(clickId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("click_likes").insert({ click_id: clickId, user_id: userId });
  if (error && error.code !== "23505") throw error;
}

export async function unlikeClick(clickId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("click_likes").delete().eq("click_id", clickId).eq("user_id", userId);
  if (error) throw error;
}

/** Follower/following counts for a profile (spec section 12). */
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const supabase = createPublicServerClient();
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", userId),
    supabase.from("user_follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

/** Whether viewerId currently follows targetUserId. False (not an error)
 * when viewerId is null (signed out) or equals targetUserId (self). */
export async function isFollowing(viewerId: string | null, targetUserId: string): Promise<boolean> {
  if (!viewerId || viewerId === targetUserId) return false;
  const supabase = createClient();
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("followee_id", targetUserId)
    .maybeSingle();
  return !!data;
}

/** Follow a traveller (spec sections 11/12 — from their profile or
 * directly from a Click). The DB CHECK (follower_id <> followee_id)
 * backstops against ever following yourself; callers should still hide the
 * Follow button on your own profile/Click for a sane UI. */
export async function followUser(followerId: string, followeeId: string): Promise<void> {
  if (followerId === followeeId) return;
  const supabase = createClient();
  const { error } = await supabase.from("user_follows").insert({ follower_id: followerId, followee_id: followeeId });
  if (error && error.code !== "23505") throw error;
}

export async function unfollowUser(followerId: string, followeeId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("user_follows").delete().eq("follower_id", followerId).eq("followee_id", followeeId);
  if (error) throw error;
}
