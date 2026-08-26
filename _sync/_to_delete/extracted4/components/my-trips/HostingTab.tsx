"use client";

import { useState } from "react";
import Link from "next/link";
import { MyTripSummary } from "./MyTripSummary";
import { PastToggle, EmptyLine } from "./GoingTab";
import type { HostedTrip } from "@/lib/my-trips-data";
import type { PillTone } from "./StatusPill";

const STATUS_LABEL: Record<HostedTrip["status"], string> = {
  draft: "Draft",
  live: "Live",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<HostedTrip["status"], PillTone> = {
  draft: "draft",
  live: "confirmed",
  "in-progress": "progress",
  completed: "completed",
  cancelled: "cancelled",
};

/**
 * Hosting tab — full Organizer lifecycle including Draft, per the
 * blueprint's Created/Hosted spec: Draft trips surfaced first among
 * live/upcoming ones (14-day expiry makes them the most time-sensitive
 * Hosting item after an actual In-Progress trip), live fill/request
 * counts, "Continue Editing" vs "Manage Trip" CTA by state.
 */
export function HostingTab({ trips }: { trips: HostedTrip[] }) {
  const [pastExpanded, setPastExpanded] = useState(false);

  const live = trips.filter((t) => t.status === "draft" || t.status === "live" || t.status === "in-progress");
  const past = trips.filter((t) => t.status === "completed" || t.status === "cancelled");

  // Draft-first ordering per the blueprint's explicit priority rule.
  const sortedLive = [...live].sort((a, b) => {
    const rank = (s: HostedTrip["status"]) => (s === "draft" ? 0 : s === "in-progress" ? 1 : 2);
    return rank(a.status) - rank(b.status);
  });

  if (trips.length === 0) {
    return (
      <div role="tabpanel" id="panel-hosting" aria-labelledby="tab-hosting">
        <h2 className="sr-only">Trips you&apos;re hosting</h2>
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-tint px-6 py-12 text-center">
          <p className="text-[13.5px] text-text-tertiary">You haven&apos;t created a trip yet.</p>
          <Link href="/create-trip" className="rounded-full bg-accent px-6 py-3 text-[13px] font-semibold text-white hover:opacity-90">
            Create Trip
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" id="panel-hosting" aria-labelledby="tab-hosting">
      <h2 className="sr-only">Trips you&apos;re hosting</h2>

      {sortedLive.length === 0 ? (
        <EmptyLine text="No live trips right now." ctaLabel="Create Trip" ctaHref="/create-trip" />
      ) : (
        <div className="mb-7 grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
          {sortedLive.map((t) => (
            <HostedCard key={t.tripId} trip={t} />
          ))}
        </div>
      )}

      <PastToggle expanded={pastExpanded} onToggle={() => setPastExpanded((v) => !v)} count={past.length} />
      {pastExpanded && (
        <div className="mt-4">
          {past.length === 0 ? (
            <p className="text-[12.5px] text-text-muted">No completed trips yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
              {past.map((t) => (
                <HostedCard key={t.tripId} trip={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HostedCard({ trip }: { trip: HostedTrip }) {
  const meta =
    trip.status === "draft"
      ? "Not published yet"
      : trip.dates && trip.membersMax
        ? `${trip.dates} · ${trip.membersJoined} of ${trip.membersMax} joined`
        : trip.dates ?? "";

  const secondaryParts: string[] = [];
  if (trip.status === "draft" && trip.draftExpiresInDays !== undefined) {
    secondaryParts.push(`Expires in ${trip.draftExpiresInDays} day${trip.draftExpiresInDays === 1 ? "" : "s"}`);
  }
  if (trip.pendingRequests) {
    secondaryParts.push(`${trip.pendingRequests} request${trip.pendingRequests === 1 ? "" : "s"} pending`);
  }
  if (trip.waitingListCount) {
    secondaryParts.push(`+${trip.waitingListCount} waiting`);
  }
  if (trip.status === "cancelled" && trip.cancelledReason) {
    secondaryParts.push(trip.cancelledReason);
  }

  // "Continue Editing" (Draft) / "Manage Trip" (Published and beyond, live
  // lifecycle only) / "View Trip" (Completed/Cancelled — read-only history,
  // per the blueprint's Cancelled/Unavailable and Completed/Past specs:
  // "View Trip (read-only)" is the only remaining action there).
  const primaryLabel =
    trip.status === "draft"
      ? "Continue Editing"
      : trip.status === "completed" || trip.status === "cancelled"
        ? "View Trip"
        : "Manage Trip";
  // Draft/live/in-progress route into Host Trip Management; a Completed
  // or Cancelled trip's "View Trip" goes to the read-only public page.
  const primaryHref =
    trip.status === "completed" || trip.status === "cancelled"
      ? `/trips/${trip.tripId}`
      : `/host/trips/${trip.tripId}/manage`;

  return (
    <MyTripSummary
      tripId={trip.tripId}
      imgSrc={trip.imgSrc}
      title={trip.title}
      meta={meta}
      pill={{ tone: STATUS_TONE[trip.status], label: STATUS_LABEL[trip.status] }}
      secondaryInfo={secondaryParts.length > 0 ? secondaryParts.join(" · ") : undefined}
      primaryAction={{ label: primaryLabel, href: primaryHref }}
    />
  );
}
