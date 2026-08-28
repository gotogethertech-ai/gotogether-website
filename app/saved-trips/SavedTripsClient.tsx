"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ExploreTripCard } from "@/components/ui/ExploreTripCard";
import { useAuth } from "@/lib/auth-context";
import { getSavedTrips } from "@/lib/real-saved-trips";
import type { ExploreTrip } from "@/lib/mock-data";
import { AvailabilityDateNotice } from "@/components/AvailabilityDateNotice";

/**
 * Saved Trips — lists every trip the signed-in user has bookmarked via the
 * save icon on ExploreTripCard, reusing that same card so state (the
 * filled bookmark, "N joined", budget) stays visually consistent between
 * Explore and here. Backed by public.saved_trips (migration
 * 028_saved_trips) via lib/real-saved-trips.ts.
 */
export function SavedTripsClient() {
  const { user, isLoggedIn, requireAuth } = useAuth();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);
  const [trips, setTrips] = useState<ExploreTrip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("view your saved trips", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getSavedTrips().then((data) => {
      if (cancelled) return;
      setTrips(data);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!authChecked || !user) {
    return (
      <>
        <Header activePath="/" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-(--section-max-width) px-8 py-8 pb-20">
          <h1 className="mb-1 font-display text-xl font-bold">Saved Trips</h1>
          <p className="mb-6 text-[12.5px] text-text-tertiary">
            Trips you&apos;ve bookmarked from Explore — tap the ribbon icon on any trip card to save
            or remove it.
          </p>

          {loaded && trips.length > 0 && <AvailabilityDateNotice />}

          {!loaded ? (
            <div className="grid grid-cols-1 gap-5 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[260px] animate-pulse rounded-[18px] bg-surface-hover" />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-divider py-20 text-center">
              <p className="text-[13.5px] text-text-tertiary">
                You haven&apos;t saved any trips yet.
              </p>
              <Link
                href="/explore"
                className="text-[12.5px] font-semibold text-primary hover:underline"
              >
                Browse trips on Explore →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
              {trips.map((trip, i) => (
                <ExploreTripCard key={trip.id} trip={trip} priority={i < 4} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
