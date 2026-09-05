import { createClient } from "@/lib/supabase/client";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Clicks feed + detail reads (Phase 2). Deliberately separate from
 * lib/real-clicks.ts, which owns writes (create/edit/publish/photos) —
 * same file-per-concern split as real-trips.ts (writes) vs.
 * real-explore-shared.ts (reads) for trips.
 *
 * Author info is fetched via a second query to public_user_profiles by
 * user_id, not a PostgREST FK-embed through `users` — matches
 * lib/real-profile.ts's established pattern. clicks.user_id references
 * users(id), and users' RLS/column-GRANTs (migration 054/055) only let a
 * non-self, non-staff caller see specific public columns; relying on an
 * embed here would need to be verified against that lockdown, whereas
 * public_user_profiles is the view already built and proven safe for
 * exactly this "who is this" lookup.
 */

type SupaClient = SupabaseClient<Database>;

export type ClickAuthor = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  verificationStatus: string | null;
};

export type ClickListItem = {
  id: string;
  title: string;
  story: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  tripType: Database["public"]["Enums"]["click_trip_type"] | null;
  coverImageUrl: string | null;
  createdAt: string;
  tripId: string | null;
  author: ClickAuthor;
  photoCount: number;
  photos: { imageUrl: string; displayOrder: number }[];
  likeCount: number;
  commentCount: number;
};

export type ClickFeedPage = {
  items: ClickListItem[];
  nextCursor: string | null; // created_at of the last item, for keyset pagination
};

const FEED_PAGE_SIZE = 12;
// Cap on photos fetched per Click for feed cards — the layout (spec
// section 8) only ever shows up to 4 tiles ("+N more" for the rest), so
// there's no reason to pull all 15 possible photos into every feed page.
const FEED_PHOTOS_PER_CLICK = 4;

