"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import { StatGrid, TrustScoreBreakdown } from "@/components/profile/ProfileSections";
import { getRealProfileById } from "@/lib/real-profile";
import type { ProfileData } from "@/lib/profiles-data";

/**
 * Dedicated "View statistics" destination linked from My Profile's Travel
 * activity section (Personal User Area Blueprint) — the full, uncompacted
 * StatGrid (all 7 real fields, not the 4-field `compact` version shown
 * inline) plus the Trust Score breakdown. Same auth-gate + data-fetch
 * pattern as MyProfileClient, since this is still an owner-only page.
 */
export function StatisticsClient() {
  const { user, isLoggedIn, loading, requireAuth } = useAuth();
  const authChecked = !loading && isLoggedIn;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    if (loading || isLoggedIn) return;
    requireAuth("view your statistics", () => {});
  }, [loading, isLoggedIn, requireAuth]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getRealProfileById(user.id).then((data) => {
      if (cancelled) return;
      if (data) setProfile(data);
      else setProfileError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!authChecked || !user || (!profile && !profileError)) {
    return (
      <>
        <Header activePath="/" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Header activePath="/" />
        <main className="flex-1 bg-surface">
          <div className="mx-auto max-w-[860px] px-8 py-24 text-center text-[13.5px] text-text-tertiary">
            Couldn&apos;t load your statistics right now. Try refreshing the page.
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[860px] px-8 py-8 pb-20 max-[599px]:px-4">
          <Link href="/profile" className="mb-4 inline-block text-[11.5px] font-semibold text-primary hover:underline">
            ← Back to profile
          </Link>
          <h1 className="mb-6 font-display text-xl font-bold">Travel activity</h1>
          <div className="flex flex-col gap-8">
            <StatGrid profile={profile} />
            <TrustScoreBreakdown profile={profile} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
