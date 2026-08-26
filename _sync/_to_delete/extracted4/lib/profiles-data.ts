/**
 * Mock profile data, per the Public Profile Blueprint's approved Concept
 * C (Balanced Profile with Progressive Disclosure). Keyed by a slug/id
 * matched loosely against names already used across Trip Details,
 * Organizer cards, and Host Management rows, so every "View Profile" link
 * built so far resolves to something real rather than a dead route.
 */

export type Badge = {
  key: string;
  label: string;
  icon: string;
  description: string;
};

export type TrustSubScore = {
  label: string;
  score: number; // 0-10
};

export type Review = {
  id: string;
  reviewerName: string;
  reviewerInitials: string;
  tripName: string;
  date: string;
  text: string;
  tags: string[];
};

export type TravelHistoryEntry = {
  id: string;
  destination: string;
  dates: string;
  role: "Organizer" | "Member";
  status: "Completed" | "Cancelled";
};

export type ProfileData = {
  slug: string;
  name: string;
  initials: string;
  city: string;
  memberSince: string;
  bio: string;
  verifications: { label: string; description: string }[];
  trustScore: number;
  reviewCount: number;
  tripsCompleted: number;
  stats: {
    tripsJoined: number;
    tripsCompleted: number;
    tripsOrganized: number;
    citiesExplored: number;
    responseRate: number | null; // null = never organized, conditionally hidden
    avgReplyTime: string | null;
    memberSince: string;
  };
  badges: Badge[];
  trustBreakdown: TrustSubScore[];
  reviews: Review[];
  history: TravelHistoryEntry[];
  activeTripId?: string;
  suspended?: boolean;
};

