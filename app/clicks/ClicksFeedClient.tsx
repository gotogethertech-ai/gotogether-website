"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AccentButton } from "@/components/ui/Button";
import { ClickCard } from "@/components/clicks/ClickCard";
import { CLICK_TRIP_TYPES } from "@/lib/real-clicks";
import { getClicksFeedPage, type ClickDiscoveryFilter, type ClickListItem } from "@/lib/real-clicks-feed";
import { useAuth } from "@/lib/auth-context";

const FILTER_CHIPS: { label: string; filter: ClickDiscoveryFilter }[] = [
  { label: "All", filter: { kind: "all" } },
  { label: "Trekking", filter: { kind: "trip_type", tripType: "trekking" } },
  { label: "Beach", filter: { kind: "trip_type", tripType: "beach" } },
  { label: "Road Trip", filter: { kind: "trip_type", tripType: "road_trip" } },
  { label: "Solo", filter: { kind: "trip_type", tripType: "solo" } },
  { label: "Weekend", filter: { kind: "trip_type", tripType: "weekend" } },
];

/**
 * Clicks feed — spec sections 2, 15, 28, 29: recent published Clicks
 * first (no scoring/recommendation algorithm yet), simple trip-type
 * filter chips, a destination search box, and cursor-based infinite
 * scroll (IntersectionObserver on a sentinel div triggers the next page,
 * rather than a "Load more" click — spec explicitly asks for the former
 * with the latter as an acceptable fallback; the observer approach also
 * degrades safely to "just never loads more" if IntersectionObserver is
 * unavailable, rather than breaking anything).
 */
export function ClicksFeedClient() {
  const { requireAuth } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<ClickDiscoveryFilter>({ kind: "all" });
  const [searchInput, setSearchInput] = useState("");
  const [items, setItems] = useState<ClickListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadFirstPage = useCallback(async (filter: ClickDiscoveryFilter) => {
    setLoading(true);
    const page = await getClicksFeedPage(filter, null);
    setItems(page.items);
    setCursor(page.nextCursor);
    setHasMore(page.nextCursor !== null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFirstPage(activeFilter);
  }, [activeFilter, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    const page = await getClicksFeedPage(activeFilter, cursor);
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setHasMore(page.nextCursor !== null);
    setLoadingMore(false);
  }, [activeFilter, cursor, hasMore, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActiveFilter(searchInput.trim() ? { kind: "destination", query: searchInput.trim() } : { kind: "all" });
  }

  function handleCreateClick() {
    requireAuth("create a Click", () => router.push("/clicks/create"));
  }

  return (
    <>
      <Header activePath="/clicks" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[720px] px-6 py-8 max-[599px]:px-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">Clicks</h1>
              <p className="text-[13px] text-text-tertiary">Travel stories from real GoTogether trips</p>
            </div>
            <AccentButton onClick={handleCreateClick}>+ Create Click</AccentButton>
          </div>

          <form onSubmit={handleSearchSubmit} className="mb-4">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Clicks by destination (e.g. Manali)"
              className="w-full rounded-full border border-border-input px-4 py-2.5 text-[13px] focus:border-primary focus:outline-none"
            />
          </form>

          <div className="mb-6 flex flex-wrap gap-2">
            {FILTER_CHIPS.map((chip) => {
              const active =
                activeFilter.kind === chip.filter.kind &&
                (chip.filter.kind !== "trip_type" || (activeFilter as { tripType?: string }).tripType === chip.filter.tripType);
              return (
                <button
                  key={chip.label}
                  onClick={() => {
                    setSearchInput("");
                    setActiveFilter(chip.filter);
                  }}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold ${
                    active ? "border-primary bg-primary text-white" : "border-border text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="py-16 text-center text-[13px] text-text-muted">Loading Clicks…</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl bg-surface-tint px-6 py-14 text-center">
              <p className="mb-4 text-[13.5px] text-text-tertiary">
                {activeFilter.kind === "all" ? "No Clicks yet — be the first to share a travel story." : "No Clicks match this filter yet."}
              </p>
              <AccentButton onClick={handleCreateClick}>+ Create Click</AccentButton>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {items.map((click) => (
                <ClickCard key={click.id} click={click} />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-1" />
          {loadingMore && <div className="py-6 text-center text-[12.5px] text-text-muted">Loading more…</div>}
          {!hasMore && items.length > 0 && <div className="py-6 text-center text-[12px] text-text-muted">You&apos;ve reached the end</div>}
        </div>
      </main>
      <Footer />
    </>
  );
}
