"use client";

import { useAuth } from "@/lib/auth-context";
import { activeTrips, upcomingTrips, pastGoingTrips, pendingRequests, hostedTrips } from "@/lib/my-trips-data";
import type { ViewerRelationship } from "@/components/trip/TripActionPanel";

/**
 * Derives the logged-in mock user's relationship to a given trip from the
 * existing My Trips mock data — there's no backend to ask, so "am I going/
 * hosting/pending on this trip" is computed from the same arrays My Trips
 * already renders, keeping one source of truth instead of a second copy
 * that could drift. Per the Participant Trip Experience Blueprint's
 * Concept A: same Trip Details page, this hook is what lets it adapt.
 */
export function useTripRelationship(tripId: string): ViewerRelationship {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return "none";

  if (hostedTrips.some((t) => t.tripId === tripId && t.status !== "cancelled")) {
    return "host";
  }
  if (activeTrips.some((t) => t.tripId === tripId && t.role === "going")) {
    return "member";
  }
  if (upcomingTrips.some((t) => t.tripId === tripId)) {
    return "member";
  }
  if (pastGoingTrips.some((t) => t.tripId === tripId && t.status === "Completed")) {
    return "member";
  }
  if (pendingRequests.some((r) => r.tripId === tripId)) {
    return "pending";
  }
  return "none";
}
