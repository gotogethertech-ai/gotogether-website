"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { AccentButton } from "@/components/ui/Button";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";

/**
 * Homepage hero search — picks from the curated, admin-managed destination
 * list (same source as Explore's picker) rather than free text, then routes
 * to /explore?destination=... where ExploreClient does the real filtering.
 * Density over breadth: users choose from the Launch Tier list instead of
 * typing an uncommon place we don't have trips for yet.
 */
export function HeroSearch() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<AdminDestinationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getDestinations().then((rows) => {
      if (!cancelled) setDestinations(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function go(destination: string) {
    setOpen(false);
    router.push(destination ? `/explore?destination=${encodeURIComponent(destination)}` : "/explore");
  }

  return (
    <div ref={ref} className="relative mb-3 max-w-[460px]">
      <div className="flex items-center gap-2 rounded-full border border-border-input bg-surface py-1.5 pr-1.5 pl-5 shadow-[0_4px_16px_-6px_oklch(20%_0.02_255/0.1)]">
        <SearchIcon size={18} className="flex-none self-center text-text-muted" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex-1 py-1.5 text-left text-sm font-sans text-text-muted data-[has-value=true]:text-text-primary"
          data-has-value={Boolean(value)}
        >
          {value || "Where do you want to go?"}
        </button>
        <AccentButton size="sm" onClick={() => go(value)}>
          Explore
        </AccentButton>
      </div>

      {open && (
        <ul
          role="listbox"
          aria-label="Destinations"
          className="absolute top-[calc(100%+6px)] left-0 z-20 max-h-[320px] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-[0_12px_32px_-8px_oklch(20%_0.02_255/0.18)]"
        >
          {destinations.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === d.name}
                onClick={() => {
                  setValue(d.name);
                  go(d.name);
                }}
                className={`block w-full rounded-lg px-3 py-2.5 text-left text-[13px] hover:bg-surface-hover ${
                  value === d.name ? "font-semibold text-primary" : ""
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
  );
}
