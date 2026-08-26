import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TripDetail } from "@/lib/trip-details";
import { fetchTripDetail } from "@/lib/real-trip-details-shared";

/**
 * Server Component entry point for real trip reads (app/trips/[id]/page.tsx).
 * Kept in its own file, separate from lib/real-trip-details.ts, so that
 * lib/supabase/server's next/headers import never reaches a Client
 * Component's bundle — see lib/real-trip-details-shared.ts for why.
 */
export async function getRealTripDetailServer(id: string): Promise<TripDetail | null> {
  return fetchTripDetail(await createServerSupabaseClient(), id);
}
