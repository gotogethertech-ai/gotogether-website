"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { CloseIcon } from "@/components/icons";
import { OtpBoxes } from "./OtpBoxes";
import { useAuth } from "@/lib/auth-context";

/**
 * Modal (desktop/tablet-landscape) that becomes a full-screen sheet
 * (tablet-portrait/mobile) — Concept B from the Authentication Blueprint,
 * one consistent component instead of two structurally different ones.
 */
export function AuthModal() {
  const { modalState, actions } = useAuth();
  const { open, step, phone, label } = modalState;
  const dialogRef = useRef<HTMLDivElement>(null);
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [sending, setSending] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [resent, setResent] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (step !== "otp" || resendSeconds <= 0) return;
    const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendSeconds]);

  // Local form state is reset directly by whichever action actually closes
  // the modal (handleClose, or a successful verify) rather than by
  // reacting to `open` becoming false in an effect — the modal component
  // stays mounted (rendering null) between opens, so this is the only
  // reset point that matters.
  function resetLocalState() {
    setPhoneValue("");
    setPhoneError("");
    setOtpError("");
    setResendSeconds(30);
    setResent(false);
    setNameValue("");
    setSavingName(false);
  }

  function handleClose() {
    actions.close();
    resetLocalState();
  }

  if (!open) return null;

  const formattedPhone = phoneValue.length > 5 ? `${phoneValue.slice(0, 5)} ${phoneValue.slice(5)}` : phoneValue;
  const isValidPhone = /^\d{10}$/.test(phoneValue);

  function handleSendCode() {
    if (!isValidPhone) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    setPhoneError("");
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      actions.submitPhone(phoneValue);
      setResendSeconds(30);
    }, 500);
  }

  async function handleOtpComplete() {
    // Mock verification: OtpBoxes only calls this once all 6 digits are
    // filled, and the frontend-only phase accepts any complete code as
    // valid (see auth-context.tsx) — there's no real OTP service to
    // reject against yet. The shake/error path stays wired up (unused
    // for now) so it's a one-line swap once real verification exists.
    setVerifying(true);
    setOtpError("");
    await new Promise((r) => setTimeout(r, 400));
    setVerifying(false);
    await actions.verifyOtp();
    resetLocalState();
  }

  function handleResend() {
    if (resendSeconds > 0) return;
    setResendSeconds(30);
    setResent(true);
    actions.resend();
    setTimeout(() => setResent(false), 2500);
  }

  const maskedPhone = phone.length === 10 ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : `+91 ${phone}`;
  const actionCopy = label
    ? `Verify your phone to ${label}`
    : "Verify your phone to continue";

  const isValidName = nameValue.trim().length >= 2 && nameValue.trim().length <= 50;

  async function handleSubmitName() {
    if (!isValidName) return;
    setSavingName(true);
    await new Promise((r) => setTimeout(r, 400));
    setSavingName(false);
    actions.submitName(nameValue.trim());
    resetLocalState();
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        aria-label="Close authentication dialog"
        onClick={handleClose}
        className="absolute inset-0 bg-[oklch(20%_0.01_255/0.45)]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          step === "phone"
            ? "Enter your phone number"
            : step === "otp"
              ? "Enter the code"
              : "One more thing"
        }
        className="absolute inset-x-0 bottom-0 flex max-h-[92vh] w-full flex-col rounded-t-[20px] bg-surface p-7 pb-6 shadow-[0_24px_60px_-12px_oklch(20%_0.02_255/0.35)] min-[600px]:inset-0 min-[600px]:m-auto min-[600px]:h-fit min-[600px]:max-w-[420px] min-[600px]:rounded-[20px]"
      >
        <button
          aria-label="Close"
          onClick={handleClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-muted min-[600px]:right-4 min-[600px]:left-auto max-[599px]:right-auto max-[599px]:left-4"
        >
          <CloseIcon size={16} />
        </button>

        {step === "name" ? (
          <>
            <h2 className="mb-1.5 font-display text-lg font-bold">One more thing</h2>
            <p className="mb-5 text-xs leading-relaxed text-text-muted">
              Let your future travel companions know who you are.
            </p>

            <label htmlFor="onboarding-name" className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Your name
            </label>
            <input
              id="onboarding-name"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitName();
              }}
              placeholder="e.g. Aarav Kapoor"
              autoFocus
              className="w-full rounded-xl border-[1.5px] border-primary px-3.5 py-3.5 text-sm outline-none font-sans"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
              You can add a photo, bio, and travel preferences later from your profile.
            </p>

            <button
              onClick={handleSubmitName}
              disabled={!isValidName || savingName}
              className="mt-4 w-full rounded-full bg-primary px-4 py-3.5 text-sm font-semibold text-white font-sans transition-opacity hover:opacity-90 disabled:bg-[oklch(88%_0.01_255)] disabled:text-[oklch(60%_0.01_255)]"
            >
              {savingName ? "Saving…" : "Continue"}
            </button>
          </>
        ) : step === "phone" ? (
          <>
            <Logo size={24} showWordmark={false} className="mb-4.5" />
            <h2 className="mb-1.5 font-display text-lg font-bold">
              {actionCopy}
            </h2>
            <p className="mb-5 text-xs leading-relaxed text-text-muted">
              We verify travellers to help build a safer travel community.
              Your number is never shown to other users.
            </p>

            <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">
              Phone number
            </label>
            <div className="mb-1.5 flex gap-2">
              <div className="flex items-center rounded-xl border-[1.5px] border-border-input bg-surface-tint px-3 text-sm font-semibold text-text-secondary">
                +91
              </div>
              <input
                value={formattedPhone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhoneValue(digits);
                  if (phoneError) setPhoneError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendCode();
                }}
                placeholder="98765 43210"
                inputMode="numeric"
                aria-invalid={!!phoneError}
                className={`flex-1 rounded-xl border-[1.5px] px-3.5 py-3.5 text-sm outline-none font-sans ${
                  phoneError ? "border-danger" : "border-border-input focus:border-primary"
                }`}
              />
            </div>
            {phoneError && (
              <p role="alert" aria-live="polite" className="mb-1 text-[11px] font-medium text-danger">
                {phoneError}
              </p>
            )}

            <button
              onClick={handleSendCode}
              disabled={!isValidPhone || sending}
              className="mt-4 w-full rounded-full bg-primary px-4 py-3.5 text-sm font-semibold text-white font-sans transition-opacity hover:opacity-90 disabled:bg-[oklch(88%_0.01_255)] disabled:text-[oklch(60%_0.01_255)]"
            >
              {sending ? "Sending…" : "Send Code"}
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-1.5 font-display text-lg font-bold">Enter the code</h2>
            <p className="mb-1 text-xs leading-relaxed text-text-muted">
              Code sent to {maskedPhone} &middot;{" "}
              <button
                onClick={actions.editNumber}
                className="font-semibold text-primary"
              >
                Edit number
              </button>
            </p>

            <div className="relative my-5">
              <OtpBoxes onComplete={() => handleOtpComplete()} disabled={verifying} shake={false} />
              {verifying && (
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-surface/70 text-xs font-semibold text-text-tertiary"
                  aria-hidden="true"
                >
                  Verifying…
                </div>
              )}
            </div>

            <p role="alert" aria-live="polite" className="mb-1 text-xs text-danger">
              {otpError}
            </p>

            <div className="mt-2 text-xs text-text-muted">
              {resent ? (
                <span className="font-medium text-primary">Code resent</span>
              ) : resendSeconds > 0 ? (
                <>
                  Didn&apos;t get it? Resend in 0:{String(resendSeconds).padStart(2, "0")}
                </>
              ) : (
                <>
                  Didn&apos;t get it?{" "}
                  <button onClick={handleResend} className="font-semibold text-primary">
                    Resend code
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
