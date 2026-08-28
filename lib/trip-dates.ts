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

// ---------------------------------------------------------------------
// Urgency badge — "2 spots left" / "2 days left" shown on trip cards and
// the detail page (Aug 28 product decision). A trip qualifies once either
// runs low: spots remaining out of max_group_size, or days remaining
// until the trip closes to new joiners (availability_end for community
// trips, fixed_end_date for Verified Partner trips — same "closes at the
// end of the window" cutoff used to filter stale trips off browse
// surfaces, see lib/real-explore-shared.ts's fetchLiveTrips). When both
// qualify, spots-left wins — running out of room is the harder deadline,
// since a trip can still theoretically be joined right up to its last
// day but not once it's full.
const URGENCY_SPOTS_THRESHOLD = 3;
const URGENCY_DAYS_THRESHOLD = 3;

export type UrgencyBadge = { kind: "spots" | "days"; value: number };

/** `deadlineDate` is the ISO date the trip stops accepting new joiners
 * (availability_end / fixed_end_date) — pass null when unknown/unset. */
export function getUrgencyBadge(params: {
  joinedCount: number | null | undefined;
  maxGroupSize: number | null | undefined;
  deadlineDate: string | null | undefined;
}): UrgencyBadge | null {
  const { joinedCount, maxGroupSize, deadlineDate } = params;

  if (maxGroupSize && maxGroupSize > 0) {
    const spotsLeft = maxGroupSize - (joinedCount ?? 0);
    if (spotsLeft > 0 && spotsLeft <= URGENCY_SPOTS_THRESHOLD) {
      return { kind: "spots", value: spotsLeft };
    }
  }

  if (deadlineDate) {
    const daysLeft = Math.ceil((new Date(deadlineDate).getTime() - Date.now()) / 86400000);
    if (daysLeft >= 0 && daysLeft <= URGENCY_DAYS_THRESHOLD) {
      return { kind: "days", value: daysLeft };
    }
  }

  return null;
}

/** "2 spots left" / "1 spot left" / "Today" / "1 day left" / "2 days left". */
export function formatUrgencyBadge(badge: UrgencyBadge): string {
  if (badge.kind === "spots") {
    return `${badge.value} spot${badge.value === 1 ? "" : "s"} left`;
  }
  if (badge.value === 0) return "Last day to join";
  return `${badge.value} day${badge.value === 1 ? "" : "s"} left`;
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

/** "25 Aug – 30 Aug" (both set), a single day, or "Dates TBD" — for
 * Verified Partner trips' confirmed departure (fixed_start_date /
 * fixed_end_date), as opposed to Community trips' flexible
 * formatAvailabilityWindow() range. */
export function formatFixedDates(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates TBD";
  if (start && end && start !== end) return `${shortDate(start)} – ${shortDate(end)}`;
  return shortDate((start ?? end) as string);
}

function formatInr(n: number): string {
  // No decimals for whole-rupee prices (the overwhelmingly common case);
  // falls back to 2dp only when a price actually carries paise, so a
  // ₹7999.00 row never renders as "₹7,999.00" for no reason.
  const hasFraction = !Number.isInteger(n);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: hasFraction ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** Plain "₹7,999" price string, or null when unset. */
export function formatPrice(price: number | null): string | null {
  if (price === null || price === undefined) return null;
  return formatInr(price);
}

/** Discount percentage off original_price, e.g. 20 for a ₹9,999 → ₹7,999
 * cut. null when there's no real discount to show (original_price unset,
 * or not actually higher than price). */
export function discountPercent(price: number | null, originalPrice: number | null): number | null {
  if (!price || !originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/** Dates display string for a trip-list row (ExploreTripCard/PartnerTripCard/
 * TripCard), branching on kind so callers building an ExploreTrip don't
 * each duplicate the fixed-vs-availability decision: Verified Partner
 * trips show their confirmed fixed_start_date/fixed_end_date, community
 * trips keep the flexible availability window + duration. */
export function formatTripListingDates(t: {
  kind: "community" | "verified_partner";
  availabilityStart: string | null;
  availabilityEnd: string | null;
  durationMin: number | null;
  durationMax: number | null;
  fixedStartDate: string | null;
  fixedEndDate: string | null;
}): string {
  if (t.kind === "verified_partner") {
    return formatFixedDates(t.fixedStartDate, t.fixedEndDate);
  }
  return formatTripTiming({
    availabilityStart: t.availabilityStart,
    availabilityEnd: t.availabilityEnd,
    durationMin: t.durationMin,
    durationMax: t.durationMax,
  });
}

/** Budget/price display string for a trip-list row, same kind-branch as
 * formatTripListingDates: Verified Partner trips show their fixed price
 * (plain, no discount badge — that's PriceTag's job on cards with room
 * for it), community trips keep the budget_min/budget_max range. */
export function formatTripListingBudget(t: {
  kind: "community" | "verified_partner";
  budgetMin: number | null;
  budgetMax: number | null;
  price: number | null;
}): string {
  if (t.kind === "verified_partner") {
    return formatPrice(t.price) ?? "—";
  }
  if (t.budgetMin && t.budgetMax && t.budgetMin !== t.budgetMax) {
    return `₹${t.budgetMin.toLocaleString("en-IN")}–${t.budgetMax.toLocaleString("en-IN")}`;
  }
  const n = t.budgetMax ?? t.budgetMin;
  return n ? `₹${n.toLocaleString("en-IN")}` : "—";
}
