import { createClient } from "@/lib/supabase/client";
import type { ExploreTrip } from "@/lib/mock-data";
import { formatTripListingDates, formatTripListingBudget } from "@/lib/trip-dates";
import type { Review } from "@/lib/profiles-data";
import { shapeReviews } from "@/lib/real-profile";

/**
 * Real Verified Travel Companies directory — replaces the previous
 * lib/companies-data.ts mock catalog (8 hand-authored sample companies).
 * Every company shown here is a real public.companies row with
 * status = 'verified', reached either by a user self-registering from
 * their profile (register_company RPC, migration 029) and later being
 * approved by an admin (admin_verify_company), or created directly by an
 * admin (admin_create_company). under_review/suspended companies are
 * never shown here — same "Verified means Verified" rule the mock data's
 * file comment stated, now actually enforced against real rows via the
 * `.eq("status", "verified")` filter below rather than by construction.
 *
 * The schema has no slug/description/logo/cancellation-policy columns —
 * those were mock-only embellishments. A slug is derived from the name
 * (kebab-case) for routing; description/cancellation-policy are simply
 * not shown since there's no real backing field yet (no fabricated copy).
 *
 * Slug collisions: nothing stops two DIFFERENT companies from sharing the
 * same name (e.g. two unrelated businesses both called "Star Travels") —
 * the table has no unique constraint on name, and they are not the same
 * company, so their data must never be merged. Since routing is by
 * slugified name, same-named companies would otherwise collide on one URL
 * and only one could ever be reached. So within each batch of verified
 * companies, slug collisions are disambiguated deterministically by
 * appending -2, -3, ... (ordered by id) to every row after the first —
 * every company keeps its own separate trips/rating/profile, just at a
 * distinct URL.
 */

export type RealCompany = {
  id: string;
  slug: string;
  name: string;
  logoInitial: string;
  tripsRun: number;
  rating: string | null; // null → no ratings at all yet
  reviewCount: number; // ratings the average above is based on
  supportEmail: string | null;
  /** Admin-set "Talk to our counsellor" tel: number (migration 052), or
   * null until an admin adds one — the call CTA is hidden without it. */
  counsellorPhone: string | null;
  verifiedSince: string; // formatted month/year
};

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function logoInitialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatVerifiedSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Disambiguates slug collisions between distinct companies that happen to
 * share a name — appends -2, -3, ... to every row after the first, in a
 * fixed order (by id) so the result is deterministic regardless of query
 * order. Each company keeps its own separate identity/trips/rating; only
 * the URL changes. See this file's header comment for why merging is wrong
 * here — same name does not mean same business. */
export function dedupeSlugs<T extends { id: string; slug: string }>(companies: T[]): T[] {
  // Decide suffixes in a fixed id order so the assignment is deterministic
  // regardless of how `companies` itself is sorted (e.g. by created_at)...
  const suffixByCompanyId = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const c of [...companies].sort((a, b) => a.id.localeCompare(b.id))) {
    const count = seen.get(c.slug) ?? 0;
    seen.set(c.slug, count + 1);
    if (count > 0) suffixByCompanyId.set(c.id, `-${count + 1}`);
  }
  // ...then apply those suffixes without disturbing the caller's own order.
  return companies.map((c) => {
    const suffix = suffixByCompanyId.get(c.id);
    return suffix ? { ...c, slug: `${c.slug}${suffix}` } : c;
  });
}

/** All verified companies, with real trip counts and a real average
 * rating computed from reviews left on that company's trips (rating is
 * null — "not enough reviews yet" — below MIN_RATING_SAMPLE).
 *
 * "Trips run" also counts admin-added company_trip_records (migration
 * 051) — display-only past-trip entries with no backing trips row — per
 * product decision (Aug 2026): they're a credibility record, so they
 * should count the same as a real trip toward the number shown. */
