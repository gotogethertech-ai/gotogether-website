import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { Database } from "@/lib/supabase/database.types";

export type DestinationRow = Database["public"]["Tables"]["destinations"]["Row"];

/**
 * Server-side reads of the real, admin-managed public.destinations table —
 * replaces lib/destinations-catalog.ts's hardcoded catalog for the public
 * Destinations Discovery + Details pages (see the admin Destinations
 * screen at /admin/destinations for how these rows are managed). Only
 * active destinations are ever shown to visitors, matching every other
 * destination picker on the site.
 */
export async function getActiveDestinations(): Promise<DestinationRow[]> {
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("destinations")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getDestinationBySlug(slug: string): Promise<DestinationRow | null> {
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("destinations")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data ?? null;
}

export function getRelatedDestinations(all: DestinationRow[], current: DestinationRow, max = 4): DestinationRow[] {
  return all.filter((d) => d.category === current.category && d.slug !== current.slug).slice(0, max);
}
