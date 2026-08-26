"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * "GoTogether Verification Required Interstitial" — a second, later gate
 * layered after phone-OTP login, shown when a phone-verified-but-not-
 * ID-verified user attempts Create Trip or Request to Join (never Save —
 * Save is explicitly not gated by verification per the Onboarding
 * Blueprint's Progressive Completion). Mounted once at the root, driven
 * entirely by auth-context's requireVerification()/verificationModal, the
 * same "one shared overlay, not five one-offs" pattern as AuthModal.
 */
export function VerificationRequiredInterstitial() {
  const { verificationModal, verificationActions } = useAuth();
  const { open } = verificationModal;
  const [starting, setStarting] = useState(false);

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

  if (!open) return null;

  function handleClose() {
    setStarting(false);
    verificationActions.close();
  }

  async function handleStart() {
    setStarting(true);
    await verificationActions.startVerification();
    setStarting(false);
  }

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        aria-label="Close verification dialog"
        onClick={handleClose}
        className="absolute inset-0 bg-[oklch(20%_0.01_255/0.45)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Verify your ID to join this trip"
        className="absolute inset-0 m-auto flex h-fit w-[92vw] max-w-[440px] flex-col items-center rounded-[20px] bg-surface p-7 text-center shadow-[0_24px_60px_-12px_oklch(20%_0.02_255/0.35)]"
      >
        <button
          aria-label="Close"
          onClick={handleClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-muted"
        >
          ×
        </button>

        <div
          aria-hidden="true"
          className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-[oklch(93%_0.05_255)] text-2xl"
          style={{ width: 52, height: 52 }}
        >
          🔒
        </div>

        <h2 className="mb-2 font-display text-lg font-bold">
          Verify your ID to join this trip
        </h2>
        <p className="mb-5 max-w-[340px] text-[12.5px] leading-relaxed text-text-secondary">
          We verify travellers to help build a safer travel community. This
          takes a couple of minutes and is usually reviewed within 24 hours.
        </p>

        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full rounded-full bg-primary px-4 py-3.5 text-sm font-semibold text-white font-sans transition-opacity hover:opacity-90 disabled:opacity-70"
        >
          {starting ? "Submitting…" : "Start Verification"}
        </button>

        <p className="mt-4 text-[11.5px] leading-relaxed text-text-muted">
          We&apos;ll notify you the moment you&apos;re verified, and bring
          you right back to this trip.{" "}
          <a href="/trust-safety#verification" className="font-semibold text-primary hover:underline">
            Learn why we verify travellers →
          </a>
        </p>
      </div>
    </div>
  );
}
