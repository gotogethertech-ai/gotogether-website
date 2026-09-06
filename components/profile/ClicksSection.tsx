"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getUserClicksForProfile, type ClickListItem } from "@/lib/real-clicks-feed";

/**
 * Profile "My Clicks" grid (spec section 16) — a simple photo-grid
 * portfolio of a user's published travel stories, each tile opening the
 * full Click. includeDrafts is true only when the viewer is looking at
 * their own profile (RLS already hides another user's drafts even if this
 * were true for them, but not asking for drafts at all keeps a stranger's
 * profile load from paying for a query that always returns nothing extra).
 */
export function ClicksSection({ userId, includeDrafts }: { userId: string; includeDrafts: boolean }) {
  const [clicks, setClicks] = useState<ClickListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUserClicksForProfile(userId, { includeDrafts }).then((data) => {
      if (!cancelled) setClicks(data);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, includeDrafts]);

  if (clicks === null) return null;
  if (clicks.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-base font-bold">Clicks</h2>
        <span className="text-[11.5px] font-semibold text-text-muted">
          {clicks.length} {clicks.length === 1 ? "story" : "stories"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 min-[500px]:gap-2">
        {clicks.map((click) => (
          <Link key={click.id} href={`/clicks/${click.id}`} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-hover">
            {click.coverImageUrl && (
              <Image src={click.coverImageUrl} alt={click.title} fill sizes="200px" className="object-cover transition-transform group-hover:scale-105" />
            )}
            {includeDrafts && click.coverImageUrl === null && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-tint">
                <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[9.5px] font-bold text-text-tertiary">Draft</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
