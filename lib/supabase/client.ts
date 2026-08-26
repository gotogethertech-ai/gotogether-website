"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Browser-side Supabase client, singleton per module load. Uses
 * @supabase/ssr's cookie-based client (not the plain @supabase/supabase-js
 * client) so the session cookie is readable by server components/route
 * handlers later (e.g. the OAuth callback route), not just localStorage.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local."
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}
