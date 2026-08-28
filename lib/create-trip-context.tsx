"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, MINIMUM_AGE } from "@/lib/auth-context";
import { publishTrip } from "@/lib/real-trips";
import type { Database } from "@/lib/supabase/database.types";

export type TripGenderRestriction = Database["public"]["Enums"]["trip_gender_restriction"];
export type TripKind = Database["public"]["Enums"]["trip_kind"];

/**
 * Create Trip flow state, per the approved Create Trip Blueprint:
 * Concept A (Guided Multi-Step Flow) — Destination → Dates → Budget →
 * Title & Description → Review & Publish, with step-boundary autosave.
 *
 * There's no backend yet, so "Draft persisted server-side from the
 * Destination step onward" (blueprint's Draft/Interruption Handling) is
 * simulated with sessionStorage: it survives a refresh within the same
 * tab (matching the blueprint's "refresh is safe" requirement) without
 * pretending to survive a closed browser or a different device, which
 * would need a real backend. This is a frontend-only stand-in, not the
 * real mechanism — swapping to a real API is a drop-in replacement of
 * this file's persistence calls only.
 */

export type CreateTripFields = {
  // Community (default, any member) vs Partner (verified_partner — only
  // selectable when the organizer belongs to a company with
  // company_status = 'verified'; see lib/real-company.ts). companyId is
  // set alongside kind === "verified_partner" and cleared otherwise.
  kind: TripKind;
  companyId: string | null;
  destinationSlug: string | null;
  // Availability window: the range of days the trip could plausibly begin
  // (ISO yyyy-mm-dd), not a fixed start date — see the Aug 24 product
  // decision. Duration range: how many days the trip could run.
  availabilityStart: string;
  availabilityEnd: string;
  durationMin: number | null;
  durationMax: number | null;
  budgetChip: string | null;
  customBudget: string;
  // Verified Partner only: a confirmed departure/return date instead of
  // an availability window, and a fixed price (with an optional higher
  // originalPrice shown struck through) instead of a budget range. Left
  // empty/null for community trips.
  fixedStartDate: string;
  fixedEndDate: string;
  price: string;
  originalPrice: string;
  title: string;
  description: string;
  descriptionTouched: boolean;
  minGroup: number;
  maxGroup: number;
  // Who can join, per the Aug 24 18+/gender-preference product decision.
  // minAge can never be below MINIMUM_AGE (enforced both here client-side
  // and by the DB's trips_min_age_at_least_18 constraint).
  minAge: number;
  maxAge: number | null;
  genderRestriction: TripGenderRestriction;
};

const EMPTY_FIELDS: CreateTripFields = {
  kind: "community",
  companyId: null,
  destinationSlug: null,
  availabilityStart: "",
  availabilityEnd: "",
  durationMin: null,
  durationMax: null,
  budgetChip: null,
  customBudget: "",
  fixedStartDate: "",
  fixedEndDate: "",
  price: "",
  originalPrice: "",
  title: "",
  description: "",
  descriptionTouched: false,
  minGroup: 2,
  maxGroup: 6,
  minAge: MINIMUM_AGE,
  maxAge: null,
  genderRestriction: "any",
};

export const STEP_ORDER = ["destination", "dates", "budget", "details", "review"] as const;
export type StepKey = (typeof STEP_ORDER)[number];

export const STEP_LABELS: Record<StepKey, string> = {
  destination: "Destination",
  dates: "Dates",
  budget: "Budget",
  details: "Title & Description",
  review: "Review & Publish",
};

const STORAGE_KEY = "gotogether:create-trip-draft";

// The stored draft records which signed-in account it belongs to. Without
// this, resuming a draft after switching accounts in the same tab (log out
// of a company account, sign in as a personal one, land back on Create
// Trip with a stale sessionStorage draft) silently carries over
// kind: "verified_partner" / companyId from the PREVIOUS account — the new
// account then walks through the whole Partner flow with a company_id it
// has no real membership in, only failing at the final publish step with a
// confusing RLS error (see the Aug 28 investigation). Discarding a draft
// that belongs to a different account closes that hole at the source,
// alongside the server-side re-validation in lib/real-trips.ts/
// real-company.ts (belt-and-suspenders — the server-side check is the one
// that actually protects the database either way).

type CreateTripContextValue = {
  fields: CreateTripFields;
  update: (patch: Partial<CreateTripFields>) => void;
  furthestStepIndex: number;
  markStepComplete: (step: StepKey) => void;
  reset: () => void;
  published: boolean;
  publishedTripId: string | null;
  publishing: boolean;
  publishError: string | null;
  publish: () => Promise<void>;
};

const CreateTripContext = createContext<CreateTripContextValue | null>(null);

function loadDraft(): { fields: CreateTripFields; furthestStepIndex: number; ownerId: string | null } {
  if (typeof window === "undefined") {
    return { fields: EMPTY_FIELDS, furthestStepIndex: 0, ownerId: null };
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { fields: EMPTY_FIELDS, furthestStepIndex: 0, ownerId: null };
    const parsed = JSON.parse(raw);
    return {
      fields: { ...EMPTY_FIELDS, ...parsed.fields },
      furthestStepIndex: parsed.furthestStepIndex ?? 0,
      ownerId: parsed.ownerId ?? null,
    };
  } catch {
    return { fields: EMPTY_FIELDS, furthestStepIndex: 0, ownerId: null };
  }
}

