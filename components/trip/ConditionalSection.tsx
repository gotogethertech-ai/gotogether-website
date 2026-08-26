import type { ReactNode } from "react";

/**
 * Wraps an optional trip-detail section (Group Preferences, Itinerary,
 * Logistics, Packing List, Rules). Per the blueprint: hidden completely
 * when empty, never rendered as an empty/greyed-out placeholder, and never
 * an accordion since there's nothing to hide by default.
 */
export function ConditionalSection({
  title,
  id,
  children,
  last = false,
}: {
  title: string;
  id?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section
      id={id}
      className={`py-7 ${last ? "" : "border-b border-border-divider"}`}
    >
      <h2 className="mb-3 font-display text-[19px] font-bold">{title}</h2>
      {children}
    </section>
  );
}
