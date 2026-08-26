"use client";

import { useEffect, useState } from "react";
import { StepShell } from "./StepShell";
import { useCreateTrip, generateDefaultDescription, type TripGenderRestriction } from "@/lib/create-trip-context";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";
import { MINIMUM_AGE } from "@/lib/auth-context";

const TITLE_MIN = 5;
const TITLE_MAX = 60;
const DESC_MAX = 300;
const DESC_COUNTER_THRESHOLD = 30; // counter appears within ~30 chars of the limit

const GENDER_OPTIONS: { value: TripGenderRestriction; label: string }[] = [
  { value: "any", label: "Mixed" },
  { value: "women_only", label: "Women Only" },
  { value: "men_only", label: "Men Only" },
];

/**
 * Step 4 — Title & Description, per the blueprint's Trip Description spec:
 * 300-char cap enforced by the input itself, live counter appearing near
 * the limit, auto-generated default (templated, not invented AI), title
 * spam heuristic (rejects pure-numeric/URL input).
 */
export function DetailsStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const { fields, update, markStepComplete } = useCreateTrip();
  const [destinations, setDestinations] = useState<AdminDestinationRow[]>([]);
  const destination = fields.destinationSlug ? destinations.find((d) => d.slug === fields.destinationSlug) : undefined;

  useEffect(() => {
    let cancelled = false;
    getDestinations().then((rows) => {
      if (!cancelled) setDestinations(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Populate the auto-generated default once, the first time this step is
  // reached with an empty description — never overwrites something the
  // host already typed (descriptionTouched guards that).
  useEffect(() => {
    if (!fields.description && !fields.descriptionTouched && destination) {
      update({ description: generateDefaultDescription(destination.name, fields.durationMin, fields.durationMax) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.slug]);

  const titleTrimmed = fields.title.trim();
  const titleTooShort = titleTrimmed.length > 0 && titleTrimmed.length < TITLE_MIN;
  const looksLikeSpam = /^\d+$/.test(titleTrimmed) || /^https?:\/\//i.test(titleTrimmed);
  const titleError = looksLikeSpam
    ? "Give your trip a descriptive title, not just numbers or a link"
    : titleTooShort
      ? `Title must be at least ${TITLE_MIN} characters`
      : "";

  const descRemaining = DESC_MAX - fields.description.length;
  const showDescCounter = descRemaining <= DESC_COUNTER_THRESHOLD;

  const minAge = fields.minAge ?? MINIMUM_AGE;
  const maxAge = fields.maxAge;
  const ageBelowMinimum = minAge < MINIMUM_AGE;
  const ageRangeInvalid = maxAge != null && maxAge < minAge;
  const ageError = ageBelowMinimum
    ? `Minimum age can't be less than ${MINIMUM_AGE}`
    : ageRangeInvalid
      ? "Maximum age can't be less than minimum age"
      : "";

  const valid =
    titleTrimmed.length >= TITLE_MIN &&
    titleTrimmed.length <= TITLE_MAX &&
    !looksLikeSpam &&
    fields.description.trim().length > 0 &&
    !ageError;

  function handleContinue() {
    if (!valid) return;
    markStepComplete("details");
    onContinue();
  }

  return (
    <StepShell
      step="details"
      title="Give your trip a title"
      subtitle="We've drafted a description from your destination and dates — feel free to edit it."
      onBack={onBack}
      onContinue={handleContinue}
      continueDisabled={!valid}
      hasUnsavedInput={!!fields.title || fields.descriptionTouched}
    >
      <label htmlFor="trip-title" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
        Trip title
      </label>
      <input
        id="trip-title"
        value={fields.title}
        onChange={(e) => update({ title: e.target.value.slice(0, TITLE_MAX) })}
        placeholder="Weekend Escape to Manali"
        aria-invalid={!!titleError}
        className={`mb-1 w-full rounded-xl border-[1.5px] px-3.5 py-3.5 text-sm outline-none ${
          titleError ? "border-danger" : "border-border-input focus:border-primary"
        }`}
      />
      <div className="mb-5 flex items-center justify-between">
        {titleError ? (
          <p role="alert" aria-live="polite" className="text-[11px] font-medium text-danger">
            {titleError}
          </p>
        ) : (
          <span />
        )}
        <span className="text-[10.5px] text-text-muted">{titleTrimmed.length}/{TITLE_MAX}</span>
      </div>

      <label htmlFor="trip-description" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
        Description
      </label>
      <p className="mb-2 text-[11.5px] text-text-muted">
        Mention what you&apos;re planning and what kind of travellers you&apos;re looking for.
      </p>
      <textarea
        id="trip-description"
        value={fields.description}
        onChange={(e) =>
          update({ description: e.target.value.slice(0, DESC_MAX), descriptionTouched: true })
        }
        rows={5}
        className="w-full resize-none rounded-xl border-[1.5px] border-border-input px-3.5 py-3.5 text-sm outline-none focus:border-primary"
      />
      {showDescCounter && (
        <div className="mt-1.5 text-right text-[10.5px] text-text-muted" aria-live="polite">
          {descRemaining} characters left
        </div>
      )}

      <div className="mt-6 border-t border-border pt-6">
        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
          Who can join
        </label>
        <p className="mb-2.5 text-[11.5px] text-text-muted">
          GoTogether requires everyone to be {MINIMUM_AGE}+ — set a narrower age range if you want.
        </p>
        <div className="mb-4 flex gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ genderRestriction: opt.value })}
              className={`flex-1 rounded-xl border-[1.5px] px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
                fields.genderRestriction === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-input text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label htmlFor="trip-min-age" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Min age
            </label>
            <input
              id="trip-min-age"
              type="number"
              min={MINIMUM_AGE}
              max={99}
              value={minAge}
              onChange={(e) => update({ minAge: Number(e.target.value) || MINIMUM_AGE })}
              className={`w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none ${
                ageError ? "border-danger" : "border-border-input focus:border-primary"
              }`}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="trip-max-age" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Max age (optional)
            </label>
            <input
              id="trip-max-age"
              type="number"
              min={MINIMUM_AGE}
              max={99}
              value={maxAge ?? ""}
              placeholder="No limit"
              onChange={(e) => update({ maxAge: e.target.value ? Number(e.target.value) : null })}
              className={`w-full rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none ${
                ageError ? "border-danger" : "border-border-input focus:border-primary"
              }`}
            />
          </div>
        </div>
        {ageError && (
          <p role="alert" aria-live="polite" className="mt-1.5 text-[11px] font-medium text-danger">
            {ageError}
          </p>
        )}
      </div>
    </StepShell>
  );
}
