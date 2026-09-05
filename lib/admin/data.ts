import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { formatTripTiming } from "@/lib/trip-dates";

/**
 * Admin panel data reads — all real Supabase queries, RLS-gated by
 * is_staff() (see migration 013's chat policies and migration 014's
 * users/verifications/companies staff policies). No mock data anywhere:
 * every screen in the Developer Spec's §4 screen→endpoint map is backed
 * by a real table read here, since a REST API layer doesn't exist in
 * this project — Supabase's PostgREST + RLS *is* the API layer, and
 * these functions are the client-side equivalent of the spec's listed
 * `GET /admin/...` endpoints.
 */

export type AdminUserRow = Database["public"]["Tables"]["users"]["Row"];
export type AdminTripRow = Database["public"]["Tables"]["trips"]["Row"];
export type AdminVerificationRow = Database["public"]["Tables"]["verifications"]["Row"];
export type AdminCompanyRow = Database["public"]["Tables"]["companies"]["Row"];
export type AdminTestimonialRow = Database["public"]["Tables"]["testimonials"]["Row"];
export type AdminAuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
export type AdminReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
export type AdminPendingRegistrationRow = Database["public"]["Tables"]["pending_registrations"]["Row"];

// ── Dashboard ──────────────────────────────────────────────────────────

export type DashboardStats = {
  totalUsers: number;
  activeTrips: number;
  pendingVerifications: number;
  openReports: number;
  oldestPendingVerificationDaysAgo: number | null;
  frozenTrustScoresAwaitingReview: number;
  pendingCompanyApplications: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

  const [
    { count: totalUsers },
    { count: activeTrips },
    { data: pendingVerifications },
    { count: frozenScores },
    { count: pendingCompanies },
    { count: openReports },
  ] = await Promise.all([
    supabase.from("admin_users").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("trips").select("id", { count: "exact", head: true }).in("status", ["live", "in_progress"]),
    supabase.from("verifications").select("submitted_at").eq("status", "pending").order("submitted_at", { ascending: true }),
    supabase.from("trust_scores").select("user_id", { count: "exact", head: true }).eq("is_frozen", true),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "under_review"),
    // migration 065 — was hardcoded to 0 before the reports table existed.
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const oldest = pendingVerifications?.[0]?.submitted_at ?? null;

  return {
    totalUsers: totalUsers ?? 0,
    activeTrips: activeTrips ?? 0,
    pendingVerifications: pendingVerifications?.length ?? 0,
    openReports: openReports ?? 0,
    oldestPendingVerificationDaysAgo: oldest ? Math.round((Date.now() - new Date(oldest).getTime()) / 86400000) : null,
    frozenTrustScoresAwaitingReview: frozenScores ?? 0,
    pendingCompanyApplications: pendingCompanies ?? 0,
  };
}

// ── Reports (§17/18, migration 065) ──────────────────────────────────

export type AdminReportRow = Database["public"]["Tables"]["reports"]["Row"];

export type AdminReportListItem = AdminReportRow & {
  reporterName: string;
  /** A short human label for the reported content, resolved per
   * content_type — e.g. a Click's title, a comment's text excerpt. Null
   * when the content itself has since been hard-deleted or otherwise
   * couldn't be resolved (the report row itself is never deleted, so
   * staff can still see who reported what and when). */
  contentSummary: string | null;
};

export type ReportsFilter = {
  status?: Database["public"]["Enums"]["report_status"] | "all";
  contentType?: Database["public"]["Enums"]["report_content_type"] | "all";
};

/** Reports queue for admin triage — newest first, pending surfaced by the
 * default filter. Resolves each report's reporter name and a short
 * summary of the reported content (Click title / comment excerpt) so
 * staff don't have to open every row just to see what's being reported. */
export async function getReports(filter: ReportsFilter = {}): Promise<AdminReportListItem[]> {
  const supabase = createClient();
  let query = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);
  if (filter.contentType && filter.contentType !== "all") query = query.eq("content_type", filter.contentType);

  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];

  const reporterIds = Array.from(new Set(rows.map((r) => r.reporter_id)));
  const { data: reporters } = await supabase.from("users").select("id, name").in("id", reporterIds);
  const nameById = new Map((reporters ?? []).map((r) => [r.id, r.name]));

  const clickIds = rows.filter((r) => r.content_type === "click").map((r) => r.content_id);
  const commentIds = rows.filter((r) => r.content_type === "click_comment").map((r) => r.content_id);
  const [{ data: clicks }, { data: comments }] = await Promise.all([
    clickIds.length > 0 ? supabase.from("clicks").select("id, title").in("id", clickIds) : Promise.resolve({ data: [] }),
    commentIds.length > 0 ? supabase.from("click_comments").select("id, content").in("id", commentIds) : Promise.resolve({ data: [] }),
  ]);
  const clickTitleById = new Map((clicks ?? []).map((c) => [c.id, c.title]));
  const commentTextById = new Map((comments ?? []).map((c) => [c.id, c.content]));

  return rows.map((r) => {
    let contentSummary: string | null = null;
    if (r.content_type === "click") contentSummary = clickTitleById.get(r.content_id) ?? null;
    else if (r.content_type === "click_comment") {
      const text = commentTextById.get(r.content_id);
      contentSummary = text ? (text.length > 80 ? `${text.slice(0, 80)}…` : text) : null;
    }
    return {
      ...r,
      reporterName: nameById.get(r.reporter_id) ?? "Unknown",
      contentSummary,
    };
  });
}