const PROFILES: Record<string, ProfileData> = {
  "riya-anand": {
    slug: "riya-anand",
    name: "Riya Anand",
    initials: "RA",
    city: "Mumbai",
    memberSince: "Feb 2026",
    bio: "Always planning the next trip before the current one's even done. Big fan of road trips and hill stations.",
    verifications: [
      { label: "ID Verified", description: "Identity confirmed through an official government-issued document" },
      { label: "Mobile Verified", description: "Mobile number confirmed via OTP" },
      { label: "Email Verified", description: "Email address confirmed" },
    ],
    trustScore: 9.1,
    reviewCount: 9,
    tripsCompleted: 6,
    stats: {
      tripsJoined: 6,
      tripsCompleted: 6,
      tripsOrganized: 2,
      citiesExplored: 5,
      responseRate: 92,
      avgReplyTime: "3 hrs",
      memberSince: "Feb 2026",
    },
    badges: [
      { key: "reliable", label: "Reliable Traveller", icon: "🛡️", description: "5+ completed trips with zero removals" },
    ],
    trustBreakdown: [
      { label: "Behaviour", score: 9.2 },
      { label: "Punctuality", score: 8.9 },
      { label: "Communication", score: 9.3 },
      { label: "Cooperation", score: 9.1 },
      { label: "Safety", score: 9.4 },
      { label: "Reliability", score: 8.9 },
    ],
    reviews: [
      {
        id: "r1",
        reviewerName: "Kabir Rathi",
        reviewerInitials: "KR",
        tripName: "Old Manali Cafe Hopping",
        date: "Nov 2025",
        text: "Super organized and communicative throughout — made the whole trip easy to plan around.",
        tags: ["Great planner", "Punctual"],
      },
    ],
    history: [
      { id: "h1", destination: "Old Manali", dates: "Nov 2–4, 2025", role: "Organizer", status: "Completed" },
      { id: "h2", destination: "Manali", dates: "Sep 20–22, 2025", role: "Organizer", status: "Completed" },
    ],
    activeTripId: "old-manali-cafe-hopping",
  },
  "aarav-kapoor": {
    slug: "aarav-kapoor",
    name: "Aarav Kapoor",
    initials: "AK",
    city: "New Delhi",
    memberSince: "Jan 2026",
    bio: "Weekend trekker, loves offbeat Himalayan trails and slow travel. Usually the one planning the group's next trip.",
    verifications: [
      { label: "ID Verified", description: "Identity confirmed through an official government-issued document" },
      { label: "Mobile Verified", description: "Mobile number confirmed via OTP" },
      { label: "Email Verified", description: "Email address confirmed" },
    ],
    trustScore: 9.1,
    reviewCount: 12,
    tripsCompleted: 8,
    stats: {
      tripsJoined: 8,
      tripsCompleted: 8,
      tripsOrganized: 3,
      citiesExplored: 6,
      responseRate: 96,
      avgReplyTime: "2 hrs",
      memberSince: "Jan 2026",
    },
    badges: [
      { key: "reliable", label: "Reliable Traveller", icon: "🛡️", description: "5+ completed trips with zero removals" },
      { key: "organizer", label: "Top Organizer", icon: "🧭", description: "3+ trips organized, all completed, 4.5+ avg. rating" },
    ],
    trustBreakdown: [
      { label: "Behaviour", score: 9.3 },
      { label: "Punctuality", score: 8.7 },
      { label: "Communication", score: 9.4 },
      { label: "Cooperation", score: 9.0 },
      { label: "Safety", score: 9.5 },
      { label: "Reliability", score: 8.8 },
    ],
    reviews: [
      {
        id: "r1",
        reviewerName: "Priya Nair",
        reviewerInitials: "PN",
        tripName: "Manali Snow Trek",
        date: "Dec 2025",
        text: "Aarav planned everything down to the last detail and kept the group updated the whole way. Would travel with him again in a heartbeat.",
        tags: ["Punctual", "Great planner"],
      },
      {
        id: "r2",
        reviewerName: "Kabir Rathi",
        reviewerInitials: "KR",
        tripName: "Old Manali Cafe Hopping",
        date: "Nov 2025",
        text: "Friendly, easy to talk to, and made sure everyone felt included even though most of us hadn't met before.",
        tags: ["Friendly", "Helpful"],
      },
    ],
    history: [
      { id: "h1", destination: "Manali", dates: "Dec 20–24, 2025", role: "Organizer", status: "Completed" },
      { id: "h2", destination: "Old Manali", dates: "Nov 2–4, 2025", role: "Organizer", status: "Completed" },
      { id: "h3", destination: "Spiti Valley", dates: "Sep 2025", role: "Member", status: "Completed" },
    ],
    activeTripId: "old-manali-cafe-hopping",
  },
  "priya-nair": {
    slug: "priya-nair",
    name: "Priya Nair",
    initials: "PN",
    city: "Bengaluru",
    memberSince: "Mar 2026",
    bio: "Beach trips and food trails over mountains, most days. Always down for a spontaneous weekend plan.",
    verifications: [
      { label: "ID Verified", description: "Identity confirmed through an official government-issued document" },
      { label: "Mobile Verified", description: "Mobile number confirmed via OTP" },
    ],
    trustScore: 9.3,
    reviewCount: 6,
    tripsCompleted: 4,
    stats: {
      tripsJoined: 4,
      tripsCompleted: 4,
      tripsOrganized: 0,
      citiesExplored: 3,
      responseRate: null,
      avgReplyTime: null,
      memberSince: "Mar 2026",
    },
    badges: [],
    trustBreakdown: [
      { label: "Behaviour", score: 9.4 },
      { label: "Punctuality", score: 9.1 },
      { label: "Communication", score: 9.5 },
      { label: "Cooperation", score: 9.2 },
      { label: "Safety", score: 9.6 },
      { label: "Reliability", score: 9.0 },
    ],
    reviews: [
      {
        id: "r1",
        reviewerName: "Aarav Kapoor",
        reviewerInitials: "AK",
        tripName: "Manali Snow Trek",
        date: "Dec 2025",
        text: "Great energy on the trip, always on time and easy to coordinate with.",
        tags: ["Punctual", "Friendly"],
      },
    ],
    history: [
      { id: "h1", destination: "Manali", dates: "Dec 20–24, 2025", role: "Member", status: "Completed" },
      { id: "h2", destination: "Old Manali", dates: "Nov 2–4, 2025", role: "Member", status: "Completed" },
    ],
  },
  "new-member": {
    slug: "new-member",
    name: "Neha Kulkarni",
    initials: "NK",
    city: "Pune",
    memberSince: "Aug 2026",
    bio: "New here — excited to find my first trip!",
    verifications: [
      { label: "Mobile Verified", description: "Mobile number confirmed via OTP" },
      { label: "Email Verified", description: "Email address confirmed" },
    ],
    trustScore: 0,
    reviewCount: 0,
    tripsCompleted: 0,
    stats: {
      tripsJoined: 0,
      tripsCompleted: 0,
      tripsOrganized: 0,
      citiesExplored: 0,
      responseRate: null,
      avgReplyTime: null,
      memberSince: "Aug 2026",
    },
    badges: [],
    trustBreakdown: [
      { label: "Behaviour", score: 0 },
      { label: "Punctuality", score: 0 },
      { label: "Communication", score: 0 },
      { label: "Cooperation", score: 0 },
      { label: "Safety", score: 0 },
      { label: "Reliability", score: 0 },
    ],
    reviews: [],
    history: [],
  },
};

export function getProfile(slug: string): ProfileData | undefined {
  // Match loosely: an encoded name ("Aarav Kapoor" -> "aarav-kapoor") or an
  // exact slug, since links across the app use either form depending on
  // what data was on hand at the call site (organizer.name vs a real id).
  const normalized = decodeURIComponent(slug).toLowerCase().replace(/\s+/g, "-");
  return PROFILES[normalized] ?? PROFILES[slug];
}

export function getAllProfileSlugs(): string[] {
  return Object.keys(PROFILES);
}