export function CreateTripProvider({ children }: { children: ReactNode }) {
  // Lazy initializers read sessionStorage on first client render. This
  // component is only ever mounted client-side (CreateTripClient gates it
  // behind an auth check that itself only resolves in the browser), so
  // there's no SSR markup to mismatch against here.
  const { user } = useAuth();
  const initialDraft = useState(() => loadDraft())[0];
  const [fields, setFields] = useState<CreateTripFields>(initialDraft.fields);
  const [furthestStepIndex, setFurthestStepIndex] = useState<number>(initialDraft.furthestStepIndex);
  const [published, setPublished] = useState(false);
  const [publishedTripId, setPublishedTripId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const persist = useCallback(
    (nextFields: CreateTripFields, nextFurthest: number) => {
      if (typeof window === "undefined") return;
      try {
        window.sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ fields: nextFields, furthestStepIndex: nextFurthest, ownerId: user?.id ?? null })
        );
      } catch {
        // Storage unavailable (private browsing, quota) — the flow still
        // works in-memory for the current page load, matching the
        // blueprint's own "never blocks the flow" spirit for non-critical
        // persistence failures.
      }
    },
    [user]
  );

  // Auth resolves asynchronously (see auth-context.tsx), so the very first
  // render can't yet know whose account this is — loadDraft() runs before
  // that. Once `user` settles, discard a resumed draft that belongs to a
  // DIFFERENT account (or reconcile a legitimately-ownerless very first
  // draft) rather than silently letting stale kind/companyId fields ride
  // along under a new identity.
  useEffect(() => {
    if (!user) return;
    if (initialDraft.ownerId && initialDraft.ownerId !== user.id) {
      setFields(EMPTY_FIELDS);
      setFurthestStepIndex(0);
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    // Only needs to run once, right after the account is known — not on
    // every fields/furthestStepIndex change, which would fight `update`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const update = useCallback(
    (patch: Partial<CreateTripFields>) => {
      setFields((prev) => {
        const next = { ...prev, ...patch };
        persist(next, furthestStepIndex);
        return next;
      });
    },
    [persist, furthestStepIndex]
  );

  // Step-boundary autosave: called when a step's Continue is pressed,
  // matching the blueprint's "autosaved on each step's completion (not
  // continuously/silently)" rule.
  const markStepComplete = useCallback(
    (step: StepKey) => {
      const idx = STEP_ORDER.indexOf(step);
      setFurthestStepIndex((prev) => {
        const next = Math.max(prev, idx + 1);
        persist(fields, next);
        return next;
      });
    },
    [fields, persist]
  );

  const reset = useCallback(() => {
    setFields(EMPTY_FIELDS);
    setFurthestStepIndex(0);
    setPublished(false);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  const publish = useCallback(async () => {
    if (!user) {
      setPublishError("You need to be signed in to publish a trip.");
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      const tripId = await publishTrip(fields, user.id);
      setPublishedTripId(tripId);
      setPublished(true);
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Couldn't publish the trip. Try again.");
    } finally {
      setPublishing(false);
    }
  }, [fields, user]);

  const value = useMemo<CreateTripContextValue>(
    () => ({
      fields,
      update,
      furthestStepIndex,
      markStepComplete,
      reset,
      published,
      publishedTripId,
      publishing,
      publishError,
      publish,
    }),
    [fields, update, furthestStepIndex, markStepComplete, reset, published, publishedTripId, publishing, publishError, publish]
  );

  return <CreateTripContext.Provider value={value}>{children}</CreateTripContext.Provider>;
}

export function useCreateTrip() {
  const ctx = useContext(CreateTripContext);
  if (!ctx) throw new Error("useCreateTrip must be used within CreateTripProvider");
  return ctx;
}

export const BUDGET_CHIPS = [
  "Under ₹5,000",
  "₹5,000 – ₹10,000",
  "₹10,000 – ₹15,000",
  "₹15,000 – ₹25,000",
  "₹25,000+",
];

const MAX_CUSTOM_BUDGET = 500000;

export function isValidCustomBudget(value: string): boolean {
  if (!value.trim()) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= MAX_CUSTOM_BUDGET;
}

export { MAX_CUSTOM_BUDGET };

const MAX_PRICE = 500000;

/** Same shape of validation as isValidCustomBudget — a positive number up
 * to a sane ceiling. Used for the Verified Partner price field. */
export function isValidPrice(value: string): boolean {
  if (!value.trim()) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= MAX_PRICE;
}

/** originalPrice is optional, but if the organizer typed something it must
 * be a valid positive number strictly greater than price (otherwise
 * there's no real discount to show — see PriceTag). */
export function isValidOriginalPrice(value: string, price: string): boolean {
  if (!value.trim()) return true; // optional field
  const n = Number(value);
  const p = Number(price);
  return Number.isFinite(n) && n > 0 && n <= MAX_PRICE && Number.isFinite(p) && n > p;
}

export { MAX_PRICE };

/** Auto-generated description default, per the Trip Description spec —
 * "auto-generated from destination + duration + trip type... not an
 * invented AI-generation feature, simply the existing templated default."
 * Takes a duration range rather than a single day count, since trips no
 * longer commit to an exact length. */
export function generateDefaultDescription(
  destinationName: string,
  durationMin: number | null,
  durationMax: number | null
): string {
  let durationPart = "";
  if (durationMin && durationMax && durationMin !== durationMax) {
    durationPart = `${durationMin}–${durationMax}-day`;
  } else if (durationMin || durationMax) {
    durationPart = `${durationMin ?? durationMax}-day`;
  }
  return `A ${durationPart} trip to ${destinationName} — looking for fellow travellers to share the journey.`
    .replace(/\s+/g, " ")
    .trim();
}
