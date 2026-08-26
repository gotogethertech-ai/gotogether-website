"use client";

import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { DestinationCard } from "@/components/ui/DestinationCard";
import { ExploreTripCard } from "@/components/ui/ExploreTripCard";
import { AccentButton } from "@/components/ui/Button";
import {
  CATEGORY_META,
  getRelatedDestinations,
  type CatalogDestination,
} from "@/lib/destinations-catalog";
import { exploreTrips } from "@/lib/mock-data";

const VISIBLE_CAP = 6;

/**
 * Destination Details — per the approved blueprint's Step 5: modest header
 * (image/name/category/count) → optional one-line brief → Available Trips
 * (primary focus, reused TripCard, 6-visible cap) → secondary Related
 * Destinations row → "View all in Explore" hand-off. No day-wise guide, no
 * map, no "best time to visit" — deliberately out of scope per Step 1.
 */
export function DestinationDetailsClient({ destination }: { destination: CatalogDestination }) {
  const trips = exploreTrips.filter(
    (t) => t.destination.toLowerCase() === destination.name.toLowerCase()
  );
  const visibleTrips = trips.slice(0, VISIBLE_CAP);
  const hasMore = trips.length > VISIBLE_CAP;
  const related = getRelatedDestinations(destination.slug);
  const meta = CATEGORY_META[destination.category];

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
              <Image src={destination.imgSrc} alt={destination.name} fill sizes="200px" className="object-cover" />
            </div>
            <div>
              <h1 className="mb-1 font-display text-[26px] font-bold">{destination.name}</h1>
              <div className="mb-2 text-[12px] text-text-muted">
                {meta.icon} {meta.label} · {trips.length} trip{trips.length === 1 ? "" : "s"} available
              </div>
              <p className="max-w-[480px] text-[12.5px] leading-relaxed text-text-secondary">
                {destination.brief}
              </p>
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

          {visibleTrips.length > 0 ? (
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
                    <DestinationCard destination={d} size="compact" />
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
