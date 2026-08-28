import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { ExploreTrip } from "@/lib/mock-data";
import { formatTripListingDates, formatTripListingBudget } from "@/lib/trip-dates";
import { slugify, dedupeSlugs, type RealCompany } from "@/lib/real-companies";

/**
 * Server-component counterpart to lib/real-companies.ts — same shaping
 * logic, but via the server Supabase client (used from Server Components
 * like app/travel-companies/[slug]/page.tsx, where the browser client
 * isn't available). Duplicated rather than shared, matching the existing
 * real-profile.ts / real-profile-server.ts split — see that file's
 * comment for the next/headers bundling reason.
 */

const MIN_RATING_SAMPLE = 5;
const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

function logoInitialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A single verified company by its derived slug, resolved by scanning
 * every verified company's slugified name (no slug column on the real
 * table — see lib/real-companies.ts's file comment) — or null if none
 * match, or if a name matches but the company isn't verified.
 *
 * Distinct companies can share a name (see lib/real-companies.ts's header
 * comment), so this dedupes slugs across the full verified set first —
 * same as getRealCompanies — before looking up the requested slug, rather
 * than matching the first same-named row it happens to see. */
export async function getRealCompanyBySlugServer(slug: string): Promise<RealCompany | null> {
  const supabase = await createServerSupabaseClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, contact_email, status, created_at")
    .eq("status", "verified");
  if (!companies) return null;

  const withSlugs = dedupeSlugs(companies.map((c) => ({ ...c, slug: slugify(c.name) })));
  const match = withSlugs.find((c) => c.slug === slug);
  if (!match) return null;

  const { data: trips } = await supabase.from("trips").select("id").eq("company_id", match.id);
  const tripIds = (trips ?? []).map((t) => t.id);

  let rating: string | null = null;
  if (tripIds.length > 0) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .in("trip_id", tripIds)
      .eq("visibility", "published");
    const ratings = (reviews ?? []).map((r) => r.rating);
    if (ratings.length >= MIN_RATING_SAMPLE) {
      rating = (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1);
    }
  }

  return {
    id: match.id,
    slug,
    name: match.name,
    logoInitial: logoInitialsFrom(match.name),
    tripsRun: tripIds.length,
    rating,
    supportEmail: match.contact_email,
    verifiedSince: MONTH_YEAR.format(new Date(match.created_at)),
  };
}

/** Every verified company's slug, for generateStaticParams — kept cheap
 * (id/name/status only) since it's called at build time, without a
 * request, so it uses the cookie-free public client
 * (createServerSupabaseClient's cookies() call throws outside a request
 * context — see lib/supabase/public-server.ts). Dedupes same-named
 * companies' slugs the same way getRealCompanies does, so every company
 * gets a distinct pre-rendered path. */
export async function getAllVerifiedCompanySlugsServer(): Promise<string[]> {
  const supabase = createPublicServerClient();
  const { data: companies } = await supabase.from("companies").select("id, name").eq("status", "verified");
  const withSlugs = dedupeSlugs((companies ?? []).map((c) => ({ ...c, slug: slugify(c.name) })));
  return withSlugs.map((c) => c.slug);
}

/** Live/in-progress trips for one company, server-side counterpart to
 * lib/real-companies.ts's getRealCompanyTrips. */
export async function getRealCompanyTripsServer(companyId: string): Promise<ExploreTrip[]> {
  const supabase = await createServerSupabaseClient();
  const { data: trips, error } = await supabase
    .from("trips")
    .select(
      "id, title, kind, availability_start, availability_end, duration_min, duration_max, budget_min, budget_max, fixed_start_date, fixed_end_date, price, original_price, max_group_size, min_age, max_age, gender_restriction, organizer_id, destinations(name, cover_image_url), users!trips_organizer_id_fkey(name)"
    )
    .eq("company_id", companyId)
    .in("status", ["live", "in_progress"])
    .order("created_at", { ascending: false });
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

  const organizerIds = Array.from(new Set(trips.map((t) => t.organizer_id).filter(Boolean)));
  const trustByOrganizer = new Map<string, number>();
  if (organizerIds.length > 0) {
    const { data: trustRows } = await supabase.from("trust_scores").select("user_id, score").in("user_id", organizerIds);
    for (const r of trustRows ?? []) trustByOrganizer.set(r.user_id, Number(r.score));
  }

  return trips.map((t): ExploreTrip => {
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
