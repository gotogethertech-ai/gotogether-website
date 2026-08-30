import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Site-wide settings an admin can edit without a code deploy (migration
 * 058) — currently just the WhatsApp support number, read server-side in
 * the root layout so the floating "Need help?" button
 * (WhatsAppSupportButton) renders with the right number on first paint
 * instead of flashing in after a client fetch.
 *
 * Deliberately does NOT use lib/supabase/server.ts's cookie-based client:
 * that client calls next/headers' cookies(), which forces the entire
 * route (and, called from the root layout, EVERY route in the app) into
 * dynamic (server-rendered per-request) mode — confirmed by a before/after
 * build comparison where ~30 previously-static pages all flipped from ○
 * to ƒ. This setting has nothing to do with the viewer's session (public
 * RLS policy, qual: true — same for every visitor), so it doesn't need a
 * per-request client at all. A plain anon-key client plus
 * unstable_cache's time-based revalidation keeps every other page
 * statically prerenderable while still picking up an admin's change
 * within a minute.
 */
const getCachedWhatsAppNumber = unstable_cache(
  async (): Promise<string | null> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;

    const supabase = createSupabaseClient<Database>(url, anonKey);
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "whatsapp_support_number")
      .maybeSingle();
    return data?.value ?? null;
  },
  ["site-setting-whatsapp-support-number"],
  { revalidate: 60 }
);

export async function getSiteSetting(key: string): Promise<string | null> {
  // Only one caller/key exists today (the WhatsApp number) — this stays a
  // generic-looking function so a second setting can be added later
  // without a signature change, but for now it just delegates to the one
  // cached reader.
  if (key === "whatsapp_support_number") return getCachedWhatsAppNumber();
  return null;
}
