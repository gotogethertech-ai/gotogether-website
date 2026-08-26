import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { OrganizerInfo } from "@/lib/trip-details";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Compact Organizer/Company card — per Trip Details Blueprint "Host /
 * Organizer Specification": photo/logo, name, trust indicator, trips
 * hosted, response time, verification badge, "View Profile" link.
 * Individual and company variants share this one component.
 */
export function OrganizerCard({ organizer }: { organizer: OrganizerInfo }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface-alt p-4">
      <Avatar
        avatarUrl={organizer.avatarUrl}
        initials={initialsFrom(organizer.name)}
        size={52}
        className="text-base font-bold"
      />
      <div className="flex-1">
        <div className="text-sm font-bold">{organizer.name}</div>
        <div className="text-[11px] text-text-muted">
          {organizer.tripsHosted} trip{organizer.tripsHosted === 1 ? "" : "s"} hosted
          &middot; {organizer.responseTime}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {organizer.kind === "individual" && organizer.trustScore && (
            <span className="inline-flex items-center gap-1 rounded-md bg-trust-bg px-2 py-0.5 text-[10px] font-bold text-trust-fg">
              ⭐ {organizer.trustScore} Trust
            </span>
          )}
          {organizer.kind === "company" && organizer.aggregateRating && (
            <span className="inline-flex items-center gap-1 rounded-md bg-trust-bg px-2 py-0.5 text-[10px] font-bold text-trust-fg">
              ⭐ {organizer.aggregateRating}
              {organizer.ratingTripCount ? ` (${organizer.ratingTripCount} trips)` : ""}
            </span>
          )}
          {organizer.verified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[oklch(93%_0.03_185)] px-2 py-0.5 text-[10px] font-bold text-[oklch(35%_0.08_185)]">
              ✓ {organizer.kind === "company" ? "Verified Partner" : "ID Verified"}
            </span>
          )}
        </div>
      </div>
      <Link
        href={`/profile/${encodeURIComponent(organizer.id ?? organizer.name)}`}
        className="text-sm font-semibold whitespace-nowrap text-text-secondary hover:text-primary"
      >
        View Profile
      </Link>
    </div>
  );
}
