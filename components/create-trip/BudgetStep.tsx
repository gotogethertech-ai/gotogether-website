"use client";

import { StepShell } from "./StepShell";
import {
  useCreateTrip,
  BUDGET_CHIPS,
  isValidCustomBudget,
  MAX_CUSTOM_BUDGET,
  isValidPrice,
  isValidOriginalPrice,
  MAX_PRICE,
} from "@/lib/create-trip-context";

/**
 * Step 3 — Budget, per the blueprint's Budget spec: chip ranges or Custom
 * amount, always framed as a non-binding estimate, currency-formatted
 * input with a soft ceiling (critique fixes #8/#9), never a payment field.
 *
 * Verified Partner trips get a different flow entirely: a real fixed
 * price (this is a paid, professionally-run trip, not an estimate) plus
 * an optional higher "original price" shown struck through — the
 * slash-pricing discount display, e.g. ₹9,999 ₹7,999.
 */
export function BudgetStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const { fields, update, markStepComplete } = useCreateTrip();
  const isPartner = fields.kind === "verified_partner";

  const usingCustom = fields.budgetChip === "Custom";
  const customError = usingCustom && fields.customBudget && !isValidCustomBudget(fields.customBudget)
    ? Number(fields.customBudget) > MAX_CUSTOM_BUDGET
      ? `Enter an amount up to ₹${MAX_CUSTOM_BUDGET.toLocaleString("en-IN")}`
      : "Enter a positive amount"
    : "";

  const priceError = fields.price && !isValidPrice(fields.price)
    ? Number(fields.price) > MAX_PRICE
      ? `Enter an amount up to ₹${MAX_PRICE.toLocaleString("en-IN")}`
      : "Enter a positive amount"
    : "";
  const originalPriceError = fields.originalPrice && !isValidOriginalPrice(fields.originalPrice, fields.price)
    ? "Original price must be higher than the actual price"
    : "";

  const communityValid = usingCustom ? isValidCustomBudget(fields.customBudget) : !!fields.budgetChip;
  const partnerValid = isValidPrice(fields.price) && isValidOriginalPrice(fields.originalPrice, fields.price);
  const valid = isPartner ? partnerValid : communityValid;

  function selectChip(chip: string) {
    update({ budgetChip: chip, customBudget: chip === "Custom" ? fields.customBudget : "" });
  }

  function handleContinue() {
    if (!valid) return;
    markStepComplete("budget");
    onContinue();
  }

  if (isPartner) {
    return (
      <StepShell
        step="budget"
        title="Set the trip price"
        subtitle="This is the real price travellers pay to join. Add an original price to show it as a discount."
        onBack={onBack}
        onContinue={handleContinue}
        continueDisabled={!valid}
        hasUnsavedInput={!!fields.price || !!fields.originalPrice}
      >
        <div className="mb-5">
          <label htmlFor="trip-price" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
            Price per traveller
          </label>
          <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-border-input px-3.5 py-1 focus-within:border-primary">
            <span className="text-sm font-semibold text-text-secondary">₹</span>
            <input
              id="trip-price"
              type="text"
              inputMode="numeric"
              value={fields.price}
              onChange={(e) => update({ price: e.target.value.replace(/[^\d]/g, "") })}
              placeholder="7,999"
              aria-invalid={!!priceError}
              className="flex-1 border-none py-3 text-sm outline-none"
            />
          </div>
          {priceError && (
            <p role="alert" aria-live="polite" className="mt-1.5 text-[11px] font-medium text-danger">
              {priceError}
            </p>
          )}
        </div>

        <div className="mb-2">
          <label htmlFor="trip-original-price" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
            Original price <span className="font-normal text-text-muted">(optional — shown struck through)</span>
          </label>
          <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-border-input px-3.5 py-1 focus-within:border-primary">
            <span className="text-sm font-semibold text-text-secondary">₹</span>
            <input
              id="trip-original-price"
              type="text"
              inputMode="numeric"
              value={fields.originalPrice}
              onChange={(e) => update({ originalPrice: e.target.value.replace(/[^\d]/g, "") })}
              placeholder="9,999"
              aria-invalid={!!originalPriceError}
              className="flex-1 border-none py-3 text-sm outline-none"
            />
          </div>
          {originalPriceError && (
            <p role="alert" aria-live="polite" className="mt-1.5 text-[11px] font-medium text-danger">
              {originalPriceError}
            </p>
          )}
          {!originalPriceError && fields.price && fields.originalPrice && isValidOriginalPrice(fields.originalPrice, fields.price) && (
            <p className="mt-1.5 text-[11.5px] text-trust-fg">
              Travellers will see ₹{Number(fields.originalPrice).toLocaleString("en-IN")}{" "}
              <span className="line-through">struck through</span> next to ₹{Number(fields.price).toLocaleString("en-IN")}.
            </p>
          )}
        </div>
      </StepShell>
    );
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
