"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TripCard, PartnerTripCard } from "@/components/ui/TripCard";
import { DestinationChip } from "@/components/ui/DestinationChip";
import { AccentButton } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { featuredTrips, partnerTrips, popularDestinations } from "@/lib/mock-data";
import { activeTrips, upcomingTrips } from "@/lib/my-trips-data";
import { getTripDetail } from "@/lib/trip-details";

const UPCOMING_CAP = 3;

/**
 * Logged-in Home — Concept C from the approved blueprint: one adaptive
 * page, not a state-swapped set of templates. A personal-activity zone at
 * top renders only the sections that are actually true for this user
 * (active trip / upcoming trips — each independently conditional), always
 * followed by the same Discovery zone every visitor gets, so a brand-new
 * user and a heavy user see one consistent page shape, not two different
 * apps. Explicitly not a replacement for Explore/My Trips/Notifications/
 * Profile — each keeps sole ownership of its own fuller content; this page
 * only surfaces the "what's relevant to me right now" summary.
 */
export function LoggedInHomeClient() {
  const { user, isLoggedIn, requireAuth } = useAuth();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("see your home", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authChecked || !user) {
    return (
      <>
        <Header activePath="/home" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  const active = activeTrips[0]; // "realistically at most one" per My Trips Blueprint
  const upcoming = [...upcomingTrips].slice(0, UPCOMING_CAP); // cap applied after sort — mock data is already soonest-first
  const firstName = user.name.split(" ")[0];
  const isReturning = upcoming.length > 0 || !!active;

  return (
    <>
      <Header activePath="/home" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-(--section-max-width) px-8 pt-8 pb-4 max-[599px]:px-4">
          <h1 className="font-display text-2xl font-bold">
            {isReturning ? `Welcome back, ${firstName}` : `Welcome, ${firstName}`}
          </h1>
        </div>

        {active && <ActiveTripBanner tripId={active.tripId} title={active.title} role={active.role} />}

        {upcoming.length > 0 && (
          <section className="mx-auto max-w-(--section-max-width) px-8 pt-6 max-[599px]:px-4">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">Upcoming trips</h2>
              <Link href="/my-trips" className="text-[12.5px] font-semibold text-primary hover:underline">
                View all in My Trips →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
              {upcoming.map((trip) => (
                <UpcomingTripCard key={trip.tripId} trip={trip} />
              ))}
            </div>
          </section>
        )}

        {/* Discovery zone — always present, identical for every visitor
            regardless of activity level, mirroring the Homepage's own
            "personal-relevance zone, then discovery zone" rhythm. */}
        <section className="mx-auto max-w-(--section-max-width) px-8 pt-10 max-[599px]:px-4">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold">Popular destinations</h2>
            <Link href="/destinations" className="text-[12.5px] font-semibold text-primary hover:underline">
              See all →
            </Link>
          </div>
          <div className="rail flex gap-3 overflow-x-auto pb-1" role="group" aria-label="Popular destinations">
            {popularDestinations.map((d) => (
              <DestinationChip key={d.name} name={d.name} imgSrc={d.imgSrc} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-(--section-max-width) px-8 pt-10 max-[599px]:px-4">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold">Trips being planned</h2>
            <Link href="/explore" className="text-[12.5px] font-semibold text-primary hover:underline">
              Explore all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
            {featuredTrips.slice(0, 8).map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>

        {partnerTrips.length > 0 && (
          <section className="mx-auto max-w-(--section-max-width) px-8 py-10 max-[599px]:px-4">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">From Verified Partners</h2>
              <Link href="/travel-companies" className="text-[12.5px] font-semibold text-primary hover:underline">
                View all companies →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
              {partnerTrips.slice(0, 3).map((trip) => (
                <PartnerTripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-(--section-max-width) px-8 pb-16 max-[599px]:px-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-tint px-6 py-10 text-center">
            <p className="max-w-[360px] text-[13.5px] text-text-tertiary">
              Have a trip in mind that isn&apos;t here yet?
            </p>
            <AccentButton href="/create-trip">+ Create a Trip</AccentButton>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ActiveTripBanner({
  tripId,
  title,
  role,
}: {
  tripId: string;
  title: string;
  role: "going" | "hosting";
}) {
  const trip = getTripDetail(tripId);
  const imgSrc = trip?.imgSrc ?? "/placeholders/manali.svg";
  return (
    <section className="mx-auto max-w-(--section-max-width) px-8 pt-6 max-[599px]:px-4">
      <Link
        href={role === "hosting" ? `/host/trips/${tripId}/manage` : `/trips/${tripId}`}
        className="relative flex h-[160px] w-full items-end overflow-hidden rounded-[20px] bg-surface-hover max-[599px]:h-[130px]"
      >
        <Image src={imgSrc} alt={title} fill sizes="1200px" className="object-cover" priority />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[oklch(15%_0.02_255/0.75)] via-[oklch(15%_0.02_255/0.15)] to-transparent"
        />
        <div className="relative z-10 flex w-full items-end justify-between gap-4 p-5">
          <div>
            <div className="mb-1 text-[10.5px] font-bold tracking-wide text-white/85 uppercase">
              {role === "hosting" ? "You're hosting" : "Trip in progress"}
            </div>
            <div className="font-display text-lg font-bold text-white">{title}</div>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-text-primary">
            {role === "hosting" ? "Manage Trip" : "View Trip"}
          </span>
        </div>
      </Link>
    </section>
  );
}

function UpcomingTripCard({
  trip,
}: {
  trip: { tripId: string; destination: string; title: string; dates: string; countdown: string; imgSrc: string };
}) {
  return (
    <Link
      href={`/trips/${trip.tripId}`}
      className="block overflow-hidden rounded-[18px] border border-border bg-surface transition-shadow hover:shadow-[0_8px_24px_-8px_oklch(20%_0.02_255/0.15)]"
    >
      <div className="relative h-[110px] w-full bg-surface-hover">
        <Image src={trip.imgSrc} alt={trip.destination} fill sizes="260px" className="object-cover" />
      </div>
      <div className="p-3.5">
        <div className="mb-1 text-sm font-bold">{trip.title}</div>
        <div className="flex items-center justify-between text-[11.5px] text-text-muted">
          <span>{trip.dates}</span>
          <span className="font-semibold text-primary">{trip.countdown}</span>
        </div>
      </div>
    </Link>
  );
}
