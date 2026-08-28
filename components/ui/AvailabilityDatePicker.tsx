"use client";

/**
 * Two labeled native date inputs for a trip's availability window —
 * replaces the old two-handle drag slider (RangeSlider) for this one
 * field specifically, per the Aug 28 product decision: a slider makes it
 * hard to land on an exact date and gives no way to type one in, while
 * the trip's actual meaning ("earliest it could start" / "latest it
 * could start") maps directly onto two plain date pickers. The DURATION
 * range (how many days the trip runs) stays a slider elsewhere — that's
 * a day-count, not a pair of calendar dates, so a date picker doesn't fit
 * it the same way.
 *
 * Used by every surface that sets availability_start/availability_end:
 * Create Trip (DatesStep), Host Management's Edit tab, and both admin
 * Create/Edit Trip dialogs.
 */
export function AvailabilityDatePicker({
  startDate,
  endDate,
  minDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  /** Earliest selectable date for both fields — normally today. */
  minDate: string;
  onChange: (next: { start: string; end: string }) => void;
}) {
  return (
    <div>
      <span className="mb-2.5 block text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
        Availability window
      </span>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="availability-start" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
            Earliest start date
          </label>
          <input
            id="availability-start"
            type="date"
            min={minDate}
            value={startDate}
            onChange={(e) => {
              const start = e.target.value;
              // Keep the end date valid — never earlier than the newly
              // chosen start, same clamping DatesStep's fixed-date inputs
              // already do for partner trips.
              const end = endDate && endDate < start ? start : endDate;
              onChange({ start, end });
            }}
            className="w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="availability-end" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
            Latest start date
          </label>
          <input
            id="availability-end"
            type="date"
            min={startDate || minDate}
            value={endDate}
            onChange={(e) => onChange({ start: startDate, end: e.target.value })}
            className="w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}
