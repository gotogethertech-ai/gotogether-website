"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

/** Fires a $pageview event on every route change. App Router navigation is
 * client-side (no full page load), so PostHog's automatic pageview capture
 * (which listens for page loads) never fires on its own — this replaces
 * it. Mounted once in RootLayout inside a <Suspense> boundary, since
 * useSearchParams() opts the tree into client-side rendering. */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams.toString();
    posthog.capture("$pageview", {
      $current_url: query ? `${pathname}?${query}` : pathname,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}
