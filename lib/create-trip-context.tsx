"use client";

import {
  createContext,
  useCallback,
  useContext,
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

function loadDraft(): { fields: CreateTripFields; furthestStepIndex: number } {
  if (typeof window === "undefined") {
    return { fields: EMPTY_FIELDS, furthestStepIndex: 0 };
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { fields: EMPTY_FIELDS, furthestStepIndex: 0 };
    const parsed = JSON.parse(raw);
    return {
      fields: { ...EMPTY_FIELDS, ...parsed.fields },
      furthestStepIndex: parsed.furthestStepIndex ?? 0,
    };
  } catch {
    return { fields: EMPTY_FIELDS, furthestStepIndex: 0 };
  }
}

export function CreateTripProvider({ children }: { children: ReactNode }) {
  // Lazy initializers read sessionStorage on first client render. This
  // component is only ever mounted client-side (CreateTripClient gates it
  // behind an auth check that itself only resolves in the browser), so
  // there's no SSR markup to mismatch against here.
  const { user } = useAuth();
  const [fields, setFields] = useState<CreateTripFields>(() => loadDraft().fields);
  const [furthestStepIndex, setFurthestStepIndex] = useState<number>(() => loadDraft().furthestStepIndex);
  const [published, setPublished] = useState(false);
  const [publishedTripId, setPublishedTripId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const persist = useCallback((nextFields: CreateTripFields, nextFurthest: number) => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ fields: nextFields, furthestStepIndex: nextFurthest })
      );
    } catch {
      // Storage unavailable (private browsing, quota) — the flow still
      // works in-memory for the current page load, matching the
      // blueprint's own "never blocks the flow" spirit for non-critical
      // persistence failures.
    }
  }, []);

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
