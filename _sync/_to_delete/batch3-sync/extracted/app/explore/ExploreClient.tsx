"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { FilterChip } from "@/components/ui/FilterChip";
import { ExploreTripCard } from "@/components/ui/ExploreTripCard";
import { AccentButton } from "@/components/ui/Button";
import { exploreTrips } from "@/lib/mock-data";

const SORT_OPTIONS = [
  "Best Match",
  "Newest",
  "Leaving Soon",
  "Lowest Budget",
  "Highest Trust",
  "Most Members Joined",
] as const;

const PAGE_SIZE = 8;

/**
 * Explore page client logic — search, quick filters (Verified Only /
 * Community Only, non-exclusive per the blueprint's fix for the
 * AND/OR ambiguity self-critique item), sort, and a "Load more" button
 * standing in for infinite scroll (keyboard-accessible fallback per the
 * Accessibility section, kept as the primary mechanism until virtualized
 * scroll is wired to a real paginated API).
 */
export function ExploreClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Company pre-filter, per the Travel Companies Blueprint's "View all in
  // Explore" hand-off — not a user-facing chip (no company search UI on
  // Explore itself), just a URL-driven filter set by Company Profile.
  const companyFilter = searchParams.get("company");
  const [destination, setDestination] = useState(() => {
    const fromUrl = searchParams.get("destination");
    if (fromUrl) return fromUrl;
    // Default to "Manali" only for the page's own default entry (no
    // pre-filter of any kind active) — a company hand-off shouldn't also
    // get silently narrowed to Manali.
    return companyFilter ? "" : "Manali";
  });
  const [verifiedOnly, setVerifiedOnly] = useState(
    searchParams.get("verified") === "1"
  );
  const [communityOnly, setCommunityOnly] = useState(
    searchParams.get("community") === "1"
  );
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>("Best Match");
  const [sortOpen, setSortOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function syncUrl(next: {
    destination?: string;
    verified?: boolean;
    community?: boolean;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const d = next.destination ?? destination;
    const v = next.verified ?? verifiedOnly;
    const c = next.community ?? communityOnly;
    if (d) params.set("destination", d);
    else params.delete("destination");
    if (v) params.set("verified", "1");
    else params.delete("verified");
    if (c) params.set("community", "1");
    else params.delete("community");
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    let results = exploreTrips.filter((t) =>
      destination
        ? t.destination.toLowerCase().includes(destination.toLowerCase())
        : true
    );
    if (companyFilter) {
      results = results.filter((t) => t.organizer === companyFilter);
    }
    if (verifiedOnly && communityOnly) {
      // Non-exclusive OR: showing both is equivalent to no type filter.
    } else if (verifiedOnly) {
      results = results.filter((t) => t.type === "partner");
    } else if (communityOnly) {
      results = results.filter((t) => t.type === "community");
    }

    switch (sort) {
      case "Lowest Budget":
        results = [...results].sort(
          (a, b) =>
            Number(a.budget.replace(/[^\d]/g, "")) -
            Number(b.budget.replace(/[^\d]/g, ""))
        );
        break;
      case "Highest Trust":
        results = [...results].sort((a, b) => Number(b.trust) - Number(a.trust));
        break;
      case "Most Members Joined":
        results = [...results].sort((a, b) => {
          const aJoined = Number(a.members.split("/")[0]);
          const bJoined = Number(b.members.split("/")[0]);
          return bJoined - aJoined;
        });
        break;
      default:
        // Newest / Leaving Soon / Best Match: mock data has no timestamps to
        // sort by yet — falls back to publish order until the real API
        // supplies dates/ranking, same "no invented data" rule as elsewhere.
        break;
    }
    return results;
  }, [destination, companyFilter, verifiedOnly, communityOnly, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="bg-surface">
      {/* Sticky search + quick filters, beneath the site header */}
      <div className="sticky top-0 z-30 border-b border-border-soft bg-surface md:top-[60px]">
        <div className="mx-auto max-w-(--content-max-width) px-8 pt-4.5 pb-3.5">
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="mb-3.5 flex items-center gap-2.5 rounded-full border border-border-input bg-surface-tint px-4.5 py-3"
          >
            <SearchIcon size={17} className="text-text-muted" />
            <label htmlFor="explore-search" className="sr-only">
              Search a destination
            </label>
            <input
              id="explore-search"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              onBlur={() => syncUrl({})}
              placeholder="Search a destination — Manali, Goa, Spiti..."
              className="flex-1 border-none bg-transparent text-[13.5px] outline-none font-sans"
            />
            {destination && (
              <button
                type="button"
                aria-label="Clear destination"
                onClick={() => {
                  setDestination("");
                  syncUrl({ destination: "" });
                }}
                className="text-text-muted hover:text-text-secondary"
              >
                ×
              </button>
            )}
          </form>

          <div className="rail flex gap-2.5 overflow-x-auto pb-0.5" role="group" aria-label="Quick filters">
            {destination && (
              <FilterChip active onClick={() => { setDestination(""); syncUrl({ destination: "" }); }}>
                {destination} ×
              </FilterChip>
            )}
            {companyFilter && (
              <FilterChip
                active
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("company");
                  router.replace(`/explore?${params.toString()}`, { scroll: false });
                }}
              >
                {companyFilter} ×
              </FilterChip>
            )}
            <FilterChip>Budget ▾</FilterChip>
            <FilterChip>Dates ▾</FilterChip>
            <FilterChip>Duration ▾</FilterChip>
            <FilterChip>Trip Type ▾</FilterChip>
            <FilterChip
              active={verifiedOnly}
              aria-pressed={verifiedOnly}
              onClick={() => {
                const next = !verifiedOnly;
                setVerifiedOnly(next);
                setVisibleCount(PAGE_SIZE);
                syncUrl({ verified: next });
              }}
            >
              Verified Only
            </FilterChip>
            <FilterChip
              active={communityOnly}
              aria-pressed={communityOnly}
              onClick={() => {
                const next = !communityOnly;
                setCommunityOnly(next);
                setVisibleCount(PAGE_SIZE);
                syncUrl({ community: next });
              }}
            >
              Community Only
            </FilterChip>
            <FilterChip emphasized>All Filters</FilterChip>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-(--content-max-width) px-8 pt-6 pb-16">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">
            {filtered.length} trip{filtered.length === 1 ? "" : "s"}
            {destination ? ` to ${destination}` : ""}
          </h1>
          <div
            className="relative flex items-center gap-2 text-[12.5px] text-text-tertiary"
            aria-live="polite"
          >
            Sort by
            <FilterChip
              className="font-semibold"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              onClick={() => setSortOpen((v) => !v)}
            >
              {sort} ▾
            </FilterChip>
            {sortOpen && (
              <ul
                role="listbox"
                className="absolute top-10 right-0 z-10 w-[190px] rounded-xl border border-border bg-surface p-1.5 shadow-[0_12px_32px_-8px_oklch(20%_0.02_255/0.18)]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <li key={opt}>
                    <button
                      role="option"
                      aria-selected={sort === opt}
                      onClick={() => {
                        setSort(opt);
                        setSortOpen(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-[12.5px] hover:bg-surface-hover ${
                        sort === opt ? "font-semibold text-primary" : ""
                      }`}
                    >
                      {opt}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            onClearFilters={() => {
              setDestination("");
              setVerifiedOnly(false);
              setCommunityOnly(false);
              syncUrl({ destination: "", verified: false, community: false });
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
              {visible.map((trip) => (
                <ExploreTripCard key={trip.id} trip={trip} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-9 text-center">
                <FilterChip
                  className="mx-auto px-7 py-3 font-semibold"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Load more trips
                </FilterChip>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** "No results for these filters" — distinct from the zero-trips-ever
 * cold-start copy, per the blueprint's Page States section. */
function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="mb-2 font-display text-lg font-bold">
        No trips match these filters
      </h2>
      <p className="mb-6 text-[13.5px] leading-relaxed text-text-tertiary">
        Try widening your search, or be the first to plan a trip like this
        one.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <FilterChip className="px-5 py-2.5 font-semibold" onClick={onClearFilters}>
          Clear all filters
        </FilterChip>
        <AccentButton href="/create-trip">+ Create a Trip</AccentButton>
      </div>
    </div>
  );
}
