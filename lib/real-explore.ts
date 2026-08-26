import { createClient } from "@/lib/supabase/client";
import type { ExploreTrip } from "@/lib/mock-data";
import { fetchLiveTrips } from "@/lib/real-explore-shared";

/**
 * Client-side real Explore results, replacing lib/mock-data.ts's hardcoded
 * exploreTrips array — this app is a real product now, not a design
 * showcase (see the Aug 23 instruction: every trip card everywhere must be
 * a real trip, no hardcoded sample data). Only trips visible to the public
 * (trips_select_public RLS: not draft/hidden) are returned, matching what
 * a signed-out visitor would legitimately see.
 */
export async function getRealExploreTrips(): Promise<ExploreTrip[]> {
  return fetchLiveTrips(createClient());
}
