"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getRealTripRelationship, type ViewerRelationship } from "@/lib/real-trip-details";

export type { ViewerRelationship };

/**
 * Real viewer-relationship lookup — replaces the previous mock-array scan
 * (hostedTrips/activeTrips/etc. from lib/my-trips-data.ts) with a live
 * Supabase read via getRealTripRelationship. Per the Participant Trip
 * Experience Blueprint's Concept A: same Trip Details page, this hook is
 * what lets it adapt to host / member / pending / visitor.
 */
export function useTripRelationship(tripId: string): ViewerRelationship {
  const { user, isLoggedIn } = useAuth();
  const [relationship, setRelationship] = useState<ViewerRelationship>("none");

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    let cancelled = false;
    getRealTripRelationship(tripId, user.id).then((rel) => {
      if (!cancelled) setRelationship(rel);
    });
    return () => {
      cancelled = true;
    };
  }, [tripId, user, isLoggedIn]);

  // Derived directly at render time rather than mirrored via a second
  // effect-driven setState (react-hooks/set-state-in-effect) — logged-out
  // always reads "none" regardless of whatever the last fetch resolved to.
  return isLoggedIn ? relationship : "none";
}
