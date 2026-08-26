"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import {
  ProfileHeader,
  TrustStrip,
  StatGrid,
  BadgeRow,
  TrustScoreBreakdown,
  ReviewsSection,
  TravelHistorySection,
} from "@/components/profile/ProfileSections";
import type { ProfileData } from "@/lib/profiles-data";

/**
 * Public Profile — Concept C (Balanced Profile with Progressive
 * Disclosure), approved: identity → trust summarized immediately →
 * progressively deeper evidence on scroll. Single generous column, no
 * sidebar. Read-only, reputation-evidence page — never a social feed, no
 * messaging entry point (DMs only exist between shared-trip Members).
 */
export function PublicProfileClient({ profile }: { profile: ProfileData }) {
  const { user, requireAuth } = useAuth();
  const [copied, setCopied] = useState(false);

  const isSelf = !!user && (user.id === profile.slug || user.name === profile.name);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleReport() {
    requireAuth("report this profile", () => {
      // No real report backend in this frontend-only phase — a real
      // implementation would open a report form here.
    });
  }

  if (profile.suspended) {
    return (
      <>
        <Header activePath="/explore" />
        <main className="flex-1 bg-surface">
          <div className="mx-auto max-w-[860px] px-8 py-24 text-center">
            <p className="text-[13.5px] text-text-tertiary">This profile is currently unavailable</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header activePath="/explore" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[860px] px-8 py-8 pb-20 max-[599px]:px-4">
          {isSelf ? (
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-[oklch(94%_0.05_255)] px-5 py-3.5">
              <span className="text-[12.5px] font-semibold text-primary">This is your public profile</span>
              <Link href="/profile/edit" className="text-[12px] font-bold text-primary hover:underline">
                Edit Profile →
              </Link>
            </div>
          ) : (
            <div className="mb-5 flex justify-end gap-2">
              <button
                onClick={handleShare}
                aria-label="Share profile"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-input text-text-tertiary hover:bg-surface-hover"
              >
                ⇪
              </button>
              <button
                onClick={handleReport}
                aria-label="Report"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-input text-text-tertiary hover:bg-surface-hover"
              >
                ⋮
              </button>
              {copied && (
                <span role="status" className="self-center text-[11.5px] font-semibold text-trust-fg">
                  Link copied
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-8">
            <ProfileHeader profile={profile} />
            <TrustStrip profile={profile} />
            <div>
              <h2 className="mb-3 font-display text-base font-bold">Travel activity</h2>
              <StatGrid profile={profile} />
            </div>
            <BadgeRow profile={profile} />
            <TrustScoreBreakdown profile={profile} />
            <ReviewsSection profile={profile} />
            <TravelHistorySection profile={profile} />

            {profile.activeTripId && (
              <div className="rounded-2xl border border-border p-4">
                <Link
                  href={`/trips/${profile.activeTripId}`}
                  className="text-[12.5px] font-semibold text-primary hover:underline"
                >
                  View {profile.name.split(" ")[0]}&apos;s active trip →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
