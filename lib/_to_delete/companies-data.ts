import { exploreTrips } from "./mock-data";

/**
 * Verified Travel Companies catalog, per the approved Travel Companies
 * Blueprint: every company here is, by definition, Verified — an
 * unverified/Suspended company is never listed. Matches "GoTogether Travel
 * Companies Page.dc.html"'s seed set exactly.
 */
export type CompanyData = {
  slug: string;
  name: string;
  logoInitial: string;
  description: string;
  aboutFull: string;
  tripsRun: number;
  rating: string | null; // null → below the minimum-sample threshold
  supportEmail: string;
  cancellationPolicy?: string;
  verifiedSince: string;
};

const MIN_RATING_SAMPLE = 5;

export const companies: CompanyData[] = [
  {
    slug: "summit-travels",
    name: "Summit Travels",
    logoInitial: "ST",
    description: "Himalayan treks & group camps",
    aboutFull:
      "Summit Travels has been organizing verified group trips from Delhi NCR since 2023, focusing on Himalayan treks, snow camps, and short group getaways. All trips are led by trained local guides with safety briefings included.",
    tripsRun: 18,
    rating: "9.1",
    supportEmail: "support@summittravels.in",
    cancellationPolicy: "Full refund up to 7 days before departure",
    verifiedSince: "Mar 2026",
  },
  {
    slug: "highland-journeys",
    name: "Highland Journeys",
    logoInitial: "HJ",
    description: "Winter escapes across North India",
    aboutFull:
      "Highland Journeys runs small-group winter trips across North India, with a focus on snow destinations reachable within a long weekend from Delhi NCR.",
    tripsRun: 26,
    rating: "8.9",
    supportEmail: "hello@highlandjourneys.in",
    cancellationPolicy: "Full refund up to 5 days before departure",
    verifiedSince: "Jan 2026",
  },
  {
    slug: "peak-expeditions",
    name: "Peak Expeditions",
    logoInitial: "PE",
    description: "Adventure tours, group treks",
    aboutFull:
      "Peak Expeditions specializes in multi-day trekking and adventure tours across Himachal Pradesh and Ladakh, with certified trek leaders on every trip.",
    tripsRun: 34,
    rating: "8.7",
    supportEmail: "contact@peakexpeditions.in",
    verifiedSince: "Aug 2025",
  },
  {
    slug: "coastal-wanderers",
    name: "Coastal Wanderers",
    logoInitial: "CW",
    description: "Goa & coastal weekend trips",
    aboutFull:
      "Coastal Wanderers organizes beach-focused weekend trips to Goa, with an emphasis on small groups and locally-guided experiences.",
    tripsRun: 12,
    rating: "8.8",
    supportEmail: "support@coastalwanderers.in",
    cancellationPolicy: "Full refund up to 3 days before departure",
    verifiedSince: "May 2026",
  },
  {
    slug: "valley-escapes-co",
    name: "Valley Escapes Co.",
    logoInitial: "VE",
    description: "Curated valley & hill-station trips",
    aboutFull:
      "Valley Escapes Co. curates small-group trips to hill stations and valley towns within driving distance of Delhi NCR, aimed at first-time group travellers.",
    tripsRun: 9,
    rating: null,
    supportEmail: "team@valleyescapes.co.in",
    verifiedSince: "Jul 2026",
  },
  {
    slug: "northbound-trails",
    name: "Northbound Trails",
    logoInitial: "NT",
    description: "Backpacking & road trip circuits",
    aboutFull:
      "Northbound Trails runs backpacking circuits and road trips across North India, popular with first-time solo travellers looking to join a group.",
    tripsRun: 21,
    rating: "8.6",
    supportEmail: "info@northboundtrails.in",
    cancellationPolicy: "Full refund up to 7 days before departure",
    verifiedSince: "Feb 2026",
  },
  {
    slug: "wanderlust-collective",
    name: "Wanderlust Collective",
    logoInitial: "WC",
    description: "Group adventure travel",
    aboutFull:
      "Wanderlust Collective organizes group adventure travel across North India, from snow treks to river-rafting camps.",
    tripsRun: 15,
    rating: "9.2",
    supportEmail: "reach@wanderlustcollective.in",
    verifiedSince: "Apr 2026",
  },
  {
    slug: "trailmates-india",
    name: "TrailMates India",
    logoInitial: "TM",
    description: "Trekking & camping experiences",
    aboutFull:
      "TrailMates India runs trekking and camping trips for small groups, with a focus on beginner-friendly Himalayan treks.",
    tripsRun: 7,
    rating: null,
    supportEmail: "hi@trailmatesindia.in",
    verifiedSince: "Jun 2026",
  },
];

export function getCompanyBySlug(slug: string): CompanyData | undefined {
  return companies.find((c) => c.slug === slug);
}

export function searchCompanies(query: string): CompanyData[] {
  const q = query.trim().toLowerCase();
  if (!q) return companies;
  return companies.filter((c) => c.name.toLowerCase().includes(q));
}

/** Formats a rating with its trip-count basis, per the blueprint's
 * "never a bare number" rule, with an insufficient-data fallback below the
 * minimum sample threshold. */
export function formatRatingWithBasis(company: CompanyData): string {
  if (!company.rating || company.tripsRun < MIN_RATING_SAMPLE) {
    return "Not enough reviews yet";
  }
  return `${company.rating} · from ${company.tripsRun} trips`;
}

export function formatTripsRun(company: CompanyData): string {
  return company.tripsRun > 100 ? `${Math.floor(company.tripsRun / 10) * 10}+ trips completed` : `${company.tripsRun} trips completed`;
}

/** Trips organized by this company — matched by organizer name against the
 * existing partner-type Explore results (mock stand-in for a real
 * company_id foreign key). */
export function getTripsForCompany(companyName: string) {
  return exploreTrips.filter((t) => t.type === "partner" && t.organizer === companyName);
}