async function attachAuthorsAndPhotos(
  supabase: SupaClient,
  rows: Database["public"]["Tables"]["clicks"]["Row"][]
): Promise<ClickListItem[]> {
  if (rows.length === 0) return [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const clickIds = rows.map((r) => r.id);

  const [{ data: authorRows }, { data: photoRows }, { data: countRows }, { data: likeRows }, { data: commentRows }] = await Promise.all([
    supabase.from("public_user_profiles").select("id, name, initials, avatar_url, verification_status").in("id", userIds),
    supabase
      .from("click_photos")
      .select("click_id, image_url, display_order")
      .in("click_id", clickIds)
      .order("display_order", { ascending: true }),
    supabase.from("click_photos").select("click_id").in("click_id", clickIds),
    supabase.from("click_likes").select("click_id").in("click_id", clickIds),
    supabase.from("click_comments").select("click_id").in("click_id", clickIds).is("deleted_at", null),
  ]);

  const authorsById = new Map<string, ClickAuthor>();
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

  const photosByClick = new Map<string, { imageUrl: string; displayOrder: number }[]>();
  for (const p of photoRows ?? []) {
    const list = photosByClick.get(p.click_id) ?? [];
    if (list.length < FEED_PHOTOS_PER_CLICK) list.push({ imageUrl: p.image_url, displayOrder: p.display_order });
    photosByClick.set(p.click_id, list);
  }

  const photoCountByClick = new Map<string, number>();
  for (const p of countRows ?? []) {
    photoCountByClick.set(p.click_id, (photoCountByClick.get(p.click_id) ?? 0) + 1);
  }

  const likeCountByClick = new Map<string, number>();
  for (const l of likeRows ?? []) {
    likeCountByClick.set(l.click_id, (likeCountByClick.get(l.click_id) ?? 0) + 1);
  }

  const commentCountByClick = new Map<string, number>();
  for (const c of commentRows ?? []) {
    commentCountByClick.set(c.click_id, (commentCountByClick.get(c.click_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    story: r.story,
    destination: r.destination,
    startDate: r.start_date,
    endDate: r.end_date,
    tripType: r.trip_type,
    coverImageUrl: r.cover_image_url,
    createdAt: r.created_at,
    tripId: r.trip_id,
    author: authorsById.get(r.user_id) ?? {
      id: r.user_id,
      name: "GoTogether traveller",
      initials: "GT",
      avatarUrl: null,
      verificationStatus: null,
    },
    photoCount: photoCountByClick.get(r.id) ?? 0,
    photos: photosByClick.get(r.id) ?? [],
    likeCount: likeCountByClick.get(r.id) ?? 0,
    commentCount: commentCountByClick.get(r.id) ?? 0,
  }));
}

export type ClickDiscoveryFilter =
  | { kind: "all" }
  | { kind: "trip_type"; tripType: Database["public"]["Enums"]["click_trip_type"] }
  | { kind: "destination"; query: string };

/**
 * Feed page (spec section 28/29): recent published Clicks first — the
 * "keep the first version deterministic and easy to debug" ranking the
 * spec explicitly asks for, not a scored recommendation algorithm.
 * Cursor-based on created_at (ties broken by id) so a page boundary
 * landing mid-second doesn't skip or repeat rows the way an offset would
 * if new Clicks are published between page loads.
 */
export async function getClicksFeedPage(
  filter: ClickDiscoveryFilter,
  cursor: string | null
): Promise<ClickFeedPage> {
  const supabase = createClient();
  let query = supabase
    .from("clicks")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (cursor) query = query.lt("created_at", cursor);
  if (filter.kind === "trip_type") query = query.eq("trip_type", filter.tripType);
  if (filter.kind === "destination" && filter.query.trim()) query = query.ilike("destination", `%${filter.query.trim()}%`);

  const { data, error } = await query;
  if (error || !data) return { items: [], nextCursor: null };

  const items = await attachAuthorsAndPhotos(supabase, data);
  const nextCursor = data.length === FEED_PAGE_SIZE ? data[data.length - 1].created_at : null;
  return { items, nextCursor };
}

export type ClickDetail = ClickListItem & {
  allPhotos: { id: string; imageUrl: string; displayOrder: number }[];
  tripTitle: string | null;
};

/** Full detail for the Click detail page — all photos (not capped like
 * the feed card), plus the linked trip's title if any. Works for a
 * server-rendered page (createPublicServerClient — no cookies needed
 * since a published Click is publicly readable) or falls back to the
 * signed-in client for previewing your own draft. */
export async function getClickDetail(clickId: string, opts?: { asOwner?: boolean }): Promise<ClickDetail | null> {
  const supabase = opts?.asOwner ? createClient() : createPublicServerClient();

  const { data: row } = await supabase.from("clicks").select("*").eq("id", clickId).maybeSingle();
  if (!row) return null;

  const [{ data: authorRow }, { data: photoRows }, tripRow, { count: likeCount }, { count: commentCount }] = await Promise.all([
    supabase.from("public_user_profiles").select("id, name, initials, avatar_url, verification_status").eq("id", row.user_id).maybeSingle(),
    supabase.from("click_photos").select("id, image_url, display_order").eq("click_id", clickId).order("display_order", { ascending: true }),
    row.trip_id ? supabase.from("trips").select("title").eq("id", row.trip_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("click_likes").select("user_id", { count: "exact", head: true }).eq("click_id", clickId),
    supabase.from("click_comments").select("id", { count: "exact", head: true }).eq("click_id", clickId).is("deleted_at", null),
  ]);

  const author: ClickAuthor = authorRow
    ? {
        id: authorRow.id ?? row.user_id,
        name: authorRow.name ?? "GoTogether traveller",
        initials: authorRow.initials ?? (authorRow.name ?? "?").slice(0, 2).toUpperCase(),
        avatarUrl: authorRow.avatar_url,
        verificationStatus: authorRow.verification_status,
      }
    : { id: row.user_id, name: "GoTogether traveller", initials: "GT", avatarUrl: null, verificationStatus: null };

  const allPhotos = (photoRows ?? []).map((p) => ({ id: p.id, imageUrl: p.image_url, displayOrder: p.display_order }));

  return {
    id: row.id,
    title: row.title,
    story: row.story,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    tripType: row.trip_type,
    coverImageUrl: row.cover_image_url,
    createdAt: row.created_at,
    tripId: row.trip_id,
    author,
    photoCount: allPhotos.length,
    photos: allPhotos.slice(0, FEED_PHOTOS_PER_CLICK),
    likeCount: likeCount ?? 0,
    commentCount: commentCount ?? 0,
    allPhotos,
    tripTitle: (tripRow as { data: { title: string } | null } | null)?.data?.title ?? null,
  };
}

/** A user's own Clicks for their profile's "My Clicks" section (spec
 * section 16) — published only when viewing someone else's profile,
 * published + drafts when it's your own (drafts are creator-only per RLS,
 * so this naturally returns nothing extra for a viewer who isn't the
 * author — the split here is just about which client to use and whether
 * to bother asking for drafts at all). */
// Defensive cap, not a real pagination need today — no user is anywhere
// near this many published Clicks yet — but a profile grid has no
// business ever pulling an unbounded number of rows (plus a full photo/
// like/comment batch fetch per row) for however prolific one poster gets.
const PROFILE_CLICKS_MAX = 200;

export async function getUserClicksForProfile(userId: string, opts: { includeDrafts: boolean }): Promise<ClickListItem[]> {
  const supabase = opts.includeDrafts ? createClient() : createPublicServerClient();
  let query = supabase
    .from("clicks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(PROFILE_CLICKS_MAX);
  query = opts.includeDrafts ? query.neq("status", "deleted") : query.eq("status", "published");

  const { data, error } = await query;
  if (error || !data) return [];
  return attachAuthorsAndPhotos(supabase, data);
}