export type RecentAuditEntry = AdminAuditLogRow & { actorName: string | null };

export async function getRecentAuditActivity(limit = 4): Promise<RecentAuditEntry[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!rows || rows.length === 0) return [];

  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((id): id is string => !!id)));
  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase.from("users").select("id, name").in("id", actorIds);
    for (const a of actors ?? []) nameById.set(a.id, a.name);
  }

  return rows.map((r) => ({ ...r, actorName: r.actor_id ? (nameById.get(r.actor_id) ?? "Unknown") : "System" }));
}

// ── Users ──────────────────────────────────────────────────────────────

export type UsersFilter = {
  q?: string;
  status?: Database["public"]["Enums"]["account_status"] | "all";
  verification?: Database["public"]["Enums"]["verification_status"] | "all";
};

export type AdminUserListItem = AdminUserRow & {
  trustScore: number;
  tripCount: number;
};

export async function getUsers(filter: UsersFilter, limit = 50, offset = 0): Promise<{ users: AdminUserListItem[]; total: number }> {
  const supabase = createClient();
  // admin_users (migration 057), not users directly — users' RLS/column
  // grants now only allow a self-or-public-columns read (migration
  // 055/056, fixing the PII exposure where phone/email/dob were readable
  // by anyone). admin_users is a staff-gated view exposing the full row,
  // needed here for phone/email search and full profile fields.
  let query = supabase.from("admin_users").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (filter.q) query = query.or(`name.ilike.%${filter.q}%,phone.ilike.%${filter.q}%,email.ilike.%${filter.q}%`);
  if (filter.status && filter.status !== "all") query = query.eq("account_status", filter.status);
  if (filter.verification && filter.verification !== "all") query = query.eq("verification_status", filter.verification);

  const { data: users, count, error } = await query.range(offset, offset + limit - 1);
  if (error || !users) return { users: [], total: 0 };

  // admin_users mirrors `users` 1:1 via `select *`, so Postgres reports
  // every column (including id/account_status/verification_status) as
  // nullable in the generated types even though a real user row always
  // has them set — regenerating types (for the new clicks/click_photos
  // tables) surfaced this pre-existing gap between the DB's honest
  // nullability and this file's actual invariants. Asserting non-null
  // here, at the query boundary, keeps that assumption in one place
  // instead of threading `| null` through the whole admin UI.
  const userIds = users.map((u) => u.id!);
  const trustByUser = new Map<string, number>();
  const tripCountByUser = new Map<string, number>();
  if (userIds.length > 0) {
    const [{ data: trustRows }, { data: memberRows }] = await Promise.all([
      supabase.from("trust_scores").select("user_id, score").in("user_id", userIds),
      supabase.from("trip_members").select("user_id").in("user_id", userIds).eq("status", "accepted"),
    ]);
    for (const t of trustRows ?? []) trustByUser.set(t.user_id, Number(t.score));
    for (const m of memberRows ?? []) tripCountByUser.set(m.user_id, (tripCountByUser.get(m.user_id) ?? 0) + 1);
  }

  return {
    users: users.map((u) => ({
      ...u,
      account_status: u.account_status ?? "active",
      trustScore: trustByUser.get(u.id!) ?? 5,
      tripCount: tripCountByUser.get(u.id!) ?? 0,
    })) as AdminUserListItem[],
    total: count ?? 0,
  };
}

