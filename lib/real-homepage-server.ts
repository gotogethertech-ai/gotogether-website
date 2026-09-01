import { unstable_cache } from "next/cache";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { fetchLiveTrips } from "@/lib/real-explore-shared";
import type { FeaturedTrip, PartnerTrip } from "@/components/ui/TripCard";

/**
 * Real homepage trip data (Server Component only — app/page.tsx).
 *
 * The homepage's "Trips For You" / hero-peek sections show community
 * trips; "Verified Partner Trips" shows verified_partner-kind trips. Both
 * are simply empty when no real trips of that kind exist yet — no
 * fallback to sample data, per the Aug 23 "not a showcase" instruction.
 *
 * Switched from createServerSupabaseClient() (cookie-based, forces the
 * whole route dynamic — same mistake caught and fixed for the WhatsApp
 * button in lib/site-settings-server.ts) to the cookie-free public
 * client: this query has no auth.uid() scoping, it's the same public
 * trip listing for every anonymous visitor, so there's no reason to pay
 * a per-request cookies() read for it. unstable_cache lets `/` go back
 * to being statically served with a short revalidate window instead of
 * hitting Supabase on every single request.
 */
export const getRealHomepageTrips = unstable_cache(
  async (): Promise<{
    featured: FeaturedTrip[];
    partners: PartnerTrip[];
    heroPeek: FeaturedTrip[];
  }> => {
  const supabase = createPublicServerClient();
  const trips = await fetchLiveTrips(supabase, 12);

  const community = trips.filter((t) => t.type === "community");
  const partner = trips.filter((t) => t.type === "partner");

  const featured: FeaturedTrip[] = community.slice(0, 6).map((t) => ({
    id: t.id,
    title: t.title,
    dates: t.dates,
    members: t.members.replace("/", " of "),
    trust: t.trust,
    organizer: `Hosted by ${t.organizer.split(" ")[0]}`,
    imgAlt: t.destination,
    imgSrc: t.imgSrc,
    minAge: t.minAge,
    maxAge: t.maxAge,
    genderRestriction: t.genderRestriction,
    joinedCount: t.joinedCount,
    maxGroupSize: t.maxGroupSize,
    deadlineDate: t.deadlineDate,
  }));

  const partners: PartnerTrip[] = partner.slice(0, 6).map((t) => ({
    id: t.id,
    title: t.title,
    dates: t.dates,
    seats: t.members.split("/")[1] ?? "—",
    price: t.budget,
    priceValue: t.price ?? null,
    originalPriceValue: t.originalPrice ?? null,
    imgAlt: t.destination,
    imgSrc: t.imgSrc,
    minAge: t.minAge,
    maxAge: t.maxAge,
    genderRestriction: t.genderRestriction,
    joinedCount: t.joinedCount,
    maxGroupSize: t.maxGroupSize,
    deadlineDate: t.deadlineDate,
  }));

  return { featured, partners, heroPeek: featured.slice(0, 3) };
  },
  ["homepage-trips"],
  { revalidate: 60 }
);
