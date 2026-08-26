"use client";

import { useTripRelationship } from "@/lib/trip-relationship";
import { TripActionPanel, type ViewerRelationship } from "./TripActionPanel";
import type { TripDetail } from "@/lib/trip-details";

/** Thin client wrapper so the server-rendered Trip Details page can pass a
 * real, mock-derived relationship into the sticky action panel without
 * itself becoming a client component. */
export function TripActionPanelConnected({ trip }: { trip: TripDetail }) {
  const relationship: ViewerRelationship = useTripRelationship(trip.id);
  return <TripActionPanel trip={trip} relationship={relationship} />;
}
