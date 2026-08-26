"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateTripProvider, useCreateTrip, STEP_ORDER, type StepKey } from "@/lib/create-trip-context";
import { useAuth } from "@/lib/auth-context";
import { DestinationStep } from "@/components/create-trip/DestinationStep";
import { DatesStep } from "@/components/create-trip/DatesStep";
import { BudgetStep } from "@/components/create-trip/BudgetStep";
import { DetailsStep } from "@/components/create-trip/DetailsStep";
import { ReviewStep } from "@/components/create-trip/ReviewStep";
import { SuccessScreen } from "@/components/create-trip/SuccessScreen";

/**
 * Create Trip flow entry point — a full page (not a modal), per the
 * blueprint's Desktop/Laptop spec: "Create Trip is a substantial,
 * multi-minute task deserving its own page, not an interruption-style
 * overlay." Gated behind auth, matching the Header's own requireAuth call
 * for "start planning your trip"; a signed-out visitor who lands here
 * directly (e.g. a bookmarked URL) sees the same auth modal rather than a
 * silent redirect.
 */
export function CreateTripClient() {
  const { user, isLoggedIn, loading, requireAuth, requireVerification, requireCompleteProfile } = useAuth();
  const router = useRouter();
  // Lazy initializer: an already-logged-in AND already-verified visitor is
  // "checked" from the very first render, so this never needs an
  // effect-driven setState for that branch — only the logged-out and
  // not-yet-verified branches (each opening an overlay, a real
  // external-system side effect) belong in the effect below.
  const [authChecked, setAuthChecked] = useState(
    () => isLoggedIn && user?.verificationStatus === "id_verified"
  );
  // Once the effect below has fired for a resolved session, don't fire it
  // again (it's keyed on `loading` so it would otherwise re-run on any
  // later loading-state flap, e.g. a token refresh).
  const gateHasRun = authChecked;

  useEffect(() => {
    // Wait for the initial session check (AuthProvider's async
    // supabase.auth.getSession()) to resolve before deciding this visitor
    // is logged out. Without this, a signed-in user landing here on a
    // fresh page load hits this effect while `user` is still null and
    // `loading` is true — requireAuth then sees no user and kicks off a
    // real Google sign-in redirect for someone who was already logged in.
    if (loading || gateHasRun) return;
    // Create Trip is checked at the earliest point the action is
    // attempted — right here — not deferred to a later step like Publish
    // (Onboarding Blueprint's Progressive Completion rule). Verification
    // is chained as a second gate after login succeeds. requireAuth/
    // requireVerification/requireCompleteProfile each call onSuccess
    // synchronously-in-callback (not in the effect body itself) when
    // their condition is already satisfied, so an already-logged-in,
    // already-verified, already-complete-profile visitor still resolves
    // through this same chain without a spurious sign-in/verification
    // prompt — just via callback rather than a direct branch here.
    requireAuth("start planning your trip", () =>
      requireVerification(() => requireCompleteProfile(() => setAuthChecked(true)))
    );
    // If the visitor cancels either overlay, they're left on this gated
    // screen with a way back home rather than stranded on a blank page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, gateHasRun]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <button
          onClick={() => router.push("/")}
          className="text-sm font-semibold text-text-secondary hover:text-primary"
        >
          ← Back to GoTogether
        </button>
      </div>
    );
  }

  return (
    <CreateTripProvider>
      <CreateTripFlow />
    </CreateTripProvider>
  );
}

function CreateTripFlow() {
  const router = useRouter();
  const { furthestStepIndex, published, reset, publish } = useCreateTrip();
  // Resume at the last completed step on load, per the blueprint's Draft
  // Handling: "the flow resumes at the last completed step." Lazy
  // initializer — furthestStepIndex is already known at first render, no
  // effect needed.
  const [stepIndex, setStepIndex] = useState(() => Math.min(furthestStepIndex, STEP_ORDER.length - 1));

  if (published) {
    return <SuccessScreen />;
  }

  const step: StepKey = STEP_ORDER[stepIndex];

  function goTo(target: StepKey) {
    setStepIndex(STEP_ORDER.indexOf(target));
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  }

  function goBack() {
    if (stepIndex === 0) {
      reset();
      router.push("/");
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  switch (step) {
    case "destination":
      return <DestinationStep onBack={goBack} onContinue={goNext} />;
    case "dates":
      return <DatesStep onBack={goBack} onContinue={goNext} />;
    case "budget":
      return <BudgetStep onBack={goBack} onContinue={goNext} />;
    case "details":
      return <DetailsStep onBack={goBack} onContinue={goNext} />;
    case "review":
      return <ReviewStep onBack={goBack} onEditStep={goTo} onPublish={publish} />;
    default:
      return null;
  }
}
