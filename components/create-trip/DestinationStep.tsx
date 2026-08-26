"use client";

import { useEffect, useMemo, useState } from "react";
import { StepShell } from "./StepShell";
import { SearchIcon } from "@/components/icons";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";
import { useCreateTrip } from "@/lib/create-trip-context";
import { getMyCompany, type MyCompany } from "@/lib/real-company";

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  mountains: { label: "MOUNTAINS", emoji: "🏔️" },
  beaches: { label: "BEACHES", emoji: "🏖️" },
  heritage: { label: "HERITAGE", emoji: "🏛️" },
  adventure: { label: "ADVENTURE", emoji: "🧗" },
};

/**
 * Step 1 — Destination, per "GoTogether Create Trip - Destination Step"
 * visual spec: instant-suggest search, "Popular" + category-grouped
 * browsing, curated-list-only selection (no free text). The catalog is now
 * the real, admin-managed public.destinations table (see the admin
 * Destinations screen) instead of a hardcoded list, so every destination
 * admin adds is immediately selectable here.
 */
export function DestinationStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const { fields, update, markStepComplete } = useCreateTrip();
  const [query, setQuery] = useState("");
  const [destinations, setDestinations] = useState<AdminDestinationRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [myCompany, setMyCompany] = useState<MyCompany | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDestinations().then((rows) => {
      if (!cancelled) {
        setDestinations(rows);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Partner is only offered when the organizer belongs to a verified
  // company — everyone else only ever sees Community (no picker at all).
  useEffect(() => {
    let cancelled = false;
    getMyCompany().then((c) => {
      if (!cancelled) setMyCompany(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canCreatePartnerTrip = myCompany?.status === "verified";

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return destinations.filter((d) => d.name.toLowerCase().includes(q));
  }, [destinations, query]);

  // No explicit "popular" flag on the real table — the first few by
  // sort_order (the admin-controlled Launch Tier ordering) stand in for it.
  const popular = useMemo(() => destinations.slice(0, 6), [destinations]);

  const byCategory = useMemo(() => {
    const map = new Map<string, AdminDestinationRow[]>();
    for (const d of destinations) {
      const key = d.category ?? "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [destinations]);

  function select(d: AdminDestinationRow) {
    update({ destinationSlug: d.slug });
    setQuery("");
  }

  function handleContinue() {
    if (!fields.destinationSlug) return;
    markStepComplete("destination");
    onContinue();
  }

  return (
    <StepShell
      step="destination"
      title="Where's your next adventure?"
      subtitle="Choose a destination from our curated list — this helps us match you with the right travellers."
      onBack={onBack}
      onContinue={handleContinue}
      continueDisabled={!fields.destinationSlug}
      hasUnsavedInput={!!fields.destinationSlug || query.length > 0}
    >
      {canCreatePartnerTrip && (
        <div className="mb-6">
          <div className="mb-2.5 text-[11px] font-semibold tracking-wide text-text-muted">TRIP TYPE</div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={fields.kind === "community"}
              onClick={() => update({ kind: "community", companyId: null })}
              className={`flex-1 rounded-xl border px-4 py-3 text-left text-[12.5px] font-semibold ${
                fields.kind === "community"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border-input bg-white text-text-primary hover:bg-surface-hover"
              }`}
            >
              Community
              <div className="mt-0.5 text-[11px] font-normal text-text-muted">Organized by you, free to join</div>
            </button>
            <button
              type="button"
              aria-pressed={fields.kind === "verified_partner"}
              onClick={() => update({ kind: "verified_partner", companyId: myCompany?.id ?? null })}
              className={`flex-1 rounded-xl border px-4 py-3 text-left text-[12.5px] font-semibold ${
                fields.kind === "verified_partner"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border-input bg-white text-text-primary hover:bg-surface-hover"
              }`}
            >
              Partner
              <div className="mt-0.5 text-[11px] font-normal text-text-muted">Run by {myCompany?.name}</div>
            </button>
          </div>
        </div>
      )}

      <label htmlFor="destination-search" className="sr-only">
        Search destinations
      </label>
      <div className="mb-2 flex items-center gap-2 rounded-full border border-border-input bg-surface-tint px-4.5 py-3.5">
        <SearchIcon size={16} className="flex-none text-text-muted" />
        <input
          id="destination-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search destinations"
          className="flex-1 border-none bg-transparent text-[13.5px] outline-none"
          role="combobox"
          aria-expanded={searchResults.length > 0}
          aria-controls="destination-search-results"
        />
      </div>

      <div className="mb-6 rounded-xl bg-[oklch(94%_0.05_255)] px-3.5 py-2.5 text-[11.5px] text-[oklch(30%_0.14_255)]">
        📍 Trips currently start from Delhi NCR. More departure cities coming soon.
      </div>

      {!loaded ? (
        <p className="mb-6 text-[13px] text-text-tertiary">Loading destinations…</p>
      ) : query.trim() ? (
        <div id="destination-search-results">
          {searchResults.length > 0 ? (
            <ChipGroup label="SEARCH RESULTS" items={searchResults} selected={fields.destinationSlug} onSelect={select} />
          ) : (
            <p className="mb-6 text-[13px] text-text-tertiary">
              No destinations match &ldquo;{query}&rdquo; — browse by category below.
            </p>
          )}
        </div>
      ) : (
        <ChipGroup label="🔥 POPULAR" items={popular} selected={fields.destinationSlug} onSelect={select} />
      )}

      {[...byCategory.entries()].map(([key, items]) => {
        const meta = CATEGORY_META[key] ?? { label: key.toUpperCase(), emoji: "📍" };
        return (
          <ChipGroup
            key={key}
            label={`${meta.emoji} ${meta.label}`}
            items={items}
            selected={fields.destinationSlug}
            onSelect={select}
          />
        );
      })}
    </StepShell>
  );
}

function ChipGroup({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string;
  items: AdminDestinationRow[];
  selected: string | null;
  onSelect: (d: AdminDestinationRow) => void;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2.5 text-[11px] font-semibold tracking-wide text-text-muted">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((d) => {
          const isSelected = selected === d.slug;
          return (
            <button
              key={d.slug}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(d)}
              className={`min-h-[44px] rounded-full border px-3.5 py-2.5 text-[12.5px] font-medium whitespace-nowrap ${
                isSelected
                  ? "border-primary bg-primary text-white"
                  : "border-border-input bg-white text-text-primary hover:bg-surface-hover"
              }`}
            >
              {d.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
