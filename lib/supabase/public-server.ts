import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Plain (no cookies, no session) server-side Supabase client for reading
 * genuinely public data — currently just the admin-managed destinations
 * catalog — from contexts that run without a request, like
 * generateStaticParams/generateMetadata at build time, where
 * createServerSupabaseClient's cookies() call would throw. Never use this
 * for anything RLS-gated to a signed-in user.
 */
export function createPublicServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local."
    );
  }

  return createSupabaseJsClient<Database>(url, anonKey);
}
