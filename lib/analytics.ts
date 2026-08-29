import posthog from "posthog-js";

/**
 * Central place for GoTogether's PostHog click/interaction events, so every
 * call site uses the same event name and property shape instead of
 * inventing its own ad hoc string. Add a new entry here (rather than
 * calling posthog.capture directly at the call site) whenever a new
 * trackable action is added, so the event catalog stays discoverable in
 * one file instead of scattered across components.
 *
 * Default event set (Aug 2026) — the actions that matter most for a
 * trip-planning marketplace: whether people find a trip, join it, or
 * organize their own, and where in the funnel they drop off.
 */
export const analytics = {
  /** Explore page: a destination/trip card was clicked through to detail. */
  tripViewed(tripId: string, source: "explore" | "home" | "saved" | "company" | "other") {
    posthog.capture("trip_viewed", { trip_id: tripId, source });
  },
  /** "Join Trip" / "Request to Join" button pressed. */
  tripJoinRequested(tripId: string) {
    posthog.capture("trip_join_requested", { trip_id: tripId });
  },
  /** Trip creation flow completed (final "Publish"/"Create" step). */
  tripCreated(tripId: string) {
    posthog.capture("trip_created", { trip_id: tripId });
  },
  /** Bookmark/save toggle on a trip card. */
  tripSaved(tripId: string, saved: boolean) {
    posthog.capture("trip_saved", { trip_id: tripId, saved });
  },
  /** A filter was applied on the Explore page (destination, dates, budget, etc). */
  exploreFilterApplied(filter: string, value: string) {
    posthog.capture("explore_filter_applied", { filter, value });
  },
  /** Explore search box submitted. */
  exploreSearched(query: string) {
    posthog.capture("explore_searched", { query });
  },
  /** A user or company profile was opened. */
  profileViewed(profileId: string, kind: "user" | "company") {
    posthog.capture("profile_viewed", { profile_id: profileId, kind });
  },
  /** Review flow: user submitted a review for a completed trip. */
  reviewSubmitted(tripId: string) {
    posthog.capture("review_submitted", { trip_id: tripId });
  },
  /** Signup/login completed. */
  authCompleted(mode: "signup" | "login") {
    posthog.capture("auth_completed", { mode });
  },
} as const;

/** Ties subsequent events to a real user id instead of an anonymous
 * device id, and attaches basic person properties. Call once after auth
 * resolves (see lib/auth-context.tsx) — safe to call repeatedly, PostHog
 * no-ops if already identified as this id. */
export function identifyUser(userId: string, props?: { name?: string; email?: string }) {
  posthog.identify(userId, props);
}

/** Call on sign-out so the next session isn't attributed to the previous
 * user. */
export function resetAnalyticsIdentity() {
  posthog.reset();
}
