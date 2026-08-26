"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";

/**
 * "GoTogether Access Denied Page" — shown in place of a restricted page
 * (e.g. Host Trip Management viewed by a non-host, or any signed-in-only
 * area viewed while logged out). Distinct from 404: this implies the page
 * exists but the current viewer lacks permission — copy covers both the
 * "not the host" and "not signed in" cases at once, per the visual spec.
 * A client component (not the shared static ErrorPageLayout) because
 * "Sign In" opens the Auth modal rather than navigating to a page.
 */
export function AccessDeniedClient() {
  const { requireAuth } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-border-soft">
        <div className="mx-auto flex h-[72px] max-w-(--content-max-width) items-center px-8">
          <Link href="/" aria-label="GoTogether home">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div
          aria-hidden="true"
          className="mb-5 flex h-18 w-18 items-center justify-center rounded-2xl bg-[oklch(93%_0.05_255)] text-3xl"
          style={{ width: 72, height: 72 }}
        >
          🔒
        </div>
        <h1 className="mb-2.5 max-w-md font-display text-xl font-bold">
          You don&apos;t have access to this page
        </h1>
        <p className="mb-7 max-w-sm text-[13.5px] leading-relaxed text-text-tertiary">
          This area is only available to the trip&apos;s host, or you may
          need to sign in first.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-full border border-border-input bg-surface px-6 py-3 text-sm font-semibold text-text-secondary hover:bg-surface-hover"
          >
            Go to Homepage
          </Link>
          <button
            onClick={() => requireAuth("continue", () => {})}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Sign In
          </button>
        </div>
      </main>
    </div>
  );
}
