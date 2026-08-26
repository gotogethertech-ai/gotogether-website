/**
 * Mock "my relationship to trips" data for the My Trips page, per the
 * approved My Trips Blueprint's Concept C (Priority Zone + Role Tabs).
 * There's no backend yet, so this stands in for what would otherwise be a
 * per-user API response — every id referenced here resolves through
 * getTripDetail() in trip-details.ts so "View Trip" links are real.
 */

export type PendingRequest = {
  tripId: string;
  title: string;
  dates: string;
  organizer: string;
  status: "pending" | "waitlist";
  waitlistPosition?: number;
  requestedDaysAgo: number;
};

export type UpcomingTrip = {
  tripId: string;
  destination: string;
  dates: string;
  countdown: string;
  title: string;
  status: "Confirmed" | "Full";
  imgSrc: string;
};

export type PastGoingTrip = {
  tripId: string;
  destination: string;
  dates: string;
  title: string;
  status: "Completed" | "Cancelled" | "Removed";
  reason?: string;
  reviewWindowOpen?: boolean;
  imgSrc: string;
};

export type RecentRequest = {
  tripId: string;
  title: string;
  status: "rejected" | "expired";
  daysAgo: number;
  cooldownElapsed: boolean;
};

export type HostedTrip = {
  tripId: string;
  destination: string;
  title: string;
  status: "draft" | "live" | "in-progress" | "completed" | "cancelled";
  dates?: string;
  membersJoined?: number;
  membersMax?: number;
  pendingRequests?: number;
  waitingListCount?: number;
  draftExpiresInDays?: number;
  /** Shown on click-through per Chapter 2 §2.7's mandatory-reason rule for
   * a Cancelled trip; distinguishes an Organizer's own cancellation from a
   * Moderator-initiated one (critique fix #7) so the host isn't implied to
   * have personally chosen it when they didn't. */
  cancelledReason?: string;
  cancelledByModerator?: boolean;
  imgSrc: string;
};

export type ActiveTrip = {
  tripId: string;
  title: string;
  role: "going" | "hosting";
  imgSrc: string;
};

/** At most one, per the blueprint's "realistically at most one" note —
 * still designed so the priority zone could render more than one banner
 * if this array ever had 2 items (the critique's dual-role edge case). */
export const activeTrips: ActiveTrip[] = [
  { tripId: "manali-snow-trek", title: "Manali Snow Trek", role: "going", imgSrc: "/placeholders/manali.svg" },
];

export const pendingRequests: PendingRequest[] = [
  {
    tripId: "spiti-valley-expedition",
    title: "Spiti Valley Expedition",
    dates: "Jan 14–24",
    organizer: "Peak Expeditions",
    status: "pending",
    requestedDaysAgo: 2,
  },
  {
    tripId: "kasol-backpacking-loop",
    title: "Kasol Riverside Retreat",
    dates: "Dec 6–9",
    organizer: "Meera S.",
    status: "waitlist",
    waitlistPosition: 2,
    requestedDaysAgo: 5,
  },
];

export const upcomingTrips: UpcomingTrip[] = [
  {
    tripId: "goa-beach-retreat",
    destination: "Goa",
    dates: "Oct 4–6",
    countdown: "in 12 days",
    title: "Goa Beach Weekend",
    status: "Confirmed",
    imgSrc: "/placeholders/goa.svg",
  },
  {
    tripId: "rishikesh-river-rafting",
    destination: "Rishikesh",
    dates: "Nov 8–10",
    countdown: "in 47 days",
    title: "Rishikesh River Rafting",
    status: "Confirmed",
    imgSrc: "/placeholders/rishikesh.svg",
  },
];

export const pastGoingTrips: PastGoingTrip[] = [
  {
    tripId: "jaipur-weekend-escape",
    destination: "Jaipur",
    dates: "Nov 15–17",
    title: "Jaipur Weekend Escape",
    status: "Completed",
    reviewWindowOpen: true,
    imgSrc: "/placeholders/jaipur.svg",
  },
  {
    tripId: "leh-ladakh-bike-trip",
    destination: "Leh-Ladakh",
    dates: "Aug 2–9",
    title: "Leh-Ladakh Bike Trip",
    status: "Completed",
    reviewWindowOpen: false,
    imgSrc: "/placeholders/leh-ladakh.svg",
  },
  {
    tripId: "mussoorie-quick-getaway",
    destination: "Mussoorie",
    dates: "Jun 1–2",
    title: "Mussoorie Quick Getaway",
    status: "Cancelled",
    reason: "Organizer cancelled due to low group size.",
    imgSrc: "/placeholders/mussoorie.svg",
  },
];

export const recentRequests: RecentRequest[] = [
  {
    tripId: "bir-paragliding-trip",
    title: "Bir Paragliding Trip",
    status: "rejected",
    daysAgo: 3,
    cooldownElapsed: false,
  },
  {
    tripId: "manali-winter-escape",
    title: "Manali Winter Escape",
    status: "expired",
    daysAgo: 9,
    cooldownElapsed: true,
  },
];

export const hostedTrips: HostedTrip[] = [
  {
    tripId: "manali-adventure-camp",
    destination: "Manali",
    title: "Manali Adventure Camp",
    status: "draft",
    draftExpiresInDays: 6,
    imgSrc: "/placeholders/manali.svg",
  },
  {
    tripId: "old-manali-cafe-hopping",
    destination: "Manali",
    title: "Old Manali Cafe Hopping",
    dates: "Dec 12–14",
    status: "live",
    membersJoined: 4,
    membersMax: 6,
    pendingRequests: 3,
    waitingListCount: 1,
    imgSrc: "/placeholders/manali.svg",
  },
  {
    tripId: "solang-valley-snow-trip",
    destination: "Manali",
    title: "Solang Valley Snow Trip",
    dates: "Jan 3–5",
    status: "live",
    membersJoined: 6,
    membersMax: 6,
    pendingRequests: 0,
    waitingListCount: 4,
    imgSrc: "/placeholders/manali.svg",
  },
  {
    tripId: "manali-to-kasol-road-trip",
    destination: "Manali",
    title: "Manali to Kasol Road Trip",
    dates: "Sep 20–22",
    status: "completed",
    imgSrc: "/placeholders/kasol.svg",
  },
  {
    tripId: "new-year-in-manali",
    destination: "Manali",
    title: "New Year in Manali",
    dates: "Dec 30–Jan 1",
    status: "cancelled",
    cancelledReason: "Cancelled — flagged content removed by a moderator.",
    cancelledByModerator: true,
    imgSrc: "/placeholders/manali.svg",
  },
];
