"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { likeClick, unlikeClick } from "@/lib/real-clicks-social";

/**
 * Like toggle (spec section 9) — optimistic: flips the heart/count
 * immediately, then reconciles with the DB call, rolling back on failure.
 * A duplicate like/unlike (double-click, stale state) is a harmless no-op
 * at the DB layer (UNIQUE constraint / delete-nothing), so no extra
 * debouncing is needed here beyond disabling the button mid-request.
 */
export function LikeButton({
  clickId,
  initialLiked,
  initialCount,
}: {
  clickId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const { user, requireAuth } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  function toggle() {
    requireAuth("like this Click", async () => {
      if (!user || pending) return;
      setPending(true);
      const wasLiked = liked;
      setLiked(!wasLiked);
      setCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));
      try {
        if (wasLiked) await unlikeClick(clickId, user.id);
        else await likeClick(clickId, user.id);
      } catch {
        setLiked(wasLiked);
        setCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      className={`flex items-center gap-1.5 text-[12px] font-semibold ${liked ? "text-clicks-primary" : "text-text-muted hover:text-clicks-primary"}`}
    >
      <span>{liked ? "❤️" : "🤍"}</span>
      <span>{count}</span>
    </button>
  );
}