export async function getRealCompanies(): Promise<RealCompany[]> {
  const supabase = createClient();
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, contact_email, counsellor_phone, status, created_at")
    .eq("status", "verified")
    .order("created_at", { ascending: false });
  if (error || !companies || companies.length === 0) return [];

  const companyIds = companies.map((c) => c.id);

  const [{ data: trips }, { data: tripRecords }] = await Promise.all([
    supabase.from("trips").select("id, company_id").in("company_id", companyIds),
    supabase.from("company_trip_records").select("id, company_id").in("company_id", companyIds),
  ]);
  const tripIdsByCompany = new Map<string, string[]>();
  for (const t of trips ?? []) {
    if (!t.company_id) continue;
    const list = tripIdsByCompany.get(t.company_id) ?? [];
    list.push(t.id);
    tripIdsByCompany.set(t.company_id, list);
  }
  const recordCountByCompany = new Map<string, number>();
  for (const r of tripRecords ?? []) {
    recordCountByCompany.set(r.company_id, (recordCountByCompany.get(r.company_id) ?? 0) + 1);
  }

  const allTripIds = (trips ?? []).map((t) => t.id);
  const ratingsByTrip = new Map<string, number[]>();
  if (allTripIds.length > 0) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("trip_id, rating")
      .in("trip_id", allTripIds)
      .eq("visibility", "published");
    for (const r of reviews ?? []) {
      // trip_id can be null for an admin-authored review attributed to a
      // free-text trip name with no backing row (migration 045) — those
      // can't be attributed to any specific trip's rating here.
      if (!r.trip_id) continue;
      const list = ratingsByTrip.get(r.trip_id) ?? [];
      list.push(r.rating);
      ratingsByTrip.set(r.trip_id, list);
    }
  }

  // Reviews written directly against a company's profile (migration 048,
  // e.g. via the admin Add Review flow) also count toward its rating —
  // not just reviews tied to one of its real trips.
  const { data: companyReviews } = await supabase
    .from("reviews")
    .select("reviewee_company_id, rating")
    .in("reviewee_company_id", companyIds)
    .eq("visibility", "published");
  const directRatingsByCompany = new Map<string, number[]>();
  for (const r of companyReviews ?? []) {
    if (!r.reviewee_company_id) continue;
    const list = directRatingsByCompany.get(r.reviewee_company_id) ?? [];
    list.push(r.rating);
    directRatingsByCompany.set(r.reviewee_company_id, list);
  }

  const shaped = companies.map((c): RealCompany => {
    const tripIds = tripIdsByCompany.get(c.id) ?? [];
    const allRatings = [
      ...tripIds.flatMap((tid) => ratingsByTrip.get(tid) ?? []),
      ...(directRatingsByCompany.get(c.id) ?? []),
    ];
    const rating = allRatings.length > 0 ? (allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length).toFixed(1) : null;
    return {
      id: c.id,
      slug: slugify(c.name),
      name: c.name,
      logoInitial: logoInitialsFrom(c.name),
      tripsRun: tripIds.length + (recordCountByCompany.get(c.id) ?? 0),
      rating,
      reviewCount: allRatings.length,
      supportEmail: c.contact_email,
      counsellorPhone: c.counsellor_phone,
      verifiedSince: formatVerifiedSince(c.created_at),
    };
  });
  // Distinct companies can share a name (see file header) — disambiguate
  // slugs so every one gets its own reachable URL instead of colliding.
  return dedupeSlugs(shaped);
}

export function searchRealCompanies(companies: RealCompany[], query: string): RealCompany[] {
  const q = query.trim().toLowerCase();
  if (!q) return companies;
  return companies.filter((c) => c.name.toLowerCase().includes(q));
}

/** A single verified company by its derived slug, or null if no verified
 * company's name slugifies to it. */
export async function getRealCompanyBySlug(slug: string): Promise<RealCompany | null> {
  const companies = await getRealCompanies();
  return companies.find((c) => c.slug === slug) ?? null;
}

export function formatRatingWithBasis(company: RealCompany): string {
  if (!company.rating) return "No reviews yet";
  return `${company.rating} (${company.reviewCount})`;
}

export function formatTripsRun(company: RealCompany): string {
  return company.tripsRun === 1 ? "1 trip completed" : `${company.tripsRun} trips completed`;
}

/** Opens (or finds the existing) direct chat_rooms row between the
 * signed-in user and this verified company's primary account (migration
 * 052) — works before the user has joined any of the company's trips,
 * unlike the trip group chat which requires accepted membership. Returns
 * the room id to navigate to on /messages. */
export async function getOrCreateCompanyChat(companyId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_or_create_company_chat", { p_company_id: companyId });
  if (error || !data) throw new Error(error?.message ?? "Couldn't start a chat with this company.");
  return data;
}

export type CompanyTripRecord = {
  id: string;
  title: string;
  dateLabel: string;
};

const RECORD_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const RECORD_MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

function formatTripRecordDateLabel(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  if (!endDate || endDate === startDate) return RECORD_DATE.format(start);
  const end = new Date(endDate);
  const sameMonth = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) {
    return `${RECORD_DATE.format(start).split(",")[0]}–${RECORD_DATE.format(end)}`;
  }
  return `${RECORD_MONTH_YEAR.format(start)} – ${RECORD_MONTH_YEAR.format(end)}`;
}

/** Admin-added "trip run by this company" display records (migration 051)
 * — name + date range, no backing trips row, so callers must render these
 * as non-clickable (there's no /trips/[id] for a record id). Separate list
 * from getRealCompanyTrips() on purpose: these aren't ExploreTrip-shaped
 * (no members/budget/organizer — nothing bookable exists here). */
