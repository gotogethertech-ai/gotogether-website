import {
  featuredTrips,
  partnerTrips,
  exploreTrips,
  heroPeekCards,
} from "./mock-data";

export type OrganizerInfo = {
  kind: "individual" | "company";
  id?: string;
  name: string;
  /** Public Supabase Storage URL for the organizer's profile photo, or
   * null/undefined when unset — falls back to an initials circle. */
  avatarUrl?: string | null;
  tripsHosted: number;
  responseTime: string;
  trustScore?: string;
  aggregateRating?: string;
  ratingTripCount?: number;
  verified: boolean;
};

export type TripStatus =
  | "open"
  | "full"
  | "closed"
  | "cancelled"
  | "completed";

export type TripMemberInfo = {
  id: string;
  name: string;
  /** Public Supabase Storage URL for the member's profile photo, or
   * null/undefined when unset — falls back to an initials circle. */
  avatarUrl?: string | null;
};

export type TripDetail = {
  id: string;
  destination: string;
  region: string;
  title: string;
  dates: string;
  duration: string;
  tripType: string;
  budgetLabel: string; // "Estimated budget" (community) or "Price" (partner)
  budget: string;
  kind: "community" | "partner";
  status: TripStatus;
  imgSrc: string;
  organizer: OrganizerInfo;
  membersJoined: number;
  membersMax: number;
  members?: TripMemberInfo[];
  about: string;
  groupPreferences?: string[];
  itinerary?: { day: string; text: string }[];
  // Who can join, as set by the organizer in Create Trip (min_age always
  // has a value — defaults to MINIMUM_AGE — max_age/genderRestriction may
  // be unset/"any"). Rendered on the card and detail page so a visitor
  // knows before they request to join, not after.
  minAge?: number | null;
  maxAge?: number | null;
  genderRestriction?: "any" | "women_only" | "men_only";
};

/** The one fully-authored trip, matching "GoTogether Trip Details Page.dc.html"
 * verbatim (organizer, description, group preferences, itinerary all present).
 * Every other trip id falls back to buildFallbackDetail() below, which only
 * renders the *always-shown* sections — matching the blueprint's "hidden
 * completely when empty, never an empty placeholder" rule authentically,
 * since we don't have authored itinerary/preferences data for those yet.
 */
const AUTHORED_DETAILS: Record<string, TripDetail> = {
  "manali-snow-trek": {
    id: "manali-snow-trek",
    destination: "Manali",
    region: "Manali, Himachal Pradesh",
    title: "Manali Snow Trek — New Year Edition",
    dates: "Dec 20–24",
    duration: "5 days",
    tripType: "Trekking",
    budgetLabel: "Estimated budget",
    budget: "₹12,000",
    kind: "community",
    status: "open",
    imgSrc: "/placeholders/manali.svg",
    organizer: {
      kind: "individual",
      name: "Aarav Kapoor",
      tripsHosted: 3,
      responseTime: "Usually responds within a day",
      trustScore: "9.1",
      verified: true,
    },
    membersJoined: 5,
    membersMax: 6,
    about:
      "A 5-day trip to Manali over New Year — snow trekking, bonfire evenings, and figuring out the rest together in chat. Looking for travellers who are okay with basic homestays and a flexible plan. We'll split costs for stay and transport once the group is finalized.",
    groupPreferences: [
      "Age 22–30",
      "Mixed group",
      "Moderate budget style",
      "Adventure level: High",
    ],
    itinerary: [
      { day: "Day 1", text: "Arrival in Manali, check-in, evening at the local market" },
      { day: "Day 2", text: "Solang Valley snow activities" },
      { day: "Day 3", text: "Day trek, bonfire evening" },
    ],
  },
};

/** Builds a detail record from any list-view summary (Explore / Homepage
 * featured / partner / hero-peek) so every trip card links somewhere real,
 * without inventing itinerary/preferences content nobody authored. */
