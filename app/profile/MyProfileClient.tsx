"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth, verificationStatusLabel } from "@/lib/auth-context";
import {
  ProfileHeader,
  TrustStrip,
  StatGrid,
  BadgeRow,
  ReviewsSection,
  TravelHistorySection,
} from "@/components/profile/ProfileSections";
import { getRealProfileById } from "@/lib/real-profile";
import type { ProfileData } from "@/lib/profiles-data";
import { TravelCompanySection } from "@/components/profile/TravelCompanySection";

/**
 * My Profile — Hybrid IA from the approved Personal User Area Blueprint:
 * a compact mirror of Public Profile (identical structure/data — this is
 * a transparency feature, not a richer private view) plus 3 owner-only
 * additions: Edit Profile button, Trust Improvement Tips, Verification
 * Status line. "View statistics"/"View all" link out to dedicated pages
 * rather than inlining everything here.
 */
export function MyProfileClient() {
  const { user, isLoggedIn, loading, requireAuth } = useAuth();
  const authChecked = !loading && isLoggedIn;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    if (loading || isLoggedIn) return;
    requireAuth("view your profile", () => {});
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
            Couldn&apos;t load your profile right now. Try refreshing the page.
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const missingFields = getMissingFields(profile);

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[860px] px-8 py-8 pb-20 max-[599px]:px-4">
          <div className="flex flex-col gap-8">
            <ProfileHeader
              profile={profile}
              actions={
                <Link
                  href="/profile/edit"
                  className="rounded-full bg-primary px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90"
                >
                  Edit Profile
                </Link>
              }
            />

            <div className="flex items-center justify-between rounded-2xl border border-border px-5 py-3.5">
              <span className="text-[12.5px] font-semibold text-text-secondary">Verification status</span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[12px] font-bold ${
                    user.verificationStatus === "id_verified" ? "text-trust-fg" : "text-text-tertiary"
                  }`}
                >
                  {verificationStatusLabel(user.verificationStatus)}
                </span>
                {user.verificationStatus !== "id_verified" && (
                  <Link href="/settings" className="text-[11.5px] font-semibold text-primary hover:underline">
                    Complete →
                  </Link>
                )}
              </div>
            </div>

            <TravelCompanySection />

            <TrustStrip profile={profile} />

            {missingFields.length > 0 && (
              <div className="rounded-2xl bg-[oklch(94%_0.05_255)] px-5 py-4">
                <div className="mb-1 text-[12.5px] font-bold text-primary">Complete your profile</div>
                <p className="mb-2 text-[12px] leading-relaxed text-text-secondary">
                  Add your {missingFields.join(", ")} to help future trip-mates get to know you.
                </p>
                <Link href="/profile/edit" className="text-[11.5px] font-bold text-primary hover:underline">
                  Edit Profile →
                </Link>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-base font-bold">Travel activity</h2>
                <Link href="/profile/statistics" className="text-[11.5px] font-semibold text-primary hover:underline">
                  View statistics →
                </Link>
              </div>
              <StatGrid profile={profile} compact />
            </div>

            <BadgeRow profile={profile} />

            <ReviewsSection profile={profile} />

            <div>
              <TravelHistorySection profile={{ ...profile, history: profile.history.slice(0, 2) }} />
              {profile.history.length > 2 && (
                <Link href="/profile/history" className="mt-2 inline-block text-[11.5px] font-semibold text-primary hover:underline">
                  View all →
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function getMissingFields(profile: { bio: string; badges: unknown[] }): string[] {
  const missing: string[] = [];
  if (!profile.bio || profile.bio.length < 20) missing.push("bio");
  if (profile.badges.length === 0) missing.push("travel preferences");
  return missing;
}
