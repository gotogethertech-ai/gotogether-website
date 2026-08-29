import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Google Sign-In redirects here with a ?code= param after the user
 * approves consent on Google's side (signInWithOAuth in auth-context.tsx
 * sets redirectTo to this route). Exchanging the code sets the session
 * cookie server-side, then we bounce back to wherever the user started
 * (or "/" if that's unknown) — the client-side auth listener in
 * auth-context.tsx picks up the new session and resumes whatever
 * protected action triggered login, same "return_to" behavior as the
 * phone-OTP path.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Google itself can redirect back with an error instead of a code (e.g.
  // the user cancelled consent, or — the likely cause of the "picks an
  // account, comes back, still logged out" loop — this route's own URL
  // isn't in the Supabase project's Redirect URLs allowlist, which makes
  // Supabase itself bounce back here with an error before ever handing us
  // a code). Surface whichever failure actually happened instead of
  // silently swallowing it.
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent("Missing authorization code from Google.")}`);
}
