import type { ButtonHTMLAttributes, ReactNode } from "react";

type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  active?: boolean;
  emphasized?: boolean;
};

/**
 * Quick-filter / sort / "All Filters" chip. Per Explore Blueprint: active
 * state = filled light-blue bg + blue border/text; emphasized (e.g. "All
 * Filters") = blue border + text without the fill.
 */
export function FilterChip({
  children,
  active = false,
  emphasized = false,
  className = "",
  ...rest
}: FilterChipProps) {
  return (
    <button
      className={`flex flex-none items-center gap-1.5 rounded-full border px-4 py-2.5 text-[12.5px] font-medium whitespace-nowrap font-sans ${
        active
          ? "border-[oklch(70%_0.1_255)] bg-[oklch(93%_0.05_255)] text-[oklch(45%_0.16_255)]"
          : emphasized
            ? "border-[oklch(70%_0.1_255)] bg-surface font-semibold text-[oklch(45%_0.16_255)]"
            : "border-border-input bg-surface text-text-secondary hover:bg-surface-hover"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
