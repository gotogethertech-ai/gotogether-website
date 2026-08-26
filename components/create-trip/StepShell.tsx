"use client";

import { useState } from "react";
import { STEP_ORDER, type StepKey, STEP_LABELS } from "@/lib/create-trip-context";

type StepShellProps = {
  step: StepKey;
  title: string;
  subtitle?: string;
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  children: React.ReactNode;
  /** Whether the current step has any unsaved input, per Exit/Cancel
   * Behavior: "only when the current step has unsaved input... if the
   * current step is untouched/empty, no warning is needed at all." */
  hasUnsavedInput?: boolean;
};

/**
 * Shared shell for every Create Trip step, per the Create Trip Blueprint's
 * "Reusable components confirmed" list: CreateTripStepShell (progress bar +
 * docked CTA + back/exit header). One component for desktop and mobile —
 * the blueprint explicitly rejects structural device divergence (560px
 * centered form at every breakpoint).
 */
export function StepShell({
  step,
  title,
  subtitle,
  onBack,
  onContinue,
  continueLabel,
  continueDisabled = false,
  children,
  hasUnsavedInput = false,
}: StepShellProps) {
  const stepIndex = STEP_ORDER.indexOf(step);
  const isFirstStep = stepIndex === 0;
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  function handleBackClick() {
    if (isFirstStep && hasUnsavedInput) {
      setShowExitConfirm(true);
      return;
    }
    onBack();
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="mx-auto w-full max-w-[640px] flex-1 px-8 pb-[100px] max-[599px]:px-4">
        <div className="flex items-center gap-4 py-5">
          <button
            aria-label={isFirstStep ? "Exit trip creation" : "Back to previous step"}
            onClick={handleBackClick}
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-surface-hover text-text-secondary hover:bg-border-soft"
          >
            {isFirstStep ? "✕" : "←"}
          </button>
          <div className="flex flex-1 gap-1.5" role="img" aria-label={`Step ${stepIndex + 1} of ${STEP_ORDER.length}: ${STEP_LABELS[step]}`}>
            {STEP_ORDER.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-border-input"}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="flex-none text-[11px] text-text-muted" aria-hidden="true">
            {stepIndex + 1} of {STEP_ORDER.length}
          </div>
        </div>

        <h1 className="mb-2 font-display text-[26px] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mb-5 text-[13px] text-text-tertiary">{subtitle}</p>}

        {children}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-border-divider bg-surface px-8 py-3.5 max-[599px]:px-4">
        <div className="flex w-full max-w-[640px] justify-end">
          <button
            onClick={onContinue}
            disabled={continueDisabled}
            className="rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-[oklch(88%_0.01_255)] disabled:text-[oklch(60%_0.01_255)]"
          >
            {continueLabel ?? "Continue"}
          </button>
        </div>
      </div>

      {showExitConfirm && (
        <ExitConfirmDialog
          onCancel={() => setShowExitConfirm(false)}
          onConfirm={() => {
            setShowExitConfirm(false);
            onBack();
          }}
        />
      )}
    </div>
  );
}

/**
 * Precise, non-overstated exit warning per the blueprint's Exit/Cancel
 * Behavior: names exactly what would be lost (current step only), never a
 * blanket "unsaved changes" warning that overstates the risk.
 */
function ExitConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <button
        aria-label="Dismiss"
        onClick={onCancel}
        className="absolute inset-0 bg-[oklch(20%_0.01_255/0.45)]"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Leave trip creation?"
        className="relative w-full max-w-[360px] rounded-2xl bg-surface p-6 shadow-[0_24px_60px_-12px_oklch(20%_0.02_255/0.35)]"
      >
        <h2 className="mb-2 font-display text-base font-bold">Leave trip creation?</h2>
        <p className="mb-5 text-[12.5px] leading-relaxed text-text-secondary">
          Your progress up to this step is saved. Leaving now will lose this step&apos;s changes.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-[13px] font-semibold text-text-secondary hover:bg-surface-hover"
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-danger px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
