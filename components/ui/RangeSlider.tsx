"use client";

import { useCallback, useId, useRef } from "react";

/**
 * Two-handle range slider — used for Create/Edit Trip's availability window
 * and duration range (see the Aug 24 product decision: trips carry a
 * range, not a fixed start date, so nearly-identical plans a day apart
 * still match). Built on two overlaid native `<input type="range">`
 * elements rather than a custom pointer-drag implementation, so keyboard
 * control (arrow keys, Tab), screen readers, and touch all work for free.
 *
 * min/max/step operate on plain numbers — callers map dates to/from day
 * offsets (see DatesStep.tsx) since a native range input has no date mode.
 */
export function RangeSlider({
  label,
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  minGap = 0,
  onChange,
  formatValue,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  /** Smallest allowed gap between the two handles, in the same units as min/max. */
  minGap?: number;
  onChange: (next: { min: number; max: number }) => void;
  /** Formats a raw value for the on-slider labels, e.g. a day offset -> "25 Aug". */
  formatValue: (value: number) => string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const minId = useId();
  const maxId = useId();

  const pctFor = useCallback(
    (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100),
    [min, max]
  );

  function handleMinChange(raw: number) {
    const next = Math.min(raw, valueMax - minGap);
    onChange({ min: Math.max(min, next), max: valueMax });
  }

  function handleMaxChange(raw: number) {
    const next = Math.max(raw, valueMin + minGap);
    onChange({ min: valueMin, max: Math.min(max, next) });
  }

  const minPct = pctFor(valueMin);
  const maxPct = pctFor(valueMax);

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-text-tertiary">{label}</span>
        <span className="text-[12.5px] font-semibold text-text-primary">
          {formatValue(valueMin)} – {formatValue(valueMax)}
        </span>
      </div>

      <div ref={trackRef} className="relative h-9">
        {/* Base track */}
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-surface-tint" />
        {/* Selected range highlight */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${minPct}%`, width: `${Math.max(0, maxPct - minPct)}%` }}
        />

        <label htmlFor={minId} className="sr-only">
          {label} — minimum
        </label>
        <input
          id={minId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          className="range-thumb pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent"
          style={{ zIndex: valueMin >= max - minGap ? 5 : 3 }}
        />

        <label htmlFor={maxId} className="sr-only">
          {label} — maximum
        </label>
        <input
          id={maxId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          className="range-thumb pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent"
          style={{ zIndex: 4 }}
        />
      </div>

      <style jsx>{`
        .range-thumb {
          pointer-events: none;
        }
        .range-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: white;
          border: 2.5px solid var(--color-primary);
          box-shadow: 0 1px 4px oklch(20% 0.02 255 / 0.25);
          cursor: pointer;
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: white;
          border: 2.5px solid var(--color-primary);
          box-shadow: 0 1px 4px oklch(20% 0.02 255 / 0.25);
          cursor: pointer;
        }
        .range-thumb::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          background: transparent;
        }
        .range-thumb::-moz-range-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
