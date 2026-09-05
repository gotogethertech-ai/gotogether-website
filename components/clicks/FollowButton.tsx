"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { isFollowing, followUser, unfollowUser } from "@/lib/real-clicks-social";

/**
 * Follow/Following toggle (spec sections 11/12) — usable from a Click
 * detail page's author row or a profile page. Hidden entirely by the
 * caller when viewing your own profile/Click (there's no "follow
 * yourself" state to render); the DB CHECK backstops that regardless.
 */
export function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { user, requireAuth } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isFollowing(user?.id ?? null, targetUserId).then((v) => {
      if (!cancelled) {
        setFollowing(v);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, targetUserId]);

  function toggle() {
    requireAuth("follow this traveller", async () => {
      if (!user || pending) return;
      setPending(true);
      const was = following;
      setFollowing(!was);
      try {
        if (was) await unfollowUser(user.id, targetUserId);
        else await followUser(user.id, targetUserId);
      } catch {
        setFollowing(was);
      } finally {
        setPending(false);
      }
    });
  }

  if (!loaded) return null;

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        following
          ? "rounded-full border border-clicks-primary px-4 py-1.5 text-[12.5px] font-semibold text-clicks-primary hover:bg-clicks-background"
          : "rounded-full bg-clicks-primary px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-clicks-primary-dark"
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
