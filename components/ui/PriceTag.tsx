import { formatPrice, discountPercent } from "@/lib/trip-dates";

/**
 * Verified Partner price display — plain "₹7,999" when there's no
 * discount, or a struck-through original price next to the real price
 * plus a "20% off" badge when the organizer set a higher original_price.
 * Renders nothing when price itself is unset (community trips, or a
 * partner trip mid-draft) — falling back to a budget range is the
 * caller's job, not this component's.
 */
export function PriceTag({
  price,
  originalPrice,
  size = "md",
}: {
  price: number | null;
  originalPrice?: number | null;
  size?: "sm" | "md";
}) {
  const priceLabel = formatPrice(price);
  if (!priceLabel) return null;
  const originalLabel = formatPrice(originalPrice ?? null);
  const percentOff = discountPercent(price, originalPrice ?? null);

  const priceClass = size === "sm" ? "text-[13px] font-bold" : "text-lg font-bold";
  const originalClass = size === "sm" ? "text-[11px]" : "text-[13px]";
  const badgeClass = size === "sm" ? "text-[9.5px] px-1.5 py-0.5" : "text-[10.5px] px-2 py-0.5";

  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      <span className={`${priceClass} text-text-primary`}>{priceLabel}</span>
      {originalLabel && percentOff !== null && (
        <>
          <span className={`${originalClass} text-text-muted line-through`}>{originalLabel}</span>
          <span className={`inline-flex items-center rounded-md bg-[oklch(94%_0.09_25)] font-bold text-[oklch(45%_0.18_25)] ${badgeClass}`}>
            {percentOff}% off
          </span>
        </>
      )}
    </span>
  );
}
