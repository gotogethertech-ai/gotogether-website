"use client";

import { StepShell } from "./StepShell";
import { useCreateTrip, BUDGET_CHIPS, isValidCustomBudget, MAX_CUSTOM_BUDGET } from "@/lib/create-trip-context";

/**
 * Step 3 — Budget, per the blueprint's Budget spec: chip ranges or Custom
 * amount, always framed as a non-binding estimate, currency-formatted
 * input with a soft ceiling (critique fixes #8/#9), never a payment field.
 */
export function BudgetStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const { fields, update, markStepComplete } = useCreateTrip();

  const usingCustom = fields.budgetChip === "Custom";
  const customError = usingCustom && fields.customBudget && !isValidCustomBudget(fields.customBudget)
    ? Number(fields.customBudget) > MAX_CUSTOM_BUDGET
      ? `Enter an amount up to ₹${MAX_CUSTOM_BUDGET.toLocaleString("en-IN")}`
      : "Enter a positive amount"
    : "";

  const valid = usingCustom ? isValidCustomBudget(fields.customBudget) : !!fields.budgetChip;

  function selectChip(chip: string) {
    update({ budgetChip: chip, customBudget: chip === "Custom" ? fields.customBudget : "" });
  }

  function handleContinue() {
    if (!valid) return;
    markStepComplete("budget");
    onContinue();
  }

  return (
    <StepShell
      step="budget"
      title="What's the estimated budget?"
      subtitle="This is an estimate to help travellers decide — not a payment. GoTogether does not collect payments for community trips."
      onBack={onBack}
      onContinue={handleContinue}
      continueDisabled={!valid}
      hasUnsavedInput={!!fields.budgetChip || !!fields.customBudget}
    >
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Budget range">
        {BUDGET_CHIPS.map((chip) => {
          const isSelected = fields.budgetChip === chip;
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={isSelected}
              onClick={() => selectChip(chip)}
              className={`min-h-[44px] rounded-full border px-4 py-2.5 text-[12.5px] font-medium ${
                isSelected
                  ? "border-primary bg-primary text-white"
                  : "border-border-input bg-white text-text-primary hover:bg-surface-hover"
              }`}
            >
              {chip}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={usingCustom}
          onClick={() => selectChip("Custom")}
          className={`min-h-[44px] rounded-full border px-4 py-2.5 text-[12.5px] font-medium ${
            usingCustom
              ? "border-primary bg-primary text-white"
              : "border-border-input bg-white text-text-primary hover:bg-surface-hover"
          }`}
        >
          Custom
        </button>
      </div>

      {usingCustom && (
        <div className="mb-2">
          <label htmlFor="custom-budget" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
            Custom amount
          </label>
          <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-border-input px-3.5 py-1 focus-within:border-primary">
            <span className="text-sm font-semibold text-text-secondary">₹</span>
            <input
              id="custom-budget"
              type="text"
              inputMode="numeric"
              value={fields.customBudget}
              onChange={(e) => update({ customBudget: e.target.value.replace(/[^\d]/g, "") })}
              placeholder="12,000"
              aria-invalid={!!customError}
              className="flex-1 border-none py-3 text-sm outline-none"
            />
          </div>
          {customError && (
            <p role="alert" aria-live="polite" className="mt-1.5 text-[11px] font-medium text-danger">
              {customError}
            </p>
          )}
        </div>
      )}
    </StepShell>
  );
}