export type AdminUserDetail = AdminUserRow & { trustScore: number; trustFrozen: boolean };

export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const supabase = createClient();
  const [{ data: user }, { data: trust }] = await Promise.all([
    supabase.from("admin_users").select("*").eq("id", userId).maybeSingle(),
    supabase.from("trust_scores").select("score, is_frozen").eq("user_id", userId).maybeSingle(),
  ]);
  if (!user) return null;
  return {
    ...user,
    account_status: user.account_status ?? "active",
    trustScore: trust ? Number(trust.score) : 5,
    trustFrozen: trust?.is_frozen ?? false,
  } as AdminUserDetail;
}

export type AdminUserTripRow = {
  tripId: string;
  title: string;
  role: "organizer" | "member";
  status: string;
  dates: string;
};

export async function getUserTrips(userId: string): Promise<AdminUserTripRow[]> {
  const supabase = createClient();
  const [{ data: organized }, { data: memberships }] = await Promise.all([
    supabase
      .from("trips")
      .select("id, title, status, availability_start, availability_end, duration_min, duration_max")
      .eq("organizer_id", userId),
    supabase
      .from("trip_members")
      .select(
        "trip_id, status, trips(id, title, status, availability_start, availability_end, duration_min, duration_max)"
      )
      .eq("user_id", userId)
      .eq("status", "accepted"),
  ]);

  const rows: AdminUserTripRow[] = (organized ?? []).map((t) => ({
    tripId: t.id,
    title: t.title,
    role: "organizer",
    status: t.status,
    dates: formatTripTiming({
      availabilityStart: t.availability_start,
      availabilityEnd: t.availability_end,
      durationMin: t.duration_min,
      durationMax: t.duration_max,
    }),
  }));

  for (const m of memberships ?? []) {
    const trip = Array.isArray(m.trips) ? m.trips[0] : m.trips;
    if (!trip) continue;
    if (rows.some((r) => r.tripId === trip.id)) continue; // already listed as organizer
    rows.push({
      tripId: trip.id,
      title: trip.title,
      role: "member",
      status: trip.status,
      dates: formatTripTiming({
        availabilityStart: trip.availability_start,
        availabilityEnd: trip.availability_end,
        durationMin: trip.duration_min,
        durationMax: trip.duration_max,
      }),
    });
  }

  return rows;
}

export type AdminUserReviewRow = AdminReviewRow & { reviewerName: string; tripTitle: string };

export async function getUserReviews(userId: string): Promise<AdminUserReviewRow[]> {
  const supabase = createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false });
  if (!reviews || reviews.length === 0) return [];

  const reviewerIds = Array.from(new Set(reviews.map((r) => r.reviewer_id)));
  const tripIds = Array.from(new Set(reviews.map((r) => r.trip_id).filter((id): id is string => !!id)));
  const [{ data: reviewers }, { data: tripRows }] = await Promise.all([
    supabase.from("users").select("id, name").in("id", reviewerIds),
    tripIds.length > 0 ? supabase.from("trips").select("id, title").in("id", tripIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);
  const nameById = new Map((reviewers ?? []).map((r) => [r.id, r.name]));
  const tripTitleById = new Map((tripRows ?? []).map((t) => [t.id, t.title]));

  // reviewer_display_name / trip_title_override (migrations 043/045)
  // override the real linked account's name / real trip's title when an
  // admin typed free text for either — null for every normal peer review
  // and most admin-authored ones, which keep showing the real linked
  // data as before.
  return reviews.map((r) => ({
    ...r,
    reviewerName: r.reviewer_display_name ?? nameById.get(r.reviewer_id) ?? "Unknown",
    tripTitle: r.trip_title_override ?? (r.trip_id ? tripTitleById.get(r.trip_id) ?? "Unknown trip" : "Unknown trip"),
  }));
}

// ── Verification queue ───────────────────────────────────────────────

export type AdminVerificationListItem = AdminVerificationRow & { userName: string };

export async function getPendingVerifications(): Promise<AdminVerificationListItem[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("verifications")
    .select("*")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });
  if (!rows || rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: users } = await supabase.from("users").select("id, name").in("id", userIds);
  const nameById = new Map((users ?? []).map((u) => [u.id, u.name]));

  return rows.map((r) => ({ ...r, userName: nameById.get(r.user_id) ?? "Unknown" }));
}

