"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "gotogether:availability-notice-dismissed";

/**
 * Explains that the date shown on community trip cards/details is an
 * AVAILABILITY WINDOW the trip could start within — not a confirmed
 * journey start/end date — since travellers kept reading e.g. "Aug 24 –
 * Aug 31" as fixed dates even after the "Available" label was added.
 * Verified Partner trips (fixed_start_date/fixed_end_date) don't need
 * this explanation — their dates ARE confirmed — so callers only render
 * this banner on pages showing community trips.
 *
 * Dismissible, remembered per-device via localStorage: once closed it
 * stays closed on that browser, matching the pattern already used for
 * lightweight per-viewer UI state elsewhere in the app (e.g. saved-trip
 * toggles). Not tied to the signed-in account — a signed-out visitor
 * dismissing it shouldn't need to see it again either, and this needs no
 * backend round trip.
 */
export function AvailabilityDateNotice({ compact = false }: { compact?: boolean }) {
  const [dismissed, setDismissed] = useState(true); // default hidden until we know localStorage says otherwise, avoiding a flash

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable (private browsing, quota) — default to
      // showing the notice each visit rather than hiding it forever.
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Non-fatal — the notice just won't stay dismissed across visits.
    }
  }

  if (dismissed) return null;

  if (compact) {
    // Single-line variant for tight spots (e.g. beside a trip detail
    // page's meta row) where the full explanatory sentence would crowd
    // the layout — same meaning, condensed.
    return (
      <div
        role="note"
        className="mb-3 flex items-center gap-2 rounded-lg bg-[oklch(94%_0.05_255)] px-3 py-2 text-[11.5px] text-[oklch(30%_0.14_255)]"
      >
        <span aria-hidden="true">ℹ️</span>
        <p className="flex-1">
          This date is when the trip is <strong>available to start</strong>, not a confirmed itinerary.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this notice"
          className="-m-1 flex-none rounded-md p-1 text-[oklch(30%_0.14_255)]/70 hover:bg-black/5"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      role="note"
      className="mx-auto mb-4 flex max-w-(--section-max-width) items-start gap-2.5 rounded-xl bg-[oklch(94%_0.05_255)] px-4 py-3 text-[12.5px] leading-relaxed text-[oklch(30%_0.14_255)]"
    >
      <span aria-hidden="true" className="mt-[1px]">
        ℹ️
      </span>
      <p className="flex-1">
        The date on a trip is when it&apos;s <strong>available to start</strong> — not a confirmed journey start
        and end date. The organizer and group settle exact travel dates together once you join.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss this notice"
        className="-m-1 flex-none rounded-md p-1 text-[oklch(30%_0.14_255)]/70 hover:bg-black/5"
      >
        ✕
      </button>
    </div>
  );
}
