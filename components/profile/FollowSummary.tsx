"use client";

import { useEffect, useState } from "react";
import { getFollowCounts } from "@/lib/real-clicks-social";
import { FollowButton } from "@/components/clicks/FollowButton";

/**
 * Follower/following counts row for a profile (spec section 12), with a
 * Follow button when viewing someone else's profile. Sits beside
 * ClicksSection rather than inside the shared ProfileHeader, which is
 * driven by the older ProfileData shape and used by pages that predate
 * the follow system — keeping this separate avoids threading new props
 * through every ProfileHeader caller for a feature only Clicks needs so far.
 */
export function FollowSummary({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFollowCounts(userId).then((c) => {
      if (!cancelled) setCounts(c);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!counts) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border px-5 py-3.5">
      <div className="flex gap-5 text-[12.5px]">
        <span>
          <strong className="font-bold">{counts.followers}</strong>{" "}
          <span className="text-text-tertiary">{counts.followers === 1 ? "follower" : "followers"}</span>
        </span>
        <span>
          <strong className="font-bold">{counts.following}</strong> <span className="text-text-tertiary">following</span>
        </span>
      </div>
      {!isSelf && <FollowButton targetUserId={userId} />}
    </div>
  );
}
