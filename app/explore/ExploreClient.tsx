"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { FilterChip } from "@/components/ui/FilterChip";
import { ExploreTripCard } from "@/components/ui/ExploreTripCard";
import { AccentButton } from "@/components/ui/Button";
import type { ExploreTrip } from "@/lib/mock-data";
import { getRealExploreTrips } from "@/lib/real-explore";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";
import { useAuth, hasCompleteProfile, tripMatchesViewer, MINIMUM_AGE, ageFromDateOfBirth } from "@/lib/auth-context";
import { AvailabilityDateNotice } from "@/components/AvailabilityDateNotice";

const SORT_OPTIONS = [
  "Best Match",
  "Newest",
  "Leaving Soon",
  "Lowest Budget",
  "Highest Trust",
  "Most Members Joined",
] as const;

const PAGE_SIZE = 8;

type TripType = "partner" | "community";
type GenderFilter = "any" | "women_only" | "men_only";

const BUDGET_BUCKETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Under ₹5,000", min: null, max: 5000 },
  { label: "₹5,000 – ₹10,000", min: 5000, max: 10000 },
  { label: "₹10,000 – ₹15,000", min: 10000, max: 15000 },
  { label: "₹15,000 – ₹25,000", min: 15000, max: 25000 },
  { label: "₹25,000+", min: 25000, max: null },
];

const DURATION_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "1–3 days", min: 1, max: 3 },
  { label: "4–6 days", min: 4, max: 6 },
  { label: "7–10 days", min: 7, max: 10 },
  { label: "11+ days", min: 11, max: 99 },
];

const GENDER_FILTER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: "any", label: "Mixed" },
  { value: "women_only", label: "Women Only" },
  { value: "men_only", label: "Men Only" },
];

/** A trip's own budget range overlaps the picked bucket at all (not
 * "fits entirely inside it") — e.g. a trip priced ₹8,000–₹20,000 should
 * still show up under both "₹5,000 – ₹10,000" and "₹15,000 – ₹25,000",
 * since a traveller budgeting in either range could plausibly join it. */
function budgetOverlaps(trip: ExploreTrip, bucket: { min: number | null; max: number | null }): boolean {
  const tMin = trip.budgetMin ?? trip.budgetMax ?? null;
  const tMax = trip.budgetMax ?? trip.budgetMin ?? null;
  if (tMin == null && tMax == null) return true; // no budget on record — don't hide it
  if (bucket.min != null && tMax != null && tMax < bucket.min) return false;
  if (bucket.max != null && tMin != null && tMin > bucket.max) return false;
  return true;
}

