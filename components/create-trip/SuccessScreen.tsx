"use client";

import { useState } from "react";
import Link from "next/link";
import { useCreateTrip } from "@/lib/create-trip-context";

/**
 * Post-publish success screen, per the blueprint's Publishing/Submission
 * States: "success screen... with View Trip / Share Trip / Add More
 * Details actions" — not an immediate hard redirect.
 *
 * The trip is now a real row in public.trips (see lib/real-trips.ts), but
 * there's no real Trip Details page wired to Supabase yet — app/trips/[id]
 * still renders mock trips only. Rather than link to a route that would
 * 404 for a real trip id, View Trip / Add More Details route to My Trips
 * → Hosting, where the real trip genuinely shows up (getMyHostedTrips
 * reads it back from the database). Swap these to /trips/{tripId} once
 * Trip Details reads real data.
 */
export function SuccessScreen() {
  const { fields, publishedTripId } = useCreateTrip();
  const [copied, setCopied] = useState(false);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.clipboard && publishedTripId) {
      navigator.clipboard.writeText(`${window.location.origin}/my-trips?tab=hosting`).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-8 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-trust-bg text-3xl" aria-hidden="true">
        ✓
      </div>
      <h1 className="mb-2 font-display text-2xl font-bold">Your trip is live!</h1>
      <p className="mb-8 max-w-[360px] text-[13.5px] leading-relaxed text-text-tertiary">
        {fields.title || "Your trip"} is now published and discoverable by other travellers.
      </p>

      <div className="flex w-full max-w-[320px] flex-col gap-3">
        <Link
          href="/my-trips?tab=hosting"
          className="rounded-full bg-accent px-6 py-3.5 text-sm font-bold text-white hover:opacity-90"
        >
          View Trip
        </Link>
        <button
          onClick={handleShare}
          className="rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-white hover:opacity-90"
        >
          {copied ? "Link copied!" : "Share Trip"}
        </button>
        <Link
          href="/my-trips?tab=hosting"
          className="rounded-full border border-border-input px-6 py-3.5 text-sm font-semibold text-text-secondary hover:bg-surface-hover"
        >
          Add More Details
        </Link>
      </div>
    </div>
  );
}
