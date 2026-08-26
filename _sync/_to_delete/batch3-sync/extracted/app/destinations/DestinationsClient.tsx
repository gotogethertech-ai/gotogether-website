"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchIcon } from "@/components/icons";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { DestinationCard } from "@/components/ui/DestinationCard";
import {
  destinationsCatalog,
  getPopularDestinations,
  getDestinationsByCategory,
  searchDestinationsCatalog,
  CATEGORY_META,
  type DestinationCategory,
} from "@/lib/destinations-catalog";

const CATEGORY_ORDER: DestinationCategory[] = ["mountains", "beaches", "weekend-escapes", "adventure"];

/**
 * Destinations Discovery — Concept C from the approved blueprint: intro →
 * light search → "Popular from Delhi NCR" rail → category-grouped grids.
 * Search results replace the browsable structure in place; clearing
 * restores it. Search term is URL-persisted per the blueprint's
 * Interactions spec.
 */
export function DestinationsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const popular = useMemo(() => getPopularDestinations(), []);
  const searchResults = useMemo(() => searchDestinationsCatalog(query), [query]);
  const isSearching = query.trim().length > 0;

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
            {isSearching ? (
              searchResults.length > 0 ? (
                <div>
                  <div className="mb-3 text-[11px] font-semibold tracking-wide text-text-muted">
                    SEARCH RESULTS
                  </div>
                  <div className="grid grid-cols-2 gap-4 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
                    {searchResults.map((d) => (
                      <DestinationCard key={d.slug} destination={d} />
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
                    <h2 className="mb-3.5 font-display text-lg font-bold">🔥 Popular from Delhi NCR</h2>
                    <ScrollRow ariaLabel="Popular destinations">
                      {popular.map((d) => (
                        <div key={d.slug} className="w-[200px] flex-none">
                          <DestinationCard destination={d} />
                        </div>
                      ))}
                    </ScrollRow>
                  </section>
                )}

                {CATEGORY_ORDER.map((cat) => {
                  const items = getDestinationsByCategory(cat);
                  if (items.length === 0) return null;
                  const meta = CATEGORY_META[cat];
                  return (
                    <section key={cat} className="mb-10">
                      <h2 className="mb-3.5 font-display text-lg font-bold">
                        {meta.icon} {meta.label}
                      </h2>
                      <div className="grid grid-cols-2 gap-4 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
                        {items.map((d) => (
                          <DestinationCard key={d.slug} destination={d} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </>
            )}
          </div>

          {destinationsCatalog.length === 0 && (
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
