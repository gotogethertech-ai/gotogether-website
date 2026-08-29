import posthog from "posthog-js";

/**
 * PostHog client init — Next.js automatically runs any
 * instrumentation-client.ts at the project root before the app hydrates
 * (App Router convention, no manual <script> needed).
 *
 * NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST come from the
 * PostHog project settings (Project API key + region host, e.g.
 * https://us.i.posthog.com or https://eu.i.posthog.com). Set them in
 * Vercel's project Environment Variables the same way
 * SUPABASE_SERVICE_ROLE_KEY was added — see that setup for the steps.
 *
 * If the key isn't set (e.g. local dev without .env.local, or before the
 * account is created), init() no-ops rather than throwing — every
 * posthog.capture() call elsewhere in the app is then just a silent
 * no-op instead of breaking the page.
 */
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    // We capture pageviews manually (see components/analytics/PostHogPageView.tsx)
    // since the App Router doesn't do full page loads on navigation, which
    // is what PostHog's automatic pageview capture relies on.
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
}