function buildFallbackDetail(id: string): TripDetail | null {
  const explore = exploreTrips.find((t) => t.id === id);
  if (explore) {
    const [joined, max] = explore.members.split("/").map(Number);
    return {
      id: explore.id,
      destination: explore.destination,
      region: `${explore.destination}, India`,
      title: explore.title,
      dates: explore.dates,
      duration: "",
      tripType: "",
      budgetLabel: explore.type === "partner" ? "Price" : "Estimated budget",
      budget: explore.budget,
      kind: explore.type,
      status: "open",
      imgSrc: explore.imgSrc,
      organizer: {
        kind: explore.type === "partner" ? "company" : "individual",
        name: explore.organizer,
        tripsHosted: 1,
        responseTime: "Usually responds within a day",
        trustScore: explore.type === "community" ? explore.trust : undefined,
        aggregateRating: explore.type === "partner" ? explore.trust : undefined,
        ratingTripCount: explore.type === "partner" ? 12 : undefined,
        verified: explore.type === "partner",
      },
      membersJoined: joined || 0,
      membersMax: max || 0,
      about: `Join fellow travellers heading to ${explore.destination} — plan the details together once the group comes together in chat.`,
    };
  }

  const featured = featuredTrips.find((t) => t.id === id);
  if (featured) {
    const [joined, max] = featured.members.split(" of ").map(Number);
    return {
      id: featured.id,
      destination: featured.title.split(" ")[0],
      region: featured.imgAlt,
      title: featured.title,
      dates: featured.dates,
      duration: "",
      tripType: "",
      budgetLabel: "Estimated budget",
      budget: "",
      kind: "community",
      status: "open",
      imgSrc: featured.imgSrc,
      organizer: {
        kind: "individual",
        name: featured.organizer.replace("Hosted by ", ""),
        tripsHosted: 1,
        responseTime: "Usually responds within a day",
        trustScore: featured.trust,
        verified: true,
      },
      membersJoined: joined || 0,
      membersMax: max || 0,
      about: `A trip to ${featured.imgAlt} planned by real travellers — details to be finalized together in chat once the group forms.`,
    };
  }

  const partner = partnerTrips.find((t) => t.id === id);
  if (partner) {
    return {
      id: partner.id,
      destination: partner.imgAlt,
      region: partner.imgAlt,
      title: partner.title,
      dates: partner.dates,
      duration: "",
      tripType: "",
      budgetLabel: "Price",
      budget: partner.price,
      kind: "partner",
      status: "open",
      imgSrc: partner.imgSrc,
      organizer: {
        kind: "company",
        name: "Verified Travel Partner",
        tripsHosted: 20,
        responseTime: "Usually responds within a few hours",
        aggregateRating: "9.0",
        ratingTripCount: 40,
        verified: true,
      },
      membersJoined: 0,
      membersMax: Number(partner.seats) || 0,
      about: `A professionally organized trip to ${partner.imgAlt} with fixed pricing and a confirmed departure date.`,
    };
  }

  const hero = heroPeekCards.find((t) => t.id === id);
  if (hero) {
    return {
      id: hero.id,
      destination: hero.title,
      region: hero.title,
      title: hero.title,
      dates: hero.dates,
      duration: "",
      tripType: "",
      budgetLabel: hero.badgeType === "partner" ? "Price" : "Estimated budget",
      budget: "",
      kind: hero.badgeType === "partner" ? "partner" : "community",
      status: "open",
      imgSrc: hero.imgSrc,
      organizer: {
        kind: hero.badgeType === "partner" ? "company" : "individual",
        name: hero.badgeType === "partner" ? "Verified Travel Partner" : "Trip Organizer",
        tripsHosted: 1,
        responseTime: "Usually responds within a day",
        trustScore: hero.badgeType === "trust" ? hero.badgeLabel.replace(/[^\d.]/g, "") : undefined,
        verified: hero.badgeType === "partner",
      },
      membersJoined: 0,
      membersMax: 0,
      about: `Details for this trip to ${hero.title} will appear here once the organizer publishes the full plan.`,
    };
  }

  return null;
}

export function getTripDetail(id: string): TripDetail | null {
  return AUTHORED_DETAILS[id] ?? buildFallbackDetail(id);
}

export function getAllTripIds(): string[] {
  const ids = new Set<string>();
  Object.keys(AUTHORED_DETAILS).forEach((id) => ids.add(id));
  exploreTrips.forEach((t) => ids.add(t.id));
  featuredTrips.forEach((t) => ids.add(t.id));
  partnerTrips.forEach((t) => ids.add(t.id));
  heroPeekCards.forEach((t) => ids.add(t.id));
  return Array.from(ids);
}