/** Same overlap logic for the duration range filter. */
function durationOverlaps(trip: ExploreTrip, bucket: { min: number; max: number }): boolean {
  const tMin = trip.durationMin ?? trip.durationMax ?? null;
  const tMax = trip.durationMax ?? trip.durationMin ?? null;
  if (tMin == null && tMax == null) return true;
  if (tMax != null && tMax < bucket.min) return false;
  if (tMin != null && tMin > bucket.max) return false;
  return true;
}

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
  const { user } = useAuth();
  const canFilterByMatch = hasCompleteProfile(user);

  // Company pre-filter, per the Travel Companies Blueprint's "View all in
  // Explore" hand-off — not a user-facing chip (no company search UI on
  // Explore itself), just a URL-driven filter set by Company Profile.
  const companyFilter = searchParams.get("company");
  const [destination, setDestination] = useState(() => searchParams.get("destination") ?? "");
  const [verifiedOnly, setVerifiedOnly] = useState(
    searchParams.get("verified") === "1"
  );
  const [communityOnly, setCommunityOnly] = useState(
    searchParams.get("community") === "1"
  );
  const [matchesMeOnly, setMatchesMeOnly] = useState(
    searchParams.get("matchesMe") === "1"
  );
  const [tripTypes, setTripTypes] = useState<TripType[]>(() => {
    const raw = searchParams.get("types");
    return raw ? (raw.split(",").filter((v): v is TripType => v === "partner" || v === "community")) : [];
  });
  const [budgetBucket, setBudgetBucket] = useState<string>(() => searchParams.get("budget") ?? "");
  const [durationBucket, setDurationBucket] = useState<string>(() => searchParams.get("duration") ?? "");
  const [ageFilter, setAgeFilter] = useState<string>(() => searchParams.get("age") ?? "");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(() => {
    const raw = searchParams.get("gender");
    return raw === "women_only" || raw === "men_only" ? raw : "any";
  });
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>("Best Match");
  const [sortOpen, setSortOpen] = useState(false);
  const [allFiltersOpen, setAllFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [exploreTrips, setExploreTrips] = useState<ExploreTrip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [destinations, setDestinations] = useState<AdminDestinationRow[]>([]);
  const [destinationPickerOpen, setDestinationPickerOpen] = useState(false);
  const destinationPickerRef = useRef<HTMLDivElement>(null);
  // Measured height of the sticky search/quick-filter bar, so the desktop
  // filter sidebar's `top`/`max-height` track its ACTUAL rendered height
  // instead of a guessed pixel constant (a guessed constant is exactly
  // what caused the sidebar to overlap the search bar previously — content
  // height there isn't fixed, e.g. the destination chip row wraps). 0 —
  // meaning "not measured yet" — is a safe fallback: the sidebar simply
  // renders flush under the very top of the page for one frame.
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const [stickyBarHeight, setStickyBarHeight] = useState(0);

  useEffect(() => {
    const el = stickyBarRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h != null) setStickyBarHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    getRealExploreTrips().then((trips) => {
      if (!cancelled) {
        setExploreTrips(trips);
        setLoaded(true);
      }
    });
    getDestinations().then((rows) => {
      if (!cancelled) setDestinations(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!destinationPickerOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (destinationPickerRef.current && !destinationPickerRef.current.contains(e.target as Node)) {
        setDestinationPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [destinationPickerOpen]);

  // Mobile drawer only (matches VerificationRequiredInterstitial's own
  // modal convention) — the desktop sidebar sits inline in the page flow,
  // so it never needs a scroll lock or Escape handler.
  useEffect(() => {
    if (!allFiltersOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAllFiltersOpen(false);
    }
    const mq = window.matchMedia("(max-width: 767px)");
    if (mq.matches) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [allFiltersOpen]);


  function selectDestination(name: string) {
    setDestination(name);
    setVisibleCount(PAGE_SIZE);
    setDestinationPickerOpen(false);
    syncUrl({ destination: name });
  }

  function syncUrl(next: {
    destination?: string;
    verified?: boolean;
    community?: boolean;
    matchesMe?: boolean;
    types?: TripType[];
    budget?: string;
    duration?: string;
    age?: string;
    gender?: GenderFilter;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const d = next.destination ?? destination;
    const v = next.verified ?? verifiedOnly;
    const c = next.community ?? communityOnly;
    const m = next.matchesMe ?? matchesMeOnly;
    const t = next.types ?? tripTypes;
    const b = next.budget ?? budgetBucket;
    const dur = next.duration ?? durationBucket;
    const a = next.age ?? ageFilter;
    const g = next.gender ?? genderFilter;
    if (d) params.set("destination", d);
    else params.delete("destination");
    if (v) params.set("verified", "1");
    else params.delete("verified");
    if (c) params.set("community", "1");
    else params.delete("community");
    if (m) params.set("matchesMe", "1");
    else params.delete("matchesMe");
    if (t.length > 0) params.set("types", t.join(","));
    else params.delete("types");
    if (b) params.set("budget", b);
    else params.delete("budget");
    if (dur) params.set("duration", dur);
    else params.delete("duration");
    if (a) params.set("age", a);
    else params.delete("age");
    if (g !== "any") params.set("gender", g);
    else params.delete("gender");
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  }

  // Applied without the destination filter — used to power the "explore
  // other live trips" fallback list when a destination search comes up
  // empty, so a visitor always has something to browse instead of a dead
  // end.
  const otherLiveTrips = useMemo(() => {
    let results = exploreTrips;
    if (companyFilter) results = results.filter((t) => t.organizer === companyFilter);
    if (verifiedOnly && !communityOnly) results = results.filter((t) => t.type === "partner");
    else if (communityOnly && !verifiedOnly) results = results.filter((t) => t.type === "community");
    return results;
  }, [exploreTrips, companyFilter, verifiedOnly, communityOnly]);

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
    // "All Filters" panel's own Trip Type checkboxes — separate state
    // from the Verified/Community quick chips above so the two controls
    // (which represent the same underlying trip.type) stay in sync
    // without fighting each other: an empty selection means no filter.
    if (tripTypes.length > 0) {
      results = results.filter((t) => tripTypes.includes(t.type));
    }
    if (budgetBucket) {
      const bucket = BUDGET_BUCKETS.find((b) => b.label === budgetBucket);
      if (bucket) results = results.filter((t) => budgetOverlaps(t, bucket));
    }
    if (durationBucket) {
      const bucket = DURATION_BUCKETS.find((b) => b.label === durationBucket);
      if (bucket) results = results.filter((t) => durationOverlaps(t, bucket));
    }
    if (ageFilter) {
      const age = Number(ageFilter);
      if (Number.isFinite(age)) {
        results = results.filter((t) => {
          const min = t.minAge ?? MINIMUM_AGE;
          const max = t.maxAge;
          if (age < min) return false;
          if (max != null && age > max) return false;
          return true;
        });
      }
    }
    if (genderFilter !== "any") {
      results = results.filter((t) => {
        const restriction = t.genderRestriction ?? "any";
        return restriction === "any" || restriction === genderFilter;
      });
    }
    if (matchesMeOnly && canFilterByMatch && user) {
      results = results.filter((t) => tripMatchesViewer(t, user));
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
  }, [
    exploreTrips,
    destination,
    companyFilter,
    verifiedOnly,
    communityOnly,
    tripTypes,
    budgetBucket,
    durationBucket,
    ageFilter,
    genderFilter,
    matchesMeOnly,
    canFilterByMatch,
    user,
    sort,
  ]);

  const activeAllFiltersCount =
    tripTypes.length + (budgetBucket ? 1 : 0) + (durationBucket ? 1 : 0) + (ageFilter ? 1 : 0) + (genderFilter !== "any" ? 1 : 0);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="bg-surface">
      {/* Sticky search + quick filters, beneath the site header */}
      <div ref={stickyBarRef} className="sticky top-0 z-30 border-b border-border-soft bg-surface md:top-[60px]">
        <div className="mx-auto max-w-(--content-max-width) px-8 pt-4.5 pb-3.5">
          <div ref={destinationPickerRef} className="relative mb-3.5">
            <button
              type="button"
              onClick={() => setDestinationPickerOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={destinationPickerOpen}
              className="flex w-full items-center gap-2.5 rounded-full border border-border-input bg-surface-tint px-4.5 py-3 text-left"
            >
              <SearchIcon size={17} className="text-text-muted" />
              <span className={`flex-1 text-[13.5px] font-sans ${destination ? "text-text-primary" : "text-text-muted"}`}>
                {destination || "Pick a destination — Manali, Goa, Rishikesh…"}
              </span>
              {destination && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear destination"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDestination("");
                    syncUrl({ destination: "" });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      setDestination("");
                      syncUrl({ destination: "" });
                    }
                  }}
                  className="text-text-muted hover:text-text-secondary"
                >
                  ×
                </span>
              )}
              <span className="text-text-muted">▾</span>
            </button>

            {destinationPickerOpen && (
              <ul
                role="listbox"
                aria-label="Destinations"
                className="absolute top-[calc(100%+6px)] left-0 z-20 max-h-[320px] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-[0_12px_32px_-8px_oklch(20%_0.02_255/0.18)]"
              >
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={!destination}
                    onClick={() => selectDestination("")}
                    className={`block w-full rounded-lg px-3 py-2.5 text-left text-[13px] hover:bg-surface-hover ${
                      !destination ? "font-semibold text-primary" : ""
                    }`}
                  >
                    All destinations
                  </button>
                </li>
                {destinations.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={destination === d.name}
                      onClick={() => selectDestination(d.name)}
                      className={`block w-full rounded-lg px-3 py-2.5 text-left text-[13px] hover:bg-surface-hover ${
                        destination === d.name ? "font-semibold text-primary" : ""
                      }`}
                    >
                      {d.name}
                      {d.tagline && <span className="ml-2 text-[11px] font-normal text-text-tertiary">{d.tagline}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
            {budgetBucket && (
              <FilterChip
                active
                onClick={() => {
                  setBudgetBucket("");
                  syncUrl({ budget: "" });
                }}
              >
                {budgetBucket} ×
              </FilterChip>
            )}
            {durationBucket && (
              <FilterChip
                active
                onClick={() => {
                  setDurationBucket("");
                  syncUrl({ duration: "" });
                }}
              >
                {durationBucket} ×
              </FilterChip>
            )}
            {ageFilter && (
              <FilterChip
                active
                onClick={() => {
                  setAgeFilter("");
                  syncUrl({ age: "" });
                }}
              >
                Age {ageFilter} ×
              </FilterChip>
            )}
            {genderFilter !== "any" && (
              <FilterChip
                active
                onClick={() => {
                  setGenderFilter("any");
                  syncUrl({ gender: "any" });
                }}
              >
                {GENDER_FILTER_OPTIONS.find((o) => o.value === genderFilter)?.label} ×
              </FilterChip>
            )}
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
            {canFilterByMatch && (
              <FilterChip
                active={matchesMeOnly}
                aria-pressed={matchesMeOnly}
                onClick={() => {
                  const next = !matchesMeOnly;
                  setMatchesMeOnly(next);
                  setVisibleCount(PAGE_SIZE);
                  syncUrl({ matchesMe: next });
                }}
              >
                Matches Me
              </FilterChip>
            )}
            <FilterChip
              emphasized
              active={allFiltersOpen}
              aria-pressed={allFiltersOpen}
              onClick={() => setAllFiltersOpen((v) => !v)}
            >
              {allFiltersOpen ? "Hide Filters" : "All Filters"}
              {activeAllFiltersCount > 0 ? ` (${activeAllFiltersCount})` : ""} ▾
            </FilterChip>
          </div>
        </div>
      </div>

      {/* Sidebar + results, Flipkart-style.
          Mobile/tablet (below md): a `fixed` full-height drawer that
          intentionally overlays the search bar and footer — that's the
          correct behavior for a slide-over drawer with a backdrop.
          Desktop (md+): `sticky`, not `fixed`. Sticky keeps it in normal
          document flow, so it can never render above the search bar or
          below the footer — the browser stops it at its containing
          block's own boundaries automatically, unlike `fixed` which
          floats relative to the viewport regardless of where the page
          content actually is. `top`/`maxHeight` are computed from the
          sticky search bar's ACTUAL measured height (stickyBarHeight),
          not a guessed constant, so it tracks correctly if that bar's
          height ever changes (e.g. the chip row wrapping to two lines). */}
      <div className="mx-auto max-w-(--content-max-width) px-8 pt-6 pb-16">
        <div className="flex items-start gap-6">
          {allFiltersOpen && (
            <>
              {/* Mobile/tablet: full-screen drawer overlay */}
              <div
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                onClick={() => setAllFiltersOpen(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="All filters"
                style={
                  {
                    // Read by the md:top-[...] and md:max-h-[...] utility
                    // classes below via var(). Mobile ignores both — its
                    // `inset-y-0` (full viewport height, top: 0) wins at
                    // that breakpoint since there's no md: prefix
                    // competing with it there.
                    "--sticky-bar-h": `${stickyBarHeight}px`,
                  } as CSSProperties
                }
                className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[340px] overflow-y-auto overscroll-contain bg-surface p-5 shadow-[0_0_32px_-4px_oklch(20%_0.02_255/0.35)] md:sticky md:inset-y-auto md:top-[calc(var(--sticky-bar-h)+16px)] md:z-0 md:max-h-[calc(100vh-var(--sticky-bar-h)-40px)] md:w-[260px] md:max-w-none md:flex-none md:self-start md:rounded-2xl md:border md:border-border md:p-4 md:shadow-none"
              >
                <div className="mb-4 flex items-center justify-between md:hidden">
                  <h2 className="font-display text-base font-bold">Filters</h2>
                  <button
                    type="button"
                    aria-label="Close filters"
                    onClick={() => setAllFiltersOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-muted"
                  >
                    ×
                  </button>
                </div>

                <FilterSidebarContent
                  tripTypes={tripTypes}
                  setTripTypes={setTripTypes}
                  budgetBucket={budgetBucket}
                  setBudgetBucket={setBudgetBucket}
                  durationBucket={durationBucket}
                  setDurationBucket={setDurationBucket}
                  ageFilter={ageFilter}
                  setAgeFilter={setAgeFilter}
                  genderFilter={genderFilter}
                  setGenderFilter={setGenderFilter}
                  user={user}
                  activeAllFiltersCount={activeAllFiltersCount}
                  setVisibleCount={setVisibleCount}
                  syncUrl={syncUrl}
                />
              </div>
            </>
          )}

          <div className="min-w-0 flex-1">
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

            <AvailabilityDateNotice />

            {!loaded ? null : filtered.length === 0 ? (
              exploreTrips.length === 0 ? (
                <NoTripsYetState />
              ) : destination ? (
                <NoTripsForDestinationState
                  destination={destination}
                  otherTrips={otherLiveTrips}
                  onClearDestination={() => {
                    setDestination("");
                    syncUrl({ destination: "" });
                  }}
                />
              ) : (
                <EmptyState
                  onClearFilters={() => {
                    setDestination("");
                    setVerifiedOnly(false);
                    setCommunityOnly(false);
                    setMatchesMeOnly(false);
                    setTripTypes([]);
                    setBudgetBucket("");
                    setDurationBucket("");
                    setAgeFilter("");
                    setGenderFilter("any");
                    syncUrl({
                      destination: "",
                      verified: false,
                      community: false,
                      matchesMe: false,
                      types: [],
                      budget: "",
                      duration: "",
                      age: "",
                      gender: "any",
                    });
                  }}
                />
              )
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 min-[500px]:grid-cols-2 min-[900px]:grid-cols-3">
                  {visible.map((trip, i) => (
                    <ExploreTripCard key={trip.id} trip={trip} priority={i < 4} />
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
      </div>
    </div>
  );
}

function FilterSidebarContent({
  tripTypes,
  setTripTypes,
  budgetBucket,
  setBudgetBucket,
  durationBucket,
  setDurationBucket,
  ageFilter,
  setAgeFilter,
  genderFilter,
  setGenderFilter,
  user,
  activeAllFiltersCount,
  setVisibleCount,
  syncUrl,
}: {
  tripTypes: TripType[];
  setTripTypes: (v: TripType[]) => void;
  budgetBucket: string;
  setBudgetBucket: (v: string) => void;
  durationBucket: string;
  setDurationBucket: (v: string) => void;
  ageFilter: string;
  setAgeFilter: (v: string) => void;
  genderFilter: GenderFilter;
  setGenderFilter: (v: GenderFilter) => void;
  user: { dateOfBirth: string | null } | null;
  activeAllFiltersCount: number;
  setVisibleCount: (v: number) => void;
  syncUrl: (next: {
    types?: TripType[];
    budget?: string;
    duration?: string;
    age?: string;
    gender?: GenderFilter;
  }) => void;
}) {
  return (
    <>
      <div className="mb-4">
        <h3 className="mb-2 text-[11px] font-bold text-text-tertiary uppercase tracking-wide">Trip Type</h3>
        <div className="flex flex-wrap gap-2">
          {(["community", "partner"] as TripType[]).map((type) => (
            <FilterChip
              key={type}
              active={tripTypes.includes(type)}
              aria-pressed={tripTypes.includes(type)}
              onClick={() => {
                const next = tripTypes.includes(type)
                  ? tripTypes.filter((t) => t !== type)
                  : [...tripTypes, type];
                setTripTypes(next);
                setVisibleCount(PAGE_SIZE);
                syncUrl({ types: next });
              }}
            >
              {type === "partner" ? "Verified Partner" : "Community"}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 text-[11px] font-bold text-text-tertiary uppercase tracking-wide">Budget</h3>
        <div className="flex flex-col gap-1">
          {BUDGET_BUCKETS.map((bucket) => (
            <label
              key={bucket.label}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] hover:bg-surface-hover"
            >
              <input
                type="radio"
                name="budget-bucket"
                checked={budgetBucket === bucket.label}
                onChange={() => {
                  const next = budgetBucket === bucket.label ? "" : bucket.label;
                  setBudgetBucket(next);
                  setVisibleCount(PAGE_SIZE);
                  syncUrl({ budget: next });
                }}
              />
              {bucket.label}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 text-[11px] font-bold text-text-tertiary uppercase tracking-wide">Duration</h3>
        <div className="flex flex-col gap-1">
          {DURATION_BUCKETS.map((bucket) => (
            <label
              key={bucket.label}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] hover:bg-surface-hover"
            >
              <input
                type="radio"
                name="duration-bucket"
                checked={durationBucket === bucket.label}
                onChange={() => {
                  const next = durationBucket === bucket.label ? "" : bucket.label;
                  setDurationBucket(next);
                  setVisibleCount(PAGE_SIZE);
                  syncUrl({ duration: next });
                }}
              />
              {bucket.label}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 text-[11px] font-bold text-text-tertiary uppercase tracking-wide">Your Age</h3>
        <input
          type="number"
          min={MINIMUM_AGE}
          max={99}
          placeholder={user?.dateOfBirth ? String(ageFromDateOfBirth(user.dateOfBirth)) : `e.g. ${MINIMUM_AGE}`}
          value={ageFilter}
          onChange={(e) => {
            const next = e.target.value;
            setAgeFilter(next);
            setVisibleCount(PAGE_SIZE);
            syncUrl({ age: next });
          }}
          className="w-full rounded-lg border border-border-input px-3 py-2 text-[12.5px] outline-none focus:border-primary"
        />
        <p className="mt-1 text-[10.5px] text-text-muted">Only show trips whose age range includes this age.</p>
      </div>

      <div className="mb-1">
        <h3 className="mb-2 text-[11px] font-bold text-text-tertiary uppercase tracking-wide">Gender</h3>
        <div className="flex flex-wrap gap-2">
          {GENDER_FILTER_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={genderFilter === opt.value}
              aria-pressed={genderFilter === opt.value}
              onClick={() => {
                const next = genderFilter === opt.value ? "any" : opt.value;
                setGenderFilter(next);
                setVisibleCount(PAGE_SIZE);
                syncUrl({ gender: next });
              }}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {activeAllFiltersCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setTripTypes([]);
            setBudgetBucket("");
            setDurationBucket("");
            setAgeFilter("");
            setGenderFilter("any");
            setVisibleCount(PAGE_SIZE);
            syncUrl({ types: [], budget: "", duration: "", age: "", gender: "any" });
          }}
          className="mt-3 w-full rounded-lg border border-border-input px-3 py-2 text-[12px] font-semibold text-text-secondary hover:bg-surface-hover"
        >
          Clear these filters
        </button>
      )}
    </>
  );
}

/** Genuinely zero trips exist on the platform yet — distinct from "no
 * results for these filters" below, since clearing filters wouldn't help. */
function NoTripsYetState() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="mb-2 font-display text-lg font-bold">No trips yet</h2>
      <p className="mb-6 text-[13.5px] leading-relaxed text-text-tertiary">
        Be the first to plan a trip on GoTogether — it only takes a few minutes.
      </p>
      <AccentButton href="/create-trip">+ Create a Trip</AccentButton>
    </div>
  );
}

/** A destination search matched nothing — invite the visitor to be first to
 * plan a trip there, and keep other live trips visible right below rather
 * than dead-ending the page (per explicit product decision: don't hide
 * everything behind a "clear filters" click). */
function NoTripsForDestinationState({
  destination,
  otherTrips,
  onClearDestination,
}: {
  destination: string;
  otherTrips: ExploreTrip[];
  onClearDestination: () => void;
}) {
  return (
    <div>
      <div className="mx-auto max-w-md py-14 text-center">
        <h2 className="mb-2 font-display text-lg font-bold">
          No trips to {destination} yet
        </h2>
        <p className="mb-6 text-[13.5px] leading-relaxed text-text-tertiary">
          Be the first to plan one — it only takes a few minutes, and other
          travellers looking at {destination} will be able to find and join
          you.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <AccentButton href={`/create-trip?destination=${encodeURIComponent(destination)}`}>
            + Create a Trip to {destination}
          </AccentButton>
          <FilterChip className="px-5 py-2.5 font-semibold" onClick={onClearDestination}>
            Clear search
          </FilterChip>
        </div>
      </div>

      {otherTrips.length > 0 && (
        <div className="mt-4 border-t border-border-soft pt-10">
          <h3 className="mb-5 font-display text-base font-bold">
            Explore other live trips
          </h3>
          <div className="grid grid-cols-1 gap-5 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
            {otherTrips.slice(0, PAGE_SIZE).map((trip) => (
              <ExploreTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}
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
