"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Root error boundary — Next's file-convention error.tsx, must be a
 * Client Component. Catches any unhandled exception in a Server Component
 * render (e.g. a Supabase query throwing) that would otherwise fall
 * through to Next's generic, unbranded error screen. Structurally mirrors
 * ErrorPageLayout (not reused directly since that component isn't a
 * client boundary and this needs the reset() retry action), so a real
 * error still looks like part of the product, not a framework crash page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
          className="mb-5 flex h-18 w-18 items-center justify-center rounded-2xl bg-[oklch(95%_0.05_30)] text-3xl"
          style={{ width: 72, height: 72 }}
        >
          ⚠️
        </div>
        <h1 className="mb-2.5 max-w-md font-display text-xl font-bold">
          Something went wrong
        </h1>
        <p className="mb-7 max-w-sm text-[13.5px] leading-relaxed text-text-tertiary">
          An unexpected error occurred loading this page. It&apos;s not you — try again, or head
          back to the homepage.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-full border border-border-input bg-surface px-6 py-3 text-sm font-semibold text-text-secondary hover:bg-surface-hover"
          >
            Go to Homepage
          </Link>
          <button
            onClick={reset}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </main>
    </div>
  );
}
