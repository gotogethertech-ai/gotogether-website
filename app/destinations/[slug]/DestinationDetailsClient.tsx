"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { DestinationCard } from "@/components/ui/DestinationCard";
import { ExploreTripCard } from "@/components/ui/ExploreTripCard";
import { AccentButton } from "@/components/ui/Button";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";
import { getRealExploreTrips } from "@/lib/real-explore";
import type { ExploreTrip } from "@/lib/mock-data";
import type { DestinationRow } from "@/lib/destinations-server";
import { AvailabilityDateNotice } from "@/components/AvailabilityDateNotice";

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  mountains: { label: "Mountains", icon: "🏔️" },
  beaches: { label: "Beaches", icon: "🏖️" },
  heritage: { label: "Heritage", icon: "🏛️" },
  "weekend-escapes": { label: "Weekend Escapes", icon: "🌿" },
  adventure: { label: "Adventure", icon: "🏕️" },
};

const VISIBLE_CAP = 6;

/**
 * Destination Details — per the approved blueprint's Step 5: modest header
 * (image/name/category/count) → admin-authored description → Available
 * Trips (primary focus, reused TripCard, 6-visible cap) → secondary
 * Related Destinations row → "View all in Explore" hand-off. Now reads the
 * real, admin-managed destination (including the description admin writes
 * from /admin/destinations) instead of a hardcoded catalog entry.
 */
export function DestinationDetailsClient({ destination }: { destination: DestinationRow }) {
  const [trips, setTrips] = useState<ExploreTrip[]>([]);
  const [allDestinations, setAllDestinations] = useState<AdminDestinationRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRealExploreTrips(), getDestinations()]).then(([tripRows, dests]) => {
      if (!cancelled) {
        setTrips(tripRows);
        setAllDestinations(dests);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const matchingTrips = useMemo(
    () => trips.filter((t) => t.destination.toLowerCase() === destination.name.toLowerCase()),
    [trips, destination.name]
  );
  const visibleTrips = matchingTrips.slice(0, VISIBLE_CAP);
  const hasMore = matchingTrips.length > VISIBLE_CAP;

  const countByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trips) map.set(t.destination.toLowerCase(), (map.get(t.destination.toLowerCase()) ?? 0) + 1);
    return map;
  }, [trips]);

  const related = useMemo(
    () => allDestinations.filter((d) => d.category === destination.category && d.slug !== destination.slug).slice(0, 4),
    [allDestinations, destination.category, destination.slug]
  );

  const meta = destination.category ? CATEGORY_META[destination.category] : undefined;

  return (
    <>
      <Header activePath="/destinations" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[1000px] px-8 pb-20 max-[599px]:px-4">
          <nav aria-label="Breadcrumb" className="pt-4 text-[11.5px] text-primary">
            <Link href="/destinations" className="font-medium hover:underline">
              Destinations
            </Link>
            <span className="text-text-muted"> › </span>
            <span className="text-text-tertiary">{destination.name}</span>
          </nav>

          <div className="flex flex-col gap-5 py-6 min-[600px]:flex-row min-[600px]:items-center">
            <div className="relative h-[160px] w-full flex-none overflow-hidden rounded-2xl bg-surface-hover min-[600px]:h-[150px] min-[600px]:w-[200px]">
              <Image
                src={destination.cover_image_url ?? "/placeholders/manali.svg"}
                alt={destination.name}
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="mb-1 font-display text-[26px] font-bold">{destination.name}</h1>
              <div className="mb-2 text-[12px] text-text-muted">
                {meta ? `${meta.icon} ${meta.label} · ` : ""}
                {matchingTrips.length} trip{matchingTrips.length === 1 ? "" : "s"} available
              </div>
              {(destination.description || destination.tagline) && (
                <p className="max-w-[480px] text-[12.5px] leading-relaxed text-text-secondary">
                  {destination.description ?? destination.tagline}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold">Available trips to {destination.name}</h2>
            {hasMore && (
              <Link
                href={`/explore?destination=${encodeURIComponent(destination.name)}`}
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                View all in Explore →
              </Link>
            )}
          </div>

          {loaded && visibleTrips.length > 0 && <AvailabilityDateNotice />}

          {!loaded ? null : visibleTrips.length > 0 ? (
            <div className="mb-11 grid grid-cols-1 gap-4.5 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
              {visibleTrips.map((trip) => (
                <ExploreTripCard key={trip.id} trip={trip} />
              ))}
            </div>
          ) : (
            <div className="mb-11 flex flex-col items-center gap-3 rounded-2xl bg-surface-tint px-6 py-14 text-center">
              <p className="max-w-[360px] text-[13.5px] text-text-tertiary">
                No trips to {destination.name} yet. Be the first to plan one.
              </p>
              <AccentButton href={`/create-trip?destination=${destination.slug}`}>
                + Create a Trip to {destination.name}
              </AccentButton>
            </div>
          )}

          {related.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-bold text-text-tertiary">Related destinations</h2>
              <ScrollRow ariaLabel="Related destinations">
                {related.map((d) => (
                  <div key={d.slug} className="w-[150px] flex-none">
                    <DestinationCard destination={d} tripCount={countByName.get(d.name.toLowerCase()) ?? 0} size="compact" />
                  </div>
                ))}
              </ScrollRow>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
