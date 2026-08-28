import { getUrgencyBadge, formatUrgencyBadge } from "@/lib/trip-dates";

/** Small red-tinted pill for "2 spots left" / "2 days left" — rendered
 * only when the trip actually qualifies (see getUrgencyBadge's
 * thresholds). Absolutely positioned by callers that put it over the
 * card image; laid out inline by callers (e.g. the detail page) that
 * place it alongside other meta. */
export function UrgencyBadge({
  joinedCount,
  maxGroupSize,
  deadlineDate,
  className = "",
}: {
  joinedCount: number | null | undefined;
  maxGroupSize: number | null | undefined;
  deadlineDate: string | null | undefined;
  className?: string;
}) {
  const badge = getUrgencyBadge({ joinedCount, maxGroupSize, deadlineDate });
  if (!badge) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-[oklch(96%_0.03_25)] px-2 py-0.5 text-[9.5px] font-bold text-[oklch(45%_0.15_25)] ${className}`}
    >
      🔥 {formatUrgencyBadge(badge)}
    </span>
  );
}
