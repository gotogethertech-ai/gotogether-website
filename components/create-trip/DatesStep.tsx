"use client";

import { useMemo } from "react";
import { StepShell } from "./StepShell";
import { useCreateTrip } from "@/lib/create-trip-context";
import { RangeSlider } from "@/components/ui/RangeSlider";

const WINDOW_DAYS = 120; // ~4 months out, a rolling window from today
const DURATION_MIN_DAYS = 1;
const DURATION_MAX_DAYS = 14;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOffset(base: string, iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - new Date(base).getTime()) / 86400000));
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Step 2 — Availability, replacing the old Fixed/Flexible exact-date step.
 * Per the Aug 24 product decision: a trip doesn't commit to one start date
 * or one length. The host instead drags two range sliders — when the trip
 * could plausibly begin (availability window) and how long it could run
 * (duration range) — so two travellers a day or two apart on their own
 * plans still see the trip as a match instead of missing each other over
 * an exact date that was never load-bearing to begin with.
 */
export function DatesStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const { fields, update, markStepComplete } = useCreateTrip();
  const today = useMemo(() => todayIso(), []);
  const windowEnd = useMemo(() => addDays(today, WINDOW_DAYS), [today]);

  // Default the window/duration in once, the first time this step is
  // reached with nothing set yet, so the sliders start somewhere sensible
  // rather than both handles pinned to day 0.
  const availabilityStart = fields.availabilityStart || today;
  const availabilityEnd = fields.availabilityEnd || addDays(today, 7);
  const durationMin = fields.durationMin ?? 4;
  const durationMax = fields.durationMax ?? 6;

  const valid = !!fields.availabilityStart && !!fields.availabilityEnd && !!fields.durationMin && !!fields.durationMax;

  function handleContinue() {
    // Commit the defaults if the host never touched a slider, so Continue
    // always leaves fields fully populated.
    if (!valid) {
      update({ availabilityStart, availabilityEnd, durationMin, durationMax });
    }
    markStepComplete("dates");
    onContinue();
  }

  return (
    <StepShell
      step="dates"
      title="When could you go?"
      subtitle="Drag to set a window rather than one fixed date — travellers whose own plans fall inside it can still join, even if they're a day or two off."
      onBack={onBack}
      onContinue={handleContinue}
      continueDisabled={false}
      hasUnsavedInput={!!fields.availabilityStart || !!fields.durationMin}
    >
      <div className="mb-8">
        <RangeSlider
          label="AVAILABILITY WINDOW"
          min={0}
          max={dayOffset(today, windowEnd)}
          valueMin={dayOffset(today, availabilityStart)}
          valueMax={dayOffset(today, availabilityEnd)}
          minGap={0}
          onChange={({ min, max }) =>
            update({ availabilityStart: addDays(today, min), availabilityEnd: addDays(today, max) })
          }
          formatValue={(offset) => formatShort(addDays(today, offset))}
        />
        <p className="mt-2 text-[11.5px] text-text-tertiary">
          The trip could begin any day in this range — not a fixed departure date.
        </p>
      </div>

      <div>
        <RangeSlider
          label="DURATION"
          min={DURATION_MIN_DAYS}
          max={DURATION_MAX_DAYS}
          valueMin={durationMin}
          valueMax={durationMax}
          minGap={0}
          onChange={({ min, max }) => update({ durationMin: min, durationMax: max })}
          formatValue={(days) => `${days} day${days === 1 ? "" : "s"}`}
        />
        <p className="mt-2 text-[11.5px] text-text-tertiary">
          How long the trip could run — travellers planning anywhere in this range can join.
        </p>
      </div>
    </StepShell>
  );
}
