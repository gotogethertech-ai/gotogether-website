"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchIcon } from "@/components/icons";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { DestinationCard } from "@/components/ui/DestinationCard";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";
import { getRealExploreTrips } from "@/lib/real-explore";
import type { ExploreTrip } from "@/lib/mock-data";

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  mountains: { label: "Mountains", icon: "🏔️" },
  beaches: { label: "Beaches", icon: "🏖️" },
  heritage: { label: "Heritage", icon: "🏛️" },
  "weekend-escapes": { label: "Weekend Escapes", icon: "🌿" },
  adventure: { label: "Adventure", icon: "🏕️" },
};

/**
 * Destinations Discovery — Concept C from the approved blueprint: intro →
 * light search → "Popular" rail → category-grouped grids. Now reads the
 * real, admin-managed destinations table (see /admin/destinations) instead
 * of a hardcoded catalog, and trip counts come from real live trips.
 */
export function DestinationsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [destinations, setDestinations] = useState<AdminDestinationRow[]>([]);
  const [trips, setTrips] = useState<ExploreTrip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDestinations(), getRealExploreTrips()]).then(([dests, tripRows]) => {
      if (!cancelled) {
        setDestinations(dests);
        setTrips(tripRows);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const countByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trips) map.set(t.destination.toLowerCase(), (map.get(t.destination.toLowerCase()) ?? 0) + 1);
    return map;
  }, [trips]);

  function countFor(d: AdminDestinationRow) {
    return countByName.get(d.name.toLowerCase()) ?? 0;
  }

  const popular = useMemo(() => destinations.slice(0, 6), [destinations]);
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return destinations.filter((d) => d.name.toLowerCase().includes(q));
  }, [destinations, query]);
  const isSearching = query.trim().length > 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, AdminDestinationRow[]>();
    for (const d of destinations) {
      const key = d.category ?? "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [destinations]);

  function syncUrl(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("q", next);
    else params.delete("q");
    router.replace(`/destinations${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  return (
    <>
      <Header activePath="/destinations" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-(--content-max-width) px-8 py-9 pb-20 max-[599px]:px-4">
          <h1 className="mb-1.5 font-display text-[28px] font-bold">Explore Destinations</h1>
          <p className="mb-6 text-[13px] text-text-tertiary">
            Trips currently start from Delhi NCR — browse where travellers are headed.
          </p>

          <div className="mb-9 flex max-w-[420px] items-center gap-2 rounded-full border border-border-input bg-surface-tint px-4.5 py-3">
            <SearchIcon size={16} className="flex-none text-text-muted" />
            <label htmlFor="destination-search" className="sr-only">
              Search destinations
            </label>
            <input
              id="destination-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                syncUrl(e.target.value);
              }}
              placeholder="Search destinations"
              className="flex-1 border-none bg-transparent text-[13px] outline-none"
              role="combobox"
              aria-expanded={isSearching}
              aria-controls="destinations-content"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  syncUrl("");
                }}
                className="text-text-muted hover:text-text-secondary"
              >
                ×
              </button>
            )}
          </div>

          <div id="destinations-content" aria-live="polite">
            {!loaded ? (
              <div
                className="grid grid-cols-2 gap-4 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4"
                aria-hidden="true"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-[160px] animate-pulse rounded-2xl bg-surface-hover" />
                ))}
              </div>
            ) : isSearching ? (
              searchResults.length > 0 ? (
                <div>
                  <div className="mb-3 text-[11px] font-semibold tracking-wide text-text-muted">
                    SEARCH RESULTS
                  </div>
                  <div className="grid grid-cols-2 gap-4 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
                    {searchResults.map((d) => (
                      <DestinationCard key={d.slug} destination={d} tripCount={countFor(d)} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mb-8 text-[13.5px] text-text-tertiary">
                  No destinations match &ldquo;{query}&rdquo; yet — browse by category below.
                </p>
              )
            ) : null}

            {(!isSearching || searchResults.length === 0) && (
              <>
                {!isSearching && (
                  <section className="mb-10">
                    <h2 className="mb-3.5 font-display text-lg font-bold">🔥 Popular</h2>
                    <ScrollRow ariaLabel="Popular destinations">
                      {popular.map((d) => (
                        <div key={d.slug} className="w-[200px] flex-none">
                          <DestinationCard destination={d} tripCount={countFor(d)} />
                        </div>
                      ))}
                    </ScrollRow>
                  </section>
                )}

                {[...byCategory.entries()].map(([key, items]) => {
                  const meta = CATEGORY_META[key] ?? { label: key, icon: "📍" };
                  return (
                    <section key={key} className="mb-10">
                      <h2 className="mb-3.5 font-display text-lg font-bold">
                        {meta.icon} {meta.label}
                      </h2>
                      <div className="grid grid-cols-2 gap-4 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
                        {items.map((d) => (
                          <DestinationCard key={d.slug} destination={d} tripCount={countFor(d)} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </>
            )}
          </div>

          {loaded && destinations.length === 0 && (
            <p className="py-16 text-center text-[13.5px] text-text-tertiary">
              Destinations are being added.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
