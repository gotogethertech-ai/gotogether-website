/**
 * Shared horizontal scroll-row wrapper, per the Destinations Blueprint's
 * critique fix: "should now definitively become one shared ScrollRow
 * component rather than a fourth separate implementation." Used for the
 * Popular-from-Delhi-NCR rail and Related Destinations row; a thin,
 * unopinionated wrapper so each caller still controls its own item sizing.
 */
export function ScrollRow({
  children,
  ariaLabel,
  className = "",
}: {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      className={`rail flex gap-3.5 overflow-x-auto pb-1 ${className}`}
    >
      {children}
    </div>
  );
}
