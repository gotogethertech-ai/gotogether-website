import type { FeaturedTrip, PartnerTrip } from "@/components/ui/TripCard";

/**
 * Placeholder content for the frontend-only build phase. Real content will
 * come from the trip/explore API once the backend is wired (Phase 0 of the
 * website build is frontend-only, matching the mobile app's own process).
 * Image placeholders are flagged gradient SVGs, never implying real photos.
 */
export const featuredTrips: FeaturedTrip[] = [
  {
    id: "manali-snow-trek",
    title: "Manali Snow Trek",
    dates: "Dec 20–24",
    members: "5 of 6",
    trust: "9.1",
    organizer: "Hosted by Aarav",
    imgAlt: "Manali",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "rishikesh-river-rafting",
    title: "Rishikesh River Rafting",
    dates: "Mar 8–10",
    members: "4 of 6",
    trust: "8.9",
    organizer: "Hosted by Priya",
    imgAlt: "Rishikesh",
    imgSrc: "/placeholders/rishikesh.svg",
  },
  {
    id: "jaipur-weekend-escape",
    title: "Jaipur Weekend Escape",
    dates: "Nov 15–17",
    members: "3 of 5",
    trust: "9.4",
    organizer: "Hosted by Kabir",
    imgAlt: "Jaipur",
    imgSrc: "/placeholders/jaipur.svg",
  },
  {
    id: "kasol-backpacking-loop",
    title: "Kasol Backpacking Loop",
    dates: "Jan 2–8",
    members: "6 of 8",
    trust: "8.6",
    organizer: "Hosted by Meera",
    imgAlt: "Kasol",
    imgSrc: "/placeholders/kasol.svg",
  },
  {
    id: "bir-paragliding-trip",
    title: "Bir Paragliding Trip",
    dates: "Feb 20–22",
    members: "4 of 6",
    trust: "9.0",
    organizer: "Hosted by Rohan",
    imgAlt: "Bir",
    imgSrc: "/placeholders/bir.svg",
  },
  {
    id: "mussoorie-quick-getaway",
    title: "Mussoorie Quick Getaway",
    dates: "Dec 6–8",
    members: "2 of 5",
    trust: "8.8",
    organizer: "Hosted by Sana",
    imgAlt: "Mussoorie",
    imgSrc: "/placeholders/mussoorie.svg",
  },
];

export const partnerTrips: PartnerTrip[] = [
  {
    id: "spiti-valley-expedition",
    title: "Spiti Valley Expedition",
    dates: "Jan 14–24",
    seats: "4",
    price: "₹18,500",
    imgAlt: "Spiti Valley",
    imgSrc: "/placeholders/spiti.svg",
  },
  {
    id: "leh-ladakh-bike-trip",
    title: "Leh Ladakh Bike Trip",
    dates: "Jun 10–17",
    seats: "6",
    price: "₹24,900",
    imgAlt: "Leh Ladakh",
    imgSrc: "/placeholders/leh-ladakh.svg",
  },
  {
    id: "goa-beach-retreat",
    title: "Goa Beach Retreat",
    dates: "Oct 4–6",
    seats: "8",
    price: "₹8,200",
    imgAlt: "Goa",
    imgSrc: "/placeholders/goa.svg",
  },
];

export const popularDestinations = [
  { name: "Manali", imgSrc: "/placeholders/manali.svg" },
  { name: "Kasol", imgSrc: "/placeholders/kasol.svg" },
  { name: "Goa", imgSrc: "/placeholders/goa.svg" },
  { name: "Spiti", imgSrc: "/placeholders/spiti.svg" },
  { name: "Rishikesh", imgSrc: "/placeholders/rishikesh.svg" },
  { name: "Jaipur", imgSrc: "/placeholders/jaipur.svg" },
];

export type ExploreTrip = {
  id: string;
  destination: string;
  title: string;
  dates: string;
  organizer: string;
  trust: string;
  members: string;
  budget: string;
  type: "community" | "partner";
  imgSrc: string;
  // Who-can-join preferences (Aug 2026 product decision) — optional since
  // the seed mock trips below predate this field; real trips always set
  // these (min_age defaults to 18, gender_restriction defaults to "any").
  minAge?: number | null;
  maxAge?: number | null;
  genderRestriction?: "any" | "women_only" | "men_only";
  // Raw numeric fields backing the Budget/Duration filter panel — `budget`
  // and `dates` above are already-formatted display strings, not usable
  // for range comparisons. Optional for the same reason as the age/gender
  // fields: the seed mock trips below predate real filtering.
  budgetMin?: number | null;
  budgetMax?: number | null;
  durationMin?: number | null;
  durationMax?: number | null;
  // Verified Partner trips only: fixed price (+ optional higher
  // originalPrice for the struck-through discount display via PriceTag).
  // null/undefined for community trips, which use budgetMin/budgetMax
  // instead.
  price?: number | null;
  originalPrice?: number | null;
  // Raw fields backing the "2 spots left" / "2 days left" urgency badge
  // (see lib/trip-dates.ts's getUrgencyBadge) — optional for the same
  // reason as the fields above: the seed mock trips below predate it.
  // joinedCount/maxGroupSize come from `members` ("N/M") on real trips;
  // deadlineDate is availability_end (community) or fixed_end_date
  // (Verified Partner) — whichever date the trip closes to new joiners.
  joinedCount?: number | null;
  maxGroupSize?: number | null;
  deadlineDate?: string | null;
};

