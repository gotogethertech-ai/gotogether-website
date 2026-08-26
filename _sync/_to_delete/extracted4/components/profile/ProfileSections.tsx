"use client";

import { useState } from "react";
import Link from "next/link";
import { ScrollRow } from "@/components/ui/ScrollRow";
import type { ProfileData, Review, TravelHistoryEntry } from "@/lib/profiles-data";

/** Header — photo/initials, name, city + member since, bio (clamped with
 * expand), verification badges. Shared between Public Profile and My
 * Profile; `actions` slot lets each page supply its own top-right controls
 * (Report/Share for visitors, Edit Profile for the owner). */
export function ProfileHeader({
  profile,
  actions,
}: {
  profile: ProfileData;
  actions?: React.ReactNode;
}) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const bioNeedsClamp = profile.bio.length > 140;

  return (
    <div className="flex flex-col gap-4 min-[600px]:flex-row min-[600px]:items-start">
      <div
        aria-hidden="true"
        className="flex h-24 w-24 flex-none items-center justify-center rounded-full bg-surface-avatar text-xl font-bold text-[oklch(40%_0.1_255)]"
        style={{ width: 96, height: 96 }}
      >
        {profile.initials}
      </div>
      <div className="flex-1">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
          <h1 className="font-display text-2xl font-bold">{profile.name}</h1>
          {actions}
        </div>
        <div className="mb-2 text-[12px] text-text-muted">
          {profile.city} · Member since {profile.memberSince}
        </div>
        <p className={`mb-2 max-w-[520px] text-[12.5px] leading-relaxed text-text-secondary ${!bioExpanded && bioNeedsClamp ? "line-clamp-3" : ""}`}>
          {profile.bio}
        </p>
        {bioNeedsClamp && (
          <button
            onClick={() => setBioExpanded((v) => !v)}
            className="mb-2 text-[11.5px] font-semibold text-primary hover:underline"
          >
            {bioExpanded ? "Show less" : "Read more"}
          </button>
        )}
        {profile.verifications.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.verifications.map((v) => (
              <span
                key={v.label}
                title={v.description}
                tabIndex={0}
                className="inline-flex items-center gap-1 rounded-md bg-[oklch(93%_0.03_185)] px-2 py-0.5 text-[10px] font-bold text-[oklch(35%_0.08_185)]"
              >
                ✓ {v.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Always-visible glance summary — score+basis, trips completed, as
 * organizer — visually distinct from the fuller StatGrid below it. */
export function TrustStrip({ profile }: { profile: ProfileData }) {
  if (profile.tripsCompleted === 0 && profile.reviewCount === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-tint px-5 py-4 text-[12.5px] text-text-tertiary">
        New to GoTogether — building their travel history.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-surface-tint px-5 py-4">
      <div>
        <div className="text-lg font-bold text-trust-fg">⭐ {profile.trustScore.toFixed(1)}</div>
        <div className="text-[10px] text-text-muted">
          Trust Score · {profile.reviewCount > 0 ? `from ${profile.reviewCount} reviews` : "no reviews yet"}
        </div>
      </div>
      <div className="h-8 w-px bg-border-divider" aria-hidden="true" />
      <div className="text-[12.5px] font-semibold text-text-secondary">
        {profile.tripsCompleted} trip{profile.tripsCompleted === 1 ? "" : "s"} completed
      </div>
      <div className="h-8 w-px bg-border-divider" aria-hidden="true" />
      <div className="text-[12.5px] font-semibold text-text-secondary">
        {profile.stats.tripsOrganized} as organizer
      </div>
    </div>
  );
}

/** The 7 documented stat fields, no more — never a fabricated category.
 * Response Rate / Avg. Reply Time conditionally hide when the person has
 * never organized a trip, per the Personal Area blueprint's self-critique. */
export function StatGrid({ profile, compact = false }: { profile: ProfileData; compact?: boolean }) {
  const { stats } = profile;
  const hasOrganized = stats.tripsOrganized > 0;
  const items: { value: string | number; label: string }[] = [
    { value: stats.tripsJoined, label: "Trips Joined" },
    { value: stats.tripsCompleted, label: "Trips Completed" },
    { value: stats.tripsOrganized, label: "Trips Organized" },
    { value: stats.citiesExplored, label: "Cities Explored" },
  ];
  if (!compact) {
    if (hasOrganized && stats.responseRate !== null) {
      items.push({ value: `${stats.responseRate}%`, label: "Join-Request Response Rate" });
    }
    if (hasOrganized && stats.avgReplyTime) {
      items.push({ value: stats.avgReplyTime, label: "Avg. Reply Time" });
    }
    items.push({ value: stats.memberSince, label: "Member Since" });
  }
  return (
    <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-[oklch(98%_0.004_255)] px-3.5 py-3.5 text-center">
          <div className="text-lg font-bold">{item.value}</div>
          <div className="text-[10.5px] text-text-muted">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Up to 4 badges + expand — omitted entirely (not empty) when there are
 * none, per the "no locked/greyed badges" rule. */
export function BadgeRow({ profile }: { profile: ProfileData }) {
  const [expanded, setExpanded] = useState(false);
  if (profile.badges.length === 0) return null;
  const visible = expanded ? profile.badges : profile.badges.slice(0, 4);
  const hidden = profile.badges.length - visible.length;

  return (
    <div>
      <h2 className="mb-3 font-display text-base font-bold">Badges</h2>
      <ScrollRow ariaLabel="Badges">
        {visible.map((b) => (
          <div
            key={b.key}
            title={b.description}
            tabIndex={0}
            className="flex w-21 flex-none flex-col items-center gap-1.5 rounded-2xl bg-surface-tint p-2.5 text-center"
            style={{ width: 84 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-avatar text-2xl" style={{ width: 56, height: 56 }}>
              {b.icon}
            </div>
            <span className="text-[10px] font-semibold leading-tight">{b.label}</span>
          </div>
        ))}
        {hidden > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex w-21 flex-none flex-col items-center justify-center gap-1 rounded-2xl bg-surface-tint text-[11px] font-semibold text-primary"
            style={{ width: 84, height: 56 + 12 + 16 }}
          >
            +{hidden} more
          </button>
        )}
      </ScrollRow>
    </div>
  );
}

/** 6 evenly-weighted sub-scores — always visible, never gated behind a
 * click, per the blueprint's "full breakdown public by default" rule. */
export function TrustScoreBreakdown({ profile }: { profile: ProfileData }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-base font-bold">Trust Score breakdown</h2>
      <div className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2">
        {profile.trustBreakdown.map((s) => (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="font-semibold text-text-secondary">{s.label}</span>
              <span className="font-bold">{s.score.toFixed(1)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tint">
              <div
                className="h-full rounded-full bg-trust-fg"
                style={{ width: `${(s.score / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE_SIZE = 5;

/** Reviews — 5 most recent, batch "Show more", full unfiltered text, calm
 * empty state. */
export function ReviewsSection({ profile }: { profile: ProfileData }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = profile.reviews.slice(0, visibleCount);
  const hasMore = visibleCount < profile.reviews.length;

  return (
    <div>
      <h2 className="mb-3 font-display text-base font-bold">Reviews ({profile.reviewCount})</h2>
      {profile.reviews.length === 0 ? (
        <p className="text-[12.5px] text-text-tertiary">
          No reviews yet — {profile.name.split(" ")[0]} hasn&apos;t completed a trip on GoTogether yet.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {visible.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
          {hasMore && <ShowMoreButton onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} />}
        </>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2.5">
        <Link
          href={`/profile/${encodeURIComponent(review.reviewerName)}`}
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface-avatar text-[10px] font-semibold text-[oklch(40%_0.1_255)]"
          style={{ width: 28, height: 28 }}
        >
          {review.reviewerInitials}
        </Link>
        <div className="text-[12px]">
          <Link href={`/profile/${encodeURIComponent(review.reviewerName)}`} className="font-semibold hover:text-primary">
            {review.reviewerName}
          </Link>
          <span className="text-text-muted"> · {review.tripName} · {review.date}</span>
        </div>
      </div>
      <p className="mb-2 text-[12.5px] leading-relaxed text-text-secondary">{review.text}</p>
      {review.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-surface-tint px-2 py-0.5 text-[10px] font-semibold text-text-tertiary">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Travel history — most-recent-first card list, cancelled trips included
 * transparently (never filtered out — that would look like concealment). */
export function TravelHistorySection({ profile }: { profile: ProfileData }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = profile.history.slice(0, visibleCount);
  const hasMore = visibleCount < profile.history.length;

  return (
    <div>
      <h2 className="mb-3 font-display text-base font-bold">Travel history</h2>
      {profile.history.length === 0 ? (
        <p className="text-[12.5px] text-text-tertiary">No completed trips yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {visible.map((h) => (
              <TravelHistoryCard key={h.id} entry={h} />
            ))}
          </div>
          {hasMore && <ShowMoreButton onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} />}
        </>
      )}
    </div>
  );
}

function TravelHistoryCard({ entry }: { entry: TravelHistoryEntry }) {
  const isCancelled = entry.status === "Cancelled";
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
      <div>
        <div className="text-[13px] font-bold">{entry.destination}</div>
        <div className="text-[11px] text-text-muted">
          {entry.dates} · {entry.role}
        </div>
      </div>
      <span
        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
          isCancelled ? "bg-[oklch(96%_0.03_25)] text-[oklch(45%_0.15_25)]" : "bg-surface-tint text-text-tertiary"
        }`}
      >
        {entry.status}
      </span>
    </div>
  );
}

/** Shared "Show more" — batch-loaded, not infinite scroll, reused across
 * both Reviews and Travel History per explicit self-critique callout. */
export function ShowMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-3 text-[12px] font-semibold text-primary hover:underline">
      Show more →
    </button>
  );
}