export async function getCompanyTripRecords(companyId: string): Promise<CompanyTripRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("company_trip_records")
    .select("id, title, start_date, end_date")
    .eq("company_id", companyId)
    .order("start_date", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    dateLabel: formatTripRecordDateLabel(r.start_date, r.end_date),
  }));
}

/** Reviews written directly against a company's profile (migration 048) —
 * distinct from the trip-level reviews getRealCompanies() averages into
 * the header rating. Admin-authored via the Add Review flow on the admin
 * Companies page; reuses the same shapeReviews() as user profiles so the
 * free-text trip/reviewer-name override rules stay identical. */
export async function getRealCompanyReviews(companyId: string): Promise<Review[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, created_at, reviewer_id, reviewer_display_name, trip_title_override, users!reviews_reviewer_id_fkey(name, initials), trips(title)"
    )
    .eq("reviewee_company_id", companyId)
    .eq("visibility", "published")
    .order("created_at", { ascending: false });
  return shapeReviews(rows);
}

/** Live/in-progress trips organized under this company, shaped as
 * ExploreTrip[] so the profile page can reuse ExploreTripCard directly —
 * same contract as lib/real-explore-shared.ts's fetchLiveTrips, just
 * scoped to one company_id instead of every trip. */
export async function getRealCompanyTrips(companyId: string): Promise<ExploreTrip[]> {
  const supabase = createClient();
  const { data: trips, error } = await supabase
    .from("trips")
    .select(
      "id, title, kind, availability_start, availability_end, duration_min, duration_max, budget_min, budget_max, fixed_start_date, fixed_end_date, price, original_price, max_group_size, min_age, max_age, gender_restriction, organizer_id, destinations(name, cover_image_url), users!trips_organizer_id_fkey(name)"
    )
    .eq("company_id", companyId)
    .in("status", ["live", "in_progress"])
    .order("created_at", { ascending: false });
  if (error || !trips || trips.length === 0) return [];

  // Same availability_end cutoff as lib/real-explore-shared.ts's
  // fetchLiveTrips — a community trip stops appearing once its window has
  // fully passed; partner trips (fixed dates) are unaffected.
  const todayIso = new Date().toISOString().slice(0, 10);
  const liveTrips = trips.filter(
    (t) => t.kind === "verified_partner" || !t.availability_end || t.availability_end >= todayIso
  );
  if (liveTrips.length === 0) return [];

  const tripIds = liveTrips.map((t) => t.id);
  const { data: members } = await supabase
    .from("trip_members")
    .select("trip_id")
    .in("trip_id", tripIds)
    .eq("status", "accepted");
  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(m.trip_id, (memberCounts.get(m.trip_id) ?? 0) + 1);
  }

  const organizerIds = Array.from(new Set(liveTrips.map((t) => t.organizer_id).filter(Boolean)));
  const trustByOrganizer = new Map<string, number>();
  if (organizerIds.length > 0) {
    const { data: trustRows } = await supabase.from("trust_scores").select("user_id, score").in("user_id", organizerIds);
    for (const r of trustRows ?? []) trustByOrganizer.set(r.user_id, Number(r.score));
  }

  return liveTrips.map((t): ExploreTrip => {
    const dest = Array.isArray(t.destinations) ? t.destinations[0] : t.destinations;
    const organizer = Array.isArray(t.users) ? t.users[0] : t.users;
    const joined = memberCounts.get(t.id) ?? 0;
    const trust = trustByOrganizer.get(t.organizer_id);
    return {
      id: t.id,
      destination: dest?.name ?? "—",
      title: t.title,
      dates: formatTripListingDates({
        kind: t.kind,
        availabilityStart: t.availability_start,
        availabilityEnd: t.availability_end,
        durationMin: t.duration_min,
        durationMax: t.duration_max,
        fixedStartDate: t.fixed_start_date,
        fixedEndDate: t.fixed_end_date,
      }),
      organizer: organizer?.name ?? "Trip Organizer",
      trust: trust !== undefined ? trust.toFixed(1) : "5.0",
      members: `${joined}/${t.max_group_size}`,
      budget: formatTripListingBudget({ kind: t.kind, budgetMin: t.budget_min, budgetMax: t.budget_max, price: t.price }),
      type: t.kind === "verified_partner" ? "partner" : "community",
      imgSrc: dest?.cover_image_url ?? "/placeholders/manali.svg",
      minAge: t.min_age,
      maxAge: t.max_age,
      genderRestriction: t.gender_restriction,
      budgetMin: t.budget_min,
      budgetMax: t.budget_max,
      durationMin: t.duration_min,
      durationMax: t.duration_max,
      price: t.price,
      originalPrice: t.original_price,
    };
  });
}
