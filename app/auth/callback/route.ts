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

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
