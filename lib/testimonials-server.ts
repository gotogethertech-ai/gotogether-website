import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { Database } from "@/lib/supabase/database.types";

export type TestimonialRow = Database["public"]["Tables"]["testimonials"]["Row"];

/**
 * Published testimonials for the public homepage — written and curated in
 * the admin panel (app/admin/testimonials), consent-gated there before
 * publish. RLS (testimonials_select_published_or_staff) already restricts
 * a non-staff caller to is_published = true rows regardless of query, but
 * the explicit filter here keeps intent obvious rather than relying on
 * RLS silently doing the work. Server-side counterpart to the admin
 * panel's getTestimonials() in lib/admin/data.ts (that one uses the
 * cookie-based browser client and is called from Client Components; this
 * one uses the cookie-free public client for the homepage's Server
 * Component — same createPublicServerClient() pattern as
 * lib/destinations-server.ts).
 */
export async function getPublishedTestimonials(): Promise<TestimonialRow[]> {
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("testimonials")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(9);
  return data ?? [];
}
