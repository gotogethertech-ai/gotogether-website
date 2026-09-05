import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Google Sign-In redirects here with a ?code= param after the user
 * approves consent on Google's side (signInWithOAuth in auth-context.tsx
 * sets redirectTo to this route). Exchanging the code sets the session
 * cookie server-side, then we bounce back to wherever the user started
 * (or "/" if that's unknown) — the client-side auth listener in
 * auth-context.tsx picks up the new session and resumes whatever
 * protected action triggered login.
 *
 * Cookie propagation quirk (Next.js 15/16 + @supabase/ssr): cookies set
 * via `cookies().set()` in a Route Handler are NOT reliably attached to
 * the response when it's a `NextResponse.redirect(...)` — the browser
 * ends up at the destination page without the sb-*-auth-token cookies,
 * so `getSession()` returns null, AuthProvider decides the visitor is
 * logged out, and requireAuth kicks off another Google sign-in. That was
 * the real cause of the "logged in → automatically logged out → login
 * window again" loop we saw in production auth logs. Fix: build the
 * redirect response first, then set cookies on BOTH the request-scoped
 * cookieStore (so `getAll()` reads the fresh verifier for the next step
 * inside this same request) AND on `response.cookies` (which is what
 * actually gets sent to the browser as Set-Cookie headers).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Google itself can redirect back with an error instead of a code (e.g.
  // the user cancelled consent, or this route's own URL isn't in the
  // Supabase project's Redirect URLs allowlist). Surface whichever
  // failure actually happened instead of silently swallowing it.
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent("Missing authorization code from Google.")}`
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local."
    );
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`);
  }

  return response;
}