/** Explore result set — matches "GoTogether Explore Page.dc.html"'s exact
 * 12 seed trips (all Manali, since the design shows an applied destination
 * filter chip). Real data comes from the trip search API later. */
export const exploreTrips: ExploreTrip[] = [
  {
    id: "manali-snow-trek",
    destination: "Manali",
    title: "Manali Snow Trek",
    dates: "Dec 20–24",
    organizer: "Aarav K.",
    trust: "9.1",
    members: "5/6",
    budget: "₹12,000",
    type: "community",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "old-manali-cafe-hopping",
    destination: "Manali",
    title: "Old Manali Café Hopping Weekend",
    dates: "Nov 8–10",
    organizer: "Meera S.",
    trust: "8.7",
    members: "3/5",
    budget: "₹8,000",
    type: "community",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "manali-adventure-camp",
    destination: "Manali",
    title: "Manali Adventure Camp",
    dates: "Dec 27–31",
    organizer: "Summit Travels",
    trust: "9.3",
    members: "6/10",
    budget: "₹16,500",
    type: "partner",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "solang-valley-snow-trip",
    destination: "Manali",
    title: "Solang Valley Snow Trip",
    dates: "Jan 3–6",
    organizer: "Kabir R.",
    trust: "8.9",
    members: "4/6",
    budget: "₹11,000",
    type: "community",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "manali-to-kasol-road-trip",
    destination: "Manali",
    title: "Manali to Kasol Road Trip",
    dates: "Dec 14–18",
    organizer: "Rohan T.",
    trust: "8.5",
    members: "5/6",
    budget: "₹14,000",
    type: "community",
    imgSrc: "/placeholders/kasol.svg",
  },
  {
    id: "manali-winter-escape",
    destination: "Manali",
    title: "Manali Winter Escape",
    dates: "Jan 10–14",
    organizer: "Highland Journeys",
    trust: "9.0",
    members: "7/12",
    budget: "₹19,900",
    type: "partner",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "new-year-in-manali",
    destination: "Manali",
    title: "New Year in Manali",
    dates: "Dec 29–Jan 2",
    organizer: "Priya N.",
    trust: "9.2",
    members: "6/6",
    budget: "₹15,500",
    type: "community",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "manali-backpacking-for-beginners",
    destination: "Manali",
    title: "Manali Backpacking for Beginners",
    dates: "Nov 22–25",
    organizer: "Sana V.",
    trust: "8.6",
    members: "2/5",
    budget: "₹9,000",
    type: "community",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "hampta-pass-trek-via-manali",
    destination: "Manali",
    title: "Hampta Pass Trek via Manali",
    dates: "Jun 12–17",
    organizer: "Vikram J.",
    trust: "9.4",
    members: "5/8",
    budget: "₹13,000",
    type: "community",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "manali-group-tour-package",
    destination: "Manali",
    title: "Manali Group Tour Package",
    dates: "Feb 5–9",
    organizer: "Peak Expeditions",
    trust: "8.8",
    members: "9/15",
    budget: "₹17,200",
    type: "partner",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "manali-photography-trip",
    destination: "Manali",
    title: "Manali Photography Trip",
    dates: "Oct 30–Nov 2",
    organizer: "Ishaan D.",
    trust: "8.4",
    members: "3/5",
    budget: "₹10,500",
    type: "community",
    imgSrc: "/placeholders/manali.svg",
  },
  {
    id: "manali-cafe-and-culture-trail",
    destination: "Manali",
    title: "Manali Café & Culture Trail",
    dates: "Dec 6–9",
    organizer: "Anaya P.",
    trust: "9.0",
    members: "4/6",
    budget: "₹9,800",
    type: "community",
    imgSrc: "/placeholders/manali.svg",
  },
];

export const heroPeekCards: {
  id: string;
  title: string;
  dates: string;
  meta: string;
  badgeType: "trust" | "partner";
  badgeLabel: string;
  imgSrc: string;
  rotateClass: string;
  positionClass: string;
}[] = [
  {
    id: "manali-snow-trek",
    title: "Manali Snow Trek",
    dates: "Dec 20–24",
    meta: "5 joined",
    badgeType: "trust",
    badgeLabel: "⭐ 9.1 Trust",
    imgSrc: "/placeholders/manali.svg",
    rotateClass: "rotate-3",
    positionClass: "top-0 right-10",
  },
  {
    id: "goa-beach-weekend",
    title: "Goa Beach Weekend",
    dates: "Oct 4–6",
    meta: "6 joined",
    badgeType: "partner",
    badgeLabel: "Verified Partner",
    imgSrc: "/placeholders/goa.svg",
    rotateClass: "-rotate-2",
    positionClass: "top-[130px] left-2.5",
  },
  {
    id: "spiti-valley-loop",
    title: "Spiti Valley Loop",
    dates: "Jan 14–24",
    meta: "3 joined",
    badgeType: "trust",
    badgeLabel: "⭐ 8.7 Trust",
    imgSrc: "/placeholders/spiti.svg",
    rotateClass: "rotate-2",
    positionClass: "bottom-0 right-0",
  },
];
