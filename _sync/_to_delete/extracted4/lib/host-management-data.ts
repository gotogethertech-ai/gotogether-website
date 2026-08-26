import { hostedTrips, type HostedTrip } from "./my-trips-data";

/**
 * Mock "host's view of their own trip" data, per the Host Trip Management
 * Blueprint's Concept C. Keyed by tripId so each hosted trip (draft, live
 * with pending requests, full, completed, cancelled) gets a realistic,
 * state-appropriate management surface — reusing hostedTrips from My Trips
 * as the single source of trip-level facts (status, capacity) rather than
 * inventing a second copy that could drift out of sync.
 */

export type PendingApplicant = {
  id: string;
  name: string;
  initials: string;
  trustScore: string;
  requestedDaysAgo: number;
  hoursRemaining: number; // SLA countdown per request, not just an aggregate count
};

export type Participant = {
  id: string;
  name: string;
  initials: string;
  trustScore: string;
  role: "organizer" | "member";
  joinedDate: string;
};

export type WaitingListEntry = {
  id: string;
  name: string;
  initials: string;
  position: number;
};

export type HostManagementRecord = {
  tripId: string;
  pendingApplicants: PendingApplicant[];
  participants: Participant[];
  waitingList: WaitingListEntry[];
};

const RECORDS: Record<string, HostManagementRecord> = {
  "old-manali-cafe-hopping": {
    tripId: "old-manali-cafe-hopping",
    pendingApplicants: [
      { id: "p1", name: "Neha Kulkarni", initials: "NK", trustScore: "8.9", requestedDaysAgo: 1, hoursRemaining: 60 },
      { id: "p2", name: "Arjun Malhotra", initials: "AM", trustScore: "9.2", requestedDaysAgo: 2, hoursRemaining: 36 },
      { id: "p3", name: "Divya Rao", initials: "DR", trustScore: "8.5", requestedDaysAgo: 3, hoursRemaining: 12 },
    ],
    participants: [
      { id: "you", name: "You", initials: "RA", trustScore: "9.1", role: "organizer", joinedDate: "Hosted" },
      { id: "m1", name: "Kabir Rathi", initials: "KR", trustScore: "8.8", role: "member", joinedDate: "Joined Nov 2" },
      { id: "m2", name: "Sana Verma", initials: "SV", trustScore: "9.0", role: "member", joinedDate: "Joined Nov 4" },
      { id: "m3", name: "Ishaan Dutta", initials: "ID", trustScore: "8.6", role: "member", joinedDate: "Joined Nov 6" },
      { id: "m4", name: "Priya Nair", initials: "PN", trustScore: "9.3", role: "member", joinedDate: "Joined Nov 9" },
    ],
    waitingList: [{ id: "w1", name: "Rohan Thakur", initials: "RT", position: 1 }],
  },
  "solang-valley-snow-trip": {
    tripId: "solang-valley-snow-trip",
    pendingApplicants: [],
    participants: [
      { id: "you", name: "You", initials: "RA", trustScore: "9.1", role: "organizer", joinedDate: "Hosted" },
      { id: "m1", name: "Vikram Joshi", initials: "VJ", trustScore: "8.7", role: "member", joinedDate: "Joined Oct 20" },
      { id: "m2", name: "Anaya Pillai", initials: "AP", trustScore: "9.1", role: "member", joinedDate: "Joined Oct 22" },
      { id: "m3", name: "Meera Shah", initials: "MS", trustScore: "8.9", role: "member", joinedDate: "Joined Oct 25" },
      { id: "m4", name: "Kabir Rathi", initials: "KR", trustScore: "8.8", role: "member", joinedDate: "Joined Oct 27" },
      { id: "m5", name: "Sana Verma", initials: "SV", trustScore: "9.0", role: "member", joinedDate: "Joined Oct 30" },
    ],
    waitingList: [
      { id: "w1", name: "Neha Kulkarni", initials: "NK", position: 1 },
      { id: "w2", name: "Arjun Malhotra", initials: "AM", position: 2 },
      { id: "w3", name: "Divya Rao", initials: "DR", position: 3 },
      { id: "w4", name: "Rohan Thakur", initials: "RT", position: 4 },
    ],
  },
  "manali-to-kasol-road-trip": {
    tripId: "manali-to-kasol-road-trip",
    pendingApplicants: [],
    participants: [
      { id: "you", name: "You", initials: "RA", trustScore: "9.1", role: "organizer", joinedDate: "Hosted" },
      { id: "m1", name: "Ishaan Dutta", initials: "ID", trustScore: "8.6", role: "member", joinedDate: "Joined Sep 10" },
      { id: "m2", name: "Priya Nair", initials: "PN", trustScore: "9.3", role: "member", joinedDate: "Joined Sep 12" },
    ],
    waitingList: [],
  },
  "manali-adventure-camp": {
    tripId: "manali-adventure-camp",
    pendingApplicants: [],
    participants: [],
    waitingList: [],
  },
  "new-year-in-manali": {
    tripId: "new-year-in-manali",
    pendingApplicants: [],
    participants: [
      { id: "you", name: "You", initials: "RA", trustScore: "9.1", role: "organizer", joinedDate: "Hosted" },
      { id: "m1", name: "Meera Shah", initials: "MS", trustScore: "8.9", role: "member", joinedDate: "Joined Nov 1" },
    ],
    waitingList: [],
  },
};

export function getHostManagementRecord(tripId: string): HostManagementRecord {
  return (
    RECORDS[tripId] ?? {
      tripId,
      pendingApplicants: [],
      participants: [
        { id: "you", name: "You", initials: "RA", trustScore: "9.1", role: "organizer", joinedDate: "Hosted" },
      ],
      waitingList: [],
    }
  );
}

export function getHostedTrip(tripId: string): HostedTrip | undefined {
  return hostedTrips.find((t) => t.tripId === tripId);
}

export function getAllHostedTripIds(): string[] {
  return hostedTrips.map((t) => t.tripId);
}
