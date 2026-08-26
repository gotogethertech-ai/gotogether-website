"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSavedTripIds, saveTrip, unsaveTrip } from "@/lib/real-saved-trips";

/**
 * Shared saved-trip-ids state for a page rendering many ExploreTripCards
 * (Explore, a destination page, a company page). Each mounted card calls
 * this hook, but the ids are fetched once per page via a module-level
 * in-flight promise cache — so 20 cards on /explore make one query, not
 * 20. Falls back to an empty set for a signed-out visitor (Save is
 * auth-gated, same as Create Trip/Join).
 */

let cachedPromise: Promise<Set<string>> | null = null;
let cachedForUserId: string | null = null;

function fetchSavedIdsOnce(userId: string): Promise<Set<string>> {
  if (cachedForUserId === userId && cachedPromise) return cachedPromise;
  cachedForUserId = userId;
  cachedPromise = getSavedTripIds().catch(() => new Set<string>());
  return cachedPromise;
}

/** Call after a save/unsave so other cards on the same page (and future
 * mounts) pick up the change instead of racing the stale cached fetch. */
function invalidateSavedIdsCache() {
  cachedPromise = null;
  cachedForUserId = null;
}

export function useSavedTripIds() {
  const { user, isLoggedIn } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    let cancelled = false;
    fetchSavedIdsOnce(user.id).then((ids) => {
      if (!cancelled) {
        setSavedIds(ids);
        loadedRef.current = true;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, isLoggedIn]);

  const toggleSave = useCallback(
    async (tripId: string) => {
      if (!user) return;
      const wasSaved = savedIds.has(tripId);
      // Optimistic update, per the Explore Trips Blueprint's
      // "Performance/scalability" note on the save icon.
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(tripId);
        else next.add(tripId);
        return next;
      });
      try {
        if (wasSaved) await unsaveTrip(user.id, tripId);
        else await saveTrip(user.id, tripId);
        invalidateSavedIdsCache();
      } catch {
        // Roll back on failure — e.g. a network error or an RLS reject.
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(tripId);
          else next.delete(tripId);
          return next;
        });
      }
    },
    [user, savedIds]
  );

  return { savedIds, toggleSave };
}
