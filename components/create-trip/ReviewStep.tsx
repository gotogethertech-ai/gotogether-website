"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { StepShell } from "./StepShell";
import { useCreateTrip, type StepKey } from "@/lib/create-trip-context";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";
import { formatTripTiming } from "@/lib/trip-dates";

/**
 * Step 5 — Review & Publish, per "GoTogether Create Trip - Review Step"
 * visual spec: summary rows with per-field Edit links routing to the
 * specific originating step, filled-vs-skipped distinction on optionals
 * (critique fix), single Publish action, in-button spinner + idempotent
 * disable against double-submit.
 */
export function ReviewStep({
  onBack,
  onEditStep,
  onPublish,
}: {
  onBack: () => void;
  onEditStep: (step: StepKey) => void;
  onPublish: () => Promise<void>;
}) {
  const { fields, markStepComplete, publishing, publishError } = useCreateTrip();

  const [destinations, setDestinations] = useState<AdminDestinationRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    getDestinations().then((rows) => {
      if (!cancelled) setDestinations(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const destination = fields.destinationSlug ? destinations.find((d) => d.slug === fields.destinationSlug) : undefined;
  const timing = formatTripTiming({
    availabilityStart: fields.availabilityStart || null,
    availabilityEnd: fields.availabilityEnd || null,
    durationMin: fields.durationMin,
    durationMax: fields.durationMax,
  });
  const budgetLabel =
    fields.budgetChip === "Custom"
      ? `₹${Number(fields.customBudget || 0).toLocaleString("en-IN")}`
      : fields.budgetChip ?? "—";

  const groupIsDefault = fields.minGroup === 2 && fields.maxGroup === 6;

  async function handlePublish() {
    if (publishing) return; // guards against double-submit
    markStepComplete("review");
    await onPublish();
  }

  return (
    <StepShell
      step="review"
      title="Review & publish"
      subtitle="You can add itinerary, accommodation, and more after publishing."
      onBack={onBack}
      onContinue={handlePublish}
      continueLabel={publishing ? "Publishing…" : "Publish Trip"}
      continueDisabled={publishing}
    >
      <div className="mb-2 flex items-start gap-3.5">
        {destination?.cover_image_url && (
          <div className="relative h-[72px] w-24 flex-none overflow-hidden rounded-xl bg-surface-hover">
            <Image src={destination.cover_image_url} alt={destination.name} fill sizes="96px" className="object-cover" />
          </div>
        )}
        <div className="flex-1">
          <div className="mb-1 text-[15px] font-bold">{fields.title || "Untitled trip"}</div>
          <div className="text-[11.5px] text-text-muted">{destination?.name ?? "—"}</div>
        </div>
        <EditLink onClick={() => onEditStep("destination")} />
      </div>

      <Row label="Availability" value={timing} onEdit={() => onEditStep("dates")} />
      <Row
        label="Budget"
        value={
          <>
            {budgetLabel} <span className="font-normal text-text-muted">(estimate)</span>
          </>
        }
        onEdit={() => onEditStep("budget")}
      />
      <Row
        label="Description"
        value={fields.description || "—"}
        valueClassName="text-[12.5px] font-normal leading-relaxed"
        onEdit={() => onEditStep("details")}
      />
      <Row
        label="Group size"
        value={
          <>
            Up to {fields.maxGroup} travellers{" "}
            {groupIsDefault && (
              <span className="rounded-md bg-[oklch(94%_0.002_255)] px-1.5 py-0.5 text-[9.5px] font-bold text-text-muted">
                Default
              </span>
            )}
          </>
        }
        editLabel={groupIsDefault ? "Add" : "Edit"}
        onEdit={() => onEditStep("details")}
      />
      <Row
        label="Photos"
        value="No photos added — a category photo will be shown"
        valueClassName="text-[12.5px] font-normal text-text-muted"
        editLabel="Add"
        onEdit={() => onEditStep("details")}
        last
      />

      <div className="mt-5 rounded-xl bg-surface-tint px-4 py-3 text-[11.5px] leading-relaxed text-text-tertiary">
        This is an estimate to help travellers decide — GoTogether does not collect payments for community trips.
      </div>

      {publishError && (
        <p role="alert" aria-live="polite" className="mt-3 text-[12px] font-medium text-danger">
          {publishError}
        </p>
      )}
    </StepShell>
  );
}

function Row({
  label,
  value,
  valueClassName = "",
  editLabel = "Edit",
  onEdit,
  last = false,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  editLabel?: string;
  onEdit: () => void;
  last?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 py-3.5 ${last ? "" : "border-b border-border-divider"}`}>
      <div className="flex-1">
        <div className="mb-0.5 text-[10.5px] text-text-muted">{label}</div>
        <div className={`text-[13.5px] font-semibold ${valueClassName}`}>{value}</div>
      </div>
      <EditLink label={editLabel} onClick={onEdit} />
    </div>
  );
}

function EditLink({ label = "Edit", onClick }: { label?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex-none text-xs font-semibold text-primary">
      {label}
    </button>
  );
}
