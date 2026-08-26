"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth, hasCompleteProfile } from "@/lib/auth-context";

/**
 * Lighter-touch nudge (not a hard block) shown right after sign-in / on
 * first visit for a logged-in user who hasn't yet filled in date of birth
 * + gender. The hard gates live in requireCompleteProfile (auth-context)
 * at the actual create/join action points; this banner exists so a user
 * finds out *before* they hit that wall, per the confirmed "all three"
 * scope decision. Dismissible per session — reappears next visit until
 * the profile is actually completed, but doesn't nag on every page nav
 * within one visit.
 */
export function CompleteProfileBanner() {
  const { user, isLoggedIn, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !isLoggedIn || !user || dismissed) return null;
  if (hasCompleteProfile(user)) return null;

  return (
    <div className="sticky top-0 z-[90] flex items-center justify-center gap-3 bg-[oklch(93%_0.05_255)] px-4 py-2.5 text-center text-[12.5px] font-medium text-[oklch(30%_0.08_255)]">
      <span>
        Add your date of birth and gender to your profile — required before you can create or join
        a trip.
      </span>
      <Link
        href="/profile/edit?reason=complete-profile"
        className="flex-none rounded-full bg-primary px-3.5 py-1.5 text-[11.5px] font-semibold text-white hover:opacity-90"
      >
        Complete profile
      </Link>
      <button
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="flex-none text-[15px] leading-none text-[oklch(30%_0.08_255/0.6)] hover:text-[oklch(30%_0.08_255)]"
      >
        ×
      </button>
    </div>
  );
}
