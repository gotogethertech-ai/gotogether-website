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
 *
 * Backed by real Supabase Auth (phone OTP + Google OAuth) as of the
 * backend wiring pass — actions.submitPhone/verifyOtp/submitName are now
 * async and can genuinely fail (wrong number format, no SMS provider
 * configured, expired/incorrect code), surfaced via modalState.error.
 */
export function AuthModal() {
  const { modalState, actions } = useAuth();
  const { open, step, phone, label, error: authError } = modalState;
  const dialogRef = useRef<HTMLDivElement>(null);
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneValidationError, setPhoneValidationError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [resent, setResent] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    setPhoneValidationError("");
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
  // Displayed error for each step is derived straight from render state —
  // authError (modalState.error) is already reactive via context, so
  // there's no need to copy it into local state via an effect. Client-
  // side validation (phoneValidationError) takes priority when both could
  // apply, since it's the more immediately actionable message.
  const phoneDisplayError = phoneValidationError || (step === "phone" ? authError : "");
  const otpDisplayError = step === "otp" ? authError : "";

  async function handleSendCode() {
    if (!isValidPhone) {
      setPhoneValidationError("Enter a valid 10-digit mobile number");
      return;
    }
    setPhoneValidationError("");
    setSending(true);
    const ok = await actions.submitPhone(phoneValue);
    setSending(false);
    if (ok) setResendSeconds(30);
  }

  async function handleOtpComplete(code: string) {
    setVerifying(true);
    const ok = await actions.verifyOtp(code);
    setVerifying(false);
    if (ok) {
      resetLocalState();
    }
    // On failure, modalState.error is already set and read directly as
    // otpDisplayError above — OtpBoxes stays mounted so the user can
    // retry without re-navigating the modal.
  }

  function handleResend() {
    if (resendSeconds > 0) return;
    setResendSeconds(30);
    setResent(true);
    actions.resend();
    setTimeout(() => setResent(false), 2500);
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    await actions.signInWithGoogle();
    // No further state update here: signInWithGoogle navigates the whole
    // page away to Google's consent screen (or fails silently if Google
    // OAuth isn't enabled on the Supabase project yet, in which case
    // nothing happens and this spinner would hang — acceptable for now
    // since enabling the provider is a one-time dashboard setup step).
  }

  const maskedPhone = phone.length === 10 ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : `+91 ${phone}`;
  const actionCopy = label
    ? `Verify your phone to ${label}`
    : "Verify your phone to continue";

  const isValidName = nameValue.trim().length >= 2 && nameValue.trim().length <= 50;

  async function handleSubmitName() {
    if (!isValidName) return;
    setSavingName(true);
    const ok = await actions.submitName(nameValue.trim());
    setSavingName(false);
    if (ok) resetLocalState();
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
            {authError && (
              <p role="alert" aria-live="polite" className="mt-1.5 text-[11px] font-medium text-danger">
                {authError}
              </p>
            )}
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

            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-full border-[1.5px] border-border-input px-4 py-3.5 text-sm font-semibold text-text-primary font-sans transition-colors hover:bg-surface-hover disabled:opacity-60"
            >
              <GoogleGlyph />
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border-divider" aria-hidden="true" />
              <span className="text-[10.5px] font-semibold text-text-muted">OR</span>
              <div className="h-px flex-1 bg-border-divider" aria-hidden="true" />
            </div>

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
                  if (phoneValidationError) setPhoneValidationError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendCode();
                }}
                placeholder="98765 43210"
                inputMode="numeric"
                aria-invalid={!!phoneDisplayError}
                className={`flex-1 rounded-xl border-[1.5px] px-3.5 py-3.5 text-sm outline-none font-sans ${
                  phoneDisplayError ? "border-danger" : "border-border-input focus:border-primary"
                }`}
              />
            </div>
            {phoneDisplayError && (
              <p role="alert" aria-live="polite" className="mb-1 text-[11px] font-medium text-danger">
                {phoneDisplayError}
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
              <OtpBoxes onComplete={handleOtpComplete} disabled={verifying} shake={!!otpDisplayError} />
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
              {otpDisplayError}
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

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.7-6 8.1-11.3 8.1-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13.2 24 13.2c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 7.2 29.6 5.2 24 5.2c-7.5 0-14 4.2-17.7 10.5z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2 1.5-4.6 2.4-7.7 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 39.7 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.3-2.2 4.2-4.1 5.7l6.6 5.6C41.6 35.5 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
