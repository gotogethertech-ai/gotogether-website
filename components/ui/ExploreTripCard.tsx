"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useSavedTripIds } from "@/lib/use-saved-trips";
import type { ExploreTrip } from "@/lib/mock-data";
import { genderRestrictionLabel, formatAgeRange } from "@/lib/trip-dates";

/**
 * Explore result card — per "Explore Trips Blueprint" Trip Card Specification:
 * image+badge -> destination/dates -> title (2-line clamp) -> organizer+trust
 * -> members/budget footer. Whole card is one click target; save icon is the
 * only secondary action (bookmark, optimistic per the blueprint's
 * "Performance/scalability" note). No in-card Join button.
 */
export function ExploreTripCard({ trip, priority = false }: { trip: ExploreTrip; priority?: boolean }) {
  const { requireAuth } = useAuth();
  const { savedIds, toggleSave } = useSavedTripIds();
  const saved = savedIds.has(trip.id);
  const ageRange = formatAgeRange(trip.minAge ?? null, trip.maxAge ?? null);
  // Only worth a badge when the organizer actually restricted it — "Mixed
  // group" with no age limit is the default for every trip and would just
  // be noise repeated on every card.
  const showGroupBadge = trip.genderRestriction && trip.genderRestriction !== "any";

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block cursor-pointer overflow-hidden rounded-[18px] border border-border bg-surface transition-shadow hover:shadow-[0_8px_24px_-8px_oklch(20%_0.02_255/0.15)]"
    >
      <div className="relative h-[150px] w-full bg-surface-hover">
        <Image
          src={trip.imgSrc}
          alt={trip.destination}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw"
          className="object-cover"
          priority={priority}
        />
        <span
          className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9.5px] font-bold ${
            trip.type === "partner"
              ? "bg-partner-bg text-partner-fg"
              : "bg-[oklch(94%_0.002_255)] text-text-tertiary"
          }`}
        >
          {trip.type === "partner" ? "Verified Partner" : "Community"}
        </span>
        <button
          aria-label={saved ? "Remove from saved trips" : "Save trip"}
          aria-pressed={saved}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            requireAuth("save this trip", () => toggleSave(trip.id));
          }}
          className="absolute top-2.5 right-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/90"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "oklch(52% 0.18 255)" : "none"}>
            <path
              d="M6 4h12v17l-6-4-6 4z"
              stroke={saved ? "oklch(52% 0.18 255)" : "oklch(35% 0.01 255)"}
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>
      <div className="p-3.5">
        <div className="mb-0.5 text-[11px] text-text-muted">
          {trip.destination} &middot; <span className="text-text-tertiary">Available</span> {trip.dates}
        </div>
        <div className="mb-1.5 line-clamp-2 text-sm leading-tight font-bold">
          {trip.title}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
            <span className="h-4 w-4 rounded-full bg-surface-avatar" aria-hidden="true" />
            <span className="truncate">{trip.organizer}</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-trust-bg px-2 py-0.5 text-[9.5px] font-bold text-trust-fg">
            ⭐ {trip.trust}
          </span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border-divider pt-2 text-[11px] text-text-muted">
          <span>{trip.members} joined</span>
          <span className="font-semibold text-text-secondary">{trip.budget}</span>
        </div>

        {(showGroupBadge || ageRange) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {showGroupBadge && (
              <span className="inline-flex items-center rounded-md bg-[oklch(96%_0.004_255)] px-2 py-0.5 text-[9.5px] font-bold text-text-tertiary">
                {genderRestrictionLabel(trip.genderRestriction)}
              </span>
            )}
            {ageRange && (
              <span className="inline-flex items-center rounded-md bg-[oklch(96%_0.004_255)] px-2 py-0.5 text-[9.5px] font-bold text-text-tertiary">
                Age {ageRange}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