export async function getVerificationDetail(id: string): Promise<(AdminVerificationRow & { userName: string }) | null> {
  const supabase = createClient();
  const { data: row } = await supabase.from("verifications").select("*").eq("id", id).maybeSingle();
  if (!row) return null;
  const { data: user } = await supabase.from("users").select("name").eq("id", row.user_id).maybeSingle();
  return { ...row, userName: user?.name ?? "Unknown" };
}

// ── Trips ──────────────────────────────────────────────────────────────

export type AdminTripListItem = AdminTripRow & {
  organizerName: string;
  membersJoined: number;
};

export type TripsFilter = {
  q?: string;
  status?: Database["public"]["Enums"]["trip_status"] | "all";
  kind?: Database["public"]["Enums"]["trip_kind"] | "all";
};

export async function getTrips(filter: TripsFilter, limit = 50, offset = 0): Promise<{ trips: AdminTripListItem[]; total: number }> {
  const supabase = createClient();
  let query = supabase.from("trips").select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (filter.q) query = query.ilike("title", `%${filter.q}%`);
  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);
  if (filter.kind && filter.kind !== "all") query = query.eq("kind", filter.kind);

  const { data: trips, count, error } = await query.range(offset, offset + limit - 1);
  if (error || !trips) return { trips: [], total: 0 };

  const organizerIds = Array.from(new Set(trips.map((t) => t.organizer_id)));
  const tripIds = trips.map((t) => t.id);
  const [{ data: organizers }, { data: members }] = await Promise.all([
    supabase.from("users").select("id, name").in("id", organizerIds),
    tripIds.length > 0
      ? supabase.from("trip_members").select("trip_id").in("trip_id", tripIds).eq("status", "accepted")
      : Promise.resolve({ data: [] as { trip_id: string }[] }),
  ]);
  const nameById = new Map((organizers ?? []).map((o) => [o.id, o.name]));
  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) memberCounts.set(m.trip_id, (memberCounts.get(m.trip_id) ?? 0) + 1);

  return {
    trips: trips.map((t) => ({ ...t, organizerName: nameById.get(t.organizer_id) ?? "Unknown", membersJoined: memberCounts.get(t.id) ?? 0 })),
    total: count ?? 0,
  };
}

export type AdminTripMemberRow = {
  userId: string;
  name: string;
  status: Database["public"]["Enums"]["membership_status"];
  joinedAt: string;
};

export async function getTripMembers(tripId: string): Promise<AdminTripMemberRow[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("trip_members")
    .select("user_id, status, joined_at")
    .eq("trip_id", tripId)
    .order("joined_at", { ascending: true });
  if (!rows || rows.length === 0) return [];

  const userIds = rows.map((r) => r.user_id);
  const { data: users } = await supabase.from("users").select("id, name").in("id", userIds);
  const nameById = new Map((users ?? []).map((u) => [u.id, u.name]));

  return rows.map((r) => ({ userId: r.user_id, name: nameById.get(r.user_id) ?? "Unknown", status: r.status, joinedAt: r.joined_at }));
}

export async function getTripDetail(tripId: string): Promise<AdminTripRow | null> {
  const supabase = createClient();
  const { data } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
  return data ?? null;
}

// ── Destinations ───────────────────────────────────────────────────────
// The launch-tier catalog (admin-managed via admin_create_destination /
// admin_update_destination / admin_deactivate_destination /
// admin_reactivate_destination — migration 023). Every picker across the
// app (Create Trip, admin trip creation, Explore search, the public
// Destinations page) reads from this one real table now, replacing the
// three separate hardcoded mock catalogs that used to exist.

