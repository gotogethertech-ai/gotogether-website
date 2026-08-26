/**
 * Shared trip timing helpers — trips no longer carry a fixed start_date/
 * end_date. Instead a trip has an availability window (availability_start /
 * availability_end: the range of days it could plausibly begin) and a
 * duration range (duration_min / duration_max: how many days it could
 * run), both set via two-handle sliders in Create Trip / Edit Trip.
 *
 * Rationale: a fixed date means two nearly-identical trips (one leaving
 * the 27th, one the 28th) never match even though either traveller could
 * flex by a day. A range represents what people actually mean when they
 * say "I'm free around then, for about that long" — see the Aug 24
 * discussion. This file is the single place every trip-list/detail/chat/
 * admin screen formats that range for display, replacing the ~6 duplicated
 * formatDateRange/formatShort/formatDuration helpers that existed when
 * trips still had exact dates.
 */

export type TripTiming = {
  availabilityStart: string | null; // ISO yyyy-mm-dd
  availabilityEnd: string | null;
  durationMin: number | null;
  durationMax: number | null;
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "25–30 Aug" (window), "28 Aug" (single day / exact), or "Dates TBD". */
export function formatAvailabilityWindow(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates TBD";
  if (start && end && start !== end) return `${shortDate(start)} – ${shortDate(end)}`;
  return shortDate((start ?? end) as string);
}

/** "4–6 days", "5 days", or "" if unset. */
export function formatDurationRange(min: number | null, max: number | null): string {
  if (!min && !max) return "";
  if (min && max && min !== max) return `${min}–${max} days`;
  const n = max ?? min;
  return n ? `${n} day${n === 1 ? "" : "s"}` : "";
}

/** Combined "25–30 Aug · 4–6 days" for trip cards/lists — omits the
 * duration segment when unset rather than showing a dangling separator. */
export function formatTripTiming(t: TripTiming): string {
  const window = formatAvailabilityWindow(t.availabilityStart, t.availabilityEnd);
  const duration = formatDurationRange(t.durationMin, t.durationMax);
  return duration ? `${window} · ${duration}` : window;
}

/** Days from now until the window opens — negative once the window has
 * started, used for "in N days" countdowns. Infinity when unset (sorts
 * last). */
export function daysUntilAvailabilityStart(availabilityStart: string | null): number {
  if (!availabilityStart) return Infinity;
  return Math.round((new Date(availabilityStart).getTime() - Date.now()) / 86400000);
}

type GenderRestriction = "any" | "women_only" | "men_only";

/** "Mixed group" / "Women only" / "Men only" — single source of truth for
 * the gender_restriction label, replacing the copy that used to be
 * hand-duplicated in the admin Create Trip dialog and DetailsStep. */
export function genderRestrictionLabel(g: GenderRestriction | null | undefined): string {
  if (g === "women_only") return "Women only";
  if (g === "men_only") return "Men only";
  return "Mixed group";
}

/** "22–30" / "22+" / "Up to 30" / null (no restriction set) — the age
 * range a trip's organizer chose, for display on trip cards/detail. */
export function formatAgeRange(minAge: number | null, maxAge: number | null): string | null {
  if (minAge && maxAge) return `${minAge}–${maxAge}`;
  if (minAge) return `${minAge}+`;
  if (maxAge) return `Up to ${maxAge}`;
  return null;
}
