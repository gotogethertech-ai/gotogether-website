"use client";

import { useState } from "react";

const TOOLTIP_TEXT =
  "Business registration and GST verified by GoTogether. This does not guarantee individual trip quality or itinerary accuracy.";

/**
 * The single "Verified Partner" badge token, per the blueprint's Trust and
 * Verification spec: "stated once, consistently, in the badge tooltip
 * wherever the badge appears... never re-worded differently per page."
 * Hover reveals the tooltip on desktop; tap toggles it on touch, since
 * there's no hover-away to rely on there.
 */
export function VerifiedBadge({
  size = "default",
  showTooltip = true,
}: {
  size?: "default" | "small";
  showTooltip?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const padding = size === "small" ? "px-2 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10px]";

  if (!showTooltip) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md bg-partner-bg font-bold text-partner-fg whitespace-nowrap ${padding}`}>
        ✓ Verified Partner
      </span>
    );
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-expanded={open}
        aria-describedby="verified-badge-tooltip"
        className={`inline-flex items-center gap-1 rounded-md bg-partner-bg font-bold text-partner-fg whitespace-nowrap ${padding}`}
      >
        ✓ Verified Partner <span aria-hidden="true">ⓘ</span>
      </button>
      {open && (
        <div
          id="verified-badge-tooltip"
          role="tooltip"
          className="absolute top-full left-0 z-20 mt-1.5 w-[240px] rounded-xl bg-[oklch(20%_0.01_255)] px-3.5 py-3 text-[11px] leading-relaxed text-white shadow-[0_12px_32px_-8px_oklch(20%_0.02_255/0.35)]"
        >
          {TOOLTIP_TEXT}
        </div>
      )}
    </span>
  );
}