export type AdminDestinationRow = Database["public"]["Tables"]["destinations"]["Row"];

/** activeOnly=true (default) is what every picker/search should use — it's
 * what keeps the list to the curated launch set. The admin Destinations
 * screen passes false so it can also show (and reactivate) retired ones. */
export async function getDestinations(activeOnly = true): Promise<AdminDestinationRow[]> {
  const supabase = createClient();
  let query = supabase.from("destinations").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);
  const { data } = await query;
  return data ?? [];
}

// ── ID-verified users (kept for any other callers still using it) ────

export async function getIdVerifiedUsers(q?: string): Promise<{ id: string; name: string; phone: string | null; email: string | null }[]> {
  const supabase = createClient();
  let query = supabase.from("admin_users").select("id, name, phone, email").eq("verification_status", "id_verified").order("name", { ascending: true }).limit(50);
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  const { data } = await query;
  return (data ?? []) as { id: string; name: string; phone: string | null; email: string | null }[];
}

/** Any user, regardless of verification status — used for the Create Trip
 * organizer picker and the Add Member dialog, since admins can now make
 * any user a trip host or member without requiring ID verification. */
export async function getAllUsersForPicker(q?: string): Promise<{ id: string; name: string; phone: string | null; email: string | null; verification_status: string }[]> {
  const supabase = createClient();
  let query = supabase.from("admin_users").select("id, name, phone, email, verification_status").order("name", { ascending: true }).limit(50);
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  const { data } = await query;
  return (data ?? []) as { id: string; name: string; phone: string | null; email: string | null; verification_status: string }[];
}

// ── Companies ─────────────────────────────────────────────────────────

export type AdminCompanyListItem = AdminCompanyRow & { tripsRun: number };

export async function getCompanies(): Promise<AdminCompanyListItem[]> {
  const supabase = createClient();
  const { data: companies } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
  if (!companies || companies.length === 0) return [];

  const companyIds = companies.map((c) => c.id);
  const { data: trips } = await supabase.from("trips").select("company_id").in("company_id", companyIds);
  const tripCounts = new Map<string, number>();
  for (const t of trips ?? []) {
    if (!t.company_id) continue;
    tripCounts.set(t.company_id, (tripCounts.get(t.company_id) ?? 0) + 1);
  }

  return companies.map((c) => ({ ...c, tripsRun: tripCounts.get(c.id) ?? 0 }));
}

// ── Testimonials ──────────────────────────────────────────────────────

export async function getTestimonials(): Promise<AdminTestimonialRow[]> {
  const supabase = createClient();
  const { data } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

// ── Audit log ─────────────────────────────────────────────────────────

export type AuditLogFilter = {
  q?: string;
  actionType?: string | "all";
};

export async function getAuditLog(filter: AuditLogFilter, limit = 50, offset = 0): Promise<{ entries: RecentAuditEntry[]; total: number }> {
  const supabase = createClient();
  let query = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (filter.actionType && filter.actionType !== "all") query = query.eq("action", filter.actionType);

  const { data: rows, count, error } = await query.range(offset, offset + limit - 1);
  if (error || !rows) return { entries: [], total: 0 };

  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((id): id is string => !!id)));
  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase.from("users").select("id, name").in("id", actorIds);
    for (const a of actors ?? []) nameById.set(a.id, a.name);
  }

  let entries = rows.map((r) => ({ ...r, actorName: r.actor_id ? (nameById.get(r.actor_id) ?? "Unknown") : "System" }));
  if (filter.q) {
    const q = filter.q.toLowerCase();
    entries = entries.filter((e) => (e.actorName ?? "").toLowerCase().includes(q) || e.entity_type.toLowerCase().includes(q));
  }

  return { entries, total: count ?? 0 };
}

// ── Pending registrations (Option A admin-created users) ─────────────

export async function getPendingRegistrations(): Promise<AdminPendingRegistrationRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pending_registrations")
    .select("*")
    .is("activated_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createPendingRegistration(name: string, contact: { phone?: string; email?: string }, createdBy: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("pending_registrations").insert({
    name: name.trim(),
    phone: contact.phone?.trim() || null,
    email: contact.email?.trim() || null,
    created_by: createdBy,
  });
  if (error) throw new Error(error.message);
}
