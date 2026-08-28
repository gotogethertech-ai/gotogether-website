"use client";

import { useMemo } from "react";
import { StepShell } from "./StepShell";
import { useCreateTrip } from "@/lib/create-trip-context";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { AvailabilityDatePicker } from "@/components/ui/AvailabilityDatePicker";

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
  const isPartner = fields.kind === "verified_partner";

  // Default the window/duration in once, the first time this step is
  // reached with nothing set yet, so the sliders start somewhere sensible
  // rather than both handles pinned to day 0.
  const availabilityStart = fields.availabilityStart || today;
  const availabilityEnd = fields.availabilityEnd || addDays(today, 7);
  const durationMin = fields.durationMin ?? 4;
  const durationMax = fields.durationMax ?? 6;

  const communityValid =
    !!fields.availabilityStart && !!fields.availabilityEnd && !!fields.durationMin && !!fields.durationMax;
  const partnerValid =
    !!fields.fixedStartDate && !!fields.fixedEndDate && fields.fixedEndDate >= fields.fixedStartDate;
  const valid = isPartner ? partnerValid : true; // community always auto-fills defaults below

  function handleContinue() {
    if (isPartner) {
      if (!partnerValid) return;
    } else if (!communityValid) {
      // Commit the defaults if the host never touched a slider, so
      // Continue always leaves fields fully populated.
      update({ availabilityStart, availabilityEnd, durationMin, durationMax });
    }
    markStepComplete("dates");
    onContinue();
  }

  if (isPartner) {
    return (
      <StepShell
        step="dates"
        title="When does this trip depart?"
        subtitle="Verified Partner trips run on a confirmed, fixed schedule — not a flexible window like community trips."
        onBack={onBack}
        onContinue={handleContinue}
        continueDisabled={!valid}
        hasUnsavedInput={!!fields.fixedStartDate || !!fields.fixedEndDate}
      >
        <div className="mb-5">
          <label htmlFor="fixed-start" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
            Departure date
          </label>
          <input
            id="fixed-start"
            type="date"
            min={today}
            value={fields.fixedStartDate}
            onChange={(e) =>
              update({
                fixedStartDate: e.target.value,
                fixedEndDate: fields.fixedEndDate && fields.fixedEndDate < e.target.value ? "" : fields.fixedEndDate,
              })
            }
            className="w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="fixed-end" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
            Return date
          </label>
          <input
            id="fixed-end"
            type="date"
            min={fields.fixedStartDate || today}
            value={fields.fixedEndDate}
            onChange={(e) => update({ fixedEndDate: e.target.value })}
            disabled={!fields.fixedStartDate}
            className="w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary disabled:bg-surface-tint disabled:text-text-muted"
          />
        </div>
        <p className="mt-4 text-[11.5px] text-text-tertiary">
          Travellers see these exact dates — there&apos;s no flexible window for partner trips.
        </p>
      </StepShell>
    );
  }

  return (
    <StepShell
      step="dates"
      title="When could you go?"
      subtitle="Set a window rather than one fixed date — travellers whose own plans fall inside it can still join, even if they're a day or two off."
      onBack={onBack}
      onContinue={handleContinue}
      continueDisabled={false}
      hasUnsavedInput={!!fields.availabilityStart || !!fields.durationMin}
    >
      <div className="mb-8">
        <AvailabilityDatePicker
          startDate={availabilityStart}
          endDate={availabilityEnd}
          minDate={today}
          onChange={({ start, end }) => update({ availabilityStart: start, availabilityEnd: end })}
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
