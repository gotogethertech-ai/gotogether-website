import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchLiveTrips } from "@/lib/real-explore-shared";
import type { FeaturedTrip, PartnerTrip } from "@/components/ui/TripCard";

/**
 * Real homepage trip data (Server Component only — app/page.tsx). Kept
 * separate from lib/real-explore.ts so lib/supabase/server's next/headers
 * import never reaches a client bundle (same reasoning as
 * lib/real-trip-details-server.ts).
 *
 * The homepage's "Trips For You" / hero-peek sections show community
 * trips; "Verified Partner Trips" shows verified_partner-kind trips. Both
 * are simply empty when no real trips of that kind exist yet — no
 * fallback to sample data, per the Aug 23 "not a showcase" instruction.
 */
export async function getRealHomepageTrips(): Promise<{
  featured: FeaturedTrip[];
  partners: PartnerTrip[];
  heroPeek: FeaturedTrip[];
}> {
  const supabase = await createServerSupabaseClient();
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
  }));

  return { featured, partners, heroPeek: featured.slice(0, 3) };
}
