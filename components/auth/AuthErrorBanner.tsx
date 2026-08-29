"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

/**
 * Surfaces the real reason Google Sign-In failed, instead of the previous
 * silent-swallow behavior: app/auth/callback/route.ts used to redirect to
 * "/?auth_error=1" on any failure with nothing anywhere reading that param
 * — the user just landed back on the normal logged-out homepage with no
 * indication anything went wrong, so clicking "Sign in" again just
 * repeated the same failure forever (reported as "asks again for the
 * email, like a loop"). The callback route now passes the actual
 * Supabase/Google error message in ?auth_error=, and this banner shows it.
 *
 * The most likely real cause of that loop in production: this app's
 * https://<domain>/auth/callback URL isn't in the Supabase project's
 * Auth → URL Configuration → Redirect URLs allowlist, so Supabase itself
 * rejects the OAuth callback before a session is ever created.
 *
 * useSearchParams() requires a Suspense boundary in a page that's
 * otherwise statically rendered (same issue fixed for /messages) — wrapped
 * here so every call site (just app/layout.tsx) doesn't need to remember
 * to add one.
 */
export function AuthErrorBanner() {
  return (
    <Suspense fallback={null}>
      <AuthErrorBannerInner />
    </Suspense>
  );
}

function AuthErrorBannerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  const error = searchParams.get("auth_error");
  if (!error || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth_error");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="sticky top-0 z-[90] flex items-center justify-center gap-3 bg-[oklch(93%_0.05_25)] px-4 py-2.5 text-center text-[12.5px] font-medium text-[oklch(35%_0.13_25)]">
      <span>Sign-in didn&apos;t go through: {error}</span>
      <button
        aria-label="Dismiss"
        onClick={dismiss}
        className="flex-none text-[15px] leading-none text-[oklch(35%_0.13_25/0.6)] hover:text-[oklch(35%_0.13_25)]"
      >
        ×
      </button>
    </div>
  );
}
