"use client";

import { useState } from "react";
import Link from "next/link";
import { MyTripSummary } from "./MyTripSummary";
import { StatusPill } from "./StatusPill";
import type { UpcomingTrip, PastGoingTrip, RecentRequest } from "@/lib/my-trips-data";

/**
 * Going tab — Upcoming trips (full, uncapped, soonest-first) + a collapsed
 * Past sub-filter + Recent Requests (Rejected/Expired) sub-section, per
 * the blueprint's Joined/Upcoming and Completed/Past specs.
 */
export function GoingTab({
  upcoming,
  past,
  recentRequests,
}: {
  upcoming: UpcomingTrip[];
  past: PastGoingTrip[];
  recentRequests: RecentRequest[];
}) {
  const [pastExpanded, setPastExpanded] = useState(false);

  return (
    <div role="tabpanel" id="panel-going" aria-labelledby="tab-going">
      <h2 className="sr-only">Trips you&apos;re going on</h2>
      <div className="mb-4 text-base font-bold font-display">Upcoming</div>

      {upcoming.length === 0 ? (
        <EmptyLine text="No upcoming trips." ctaLabel="Explore Trips" ctaHref="/explore" />
      ) : (
        <div className="mb-7 grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
          {upcoming.map((t) => (
            <MyTripSummary
              key={t.tripId}
              tripId={t.tripId}
              imgSrc={t.imgSrc}
              title={t.title}
              meta={`${t.dates} · ${t.countdown}`}
              pill={{ tone: "confirmed", label: t.status }}
              primaryAction={{ label: "View Trip", href: `/trips/${t.tripId}` }}
            />
          ))}
        </div>
      )}

      {recentRequests.length > 0 && (
        <div className="mb-7">
          <div className="mb-3 text-[13px] font-bold text-text-secondary">Recent requests</div>
          <div className="flex flex-col gap-2">
            {recentRequests.map((r) => (
              <div
                key={r.tripId}
                className="flex flex-col gap-2 rounded-xl border border-border-divider p-3 min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between"
              >
                <div>
                  <Link href={`/trips/${r.tripId}`} className="text-[12.5px] font-bold text-text-primary hover:text-primary">
                    {r.title}
                  </Link>
                  <div className="text-[10.5px] text-text-muted">{r.daysAgo} days ago</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone="rejected">
                    {r.status === "rejected" ? "Not accepted" : "No response received"}
                  </StatusPill>
                  {r.cooldownElapsed ? (
                    <Link
                      href={`/trips/${r.tripId}`}
                      className="rounded-full bg-primary px-3 py-1.5 text-[10.5px] font-semibold text-white"
                    >
                      Re-request
                    </Link>
                  ) : (
                    <span className="text-[10px] text-text-muted">Cooldown active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
                <MyTripSummary
                  key={t.tripId}
                  tripId={t.tripId}
                  imgSrc={t.imgSrc}
                  title={t.title}
                  meta={t.dates}
                  pill={{
                    tone: t.status === "Completed" ? "completed" : "cancelled",
                    label: t.status,
                  }}
                  secondaryInfo={t.status === "Cancelled" ? t.reason : undefined}
                  primaryAction={
                    t.status === "Completed" && t.reviewWindowOpen
                      ? { label: "Leave Review", href: `/trips/${t.tripId}/review` }
                      : { label: "View Trip", href: `/trips/${t.tripId}` }
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PastToggle({
  expanded,
  onToggle,
  count,
}: {
  expanded: boolean;
  onToggle: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex min-h-[44px] items-center gap-2 text-[12.5px] font-medium text-text-muted hover:text-text-secondary"
    >
      <span className={`inline-block transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true">
        ▾
      </span>
      Past trips {count > 0 ? `(${count})` : ""}
    </button>
  );
}

export function EmptyLine({
  text,
  ctaLabel,
  ctaHref,
}: {
  text: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center gap-3 rounded-xl bg-surface-tint px-4 py-3.5 text-[12.5px] text-text-tertiary">
      {text}
      <Link href={ctaHref} className="font-semibold text-primary">
        {ctaLabel}
      </Link>
    </div>
  );
}
