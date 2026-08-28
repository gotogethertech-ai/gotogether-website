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
import type { FeaturedTrip, PartnerTrip } from "@/components/ui/TripCard";
import { getRealExploreTrips } from "@/lib/real-explore";
import { getMyHostedTrips } from "@/lib/real-trips";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { AvailabilityDateNotice } from "@/components/AvailabilityDateNotice";
import { createClient } from "@/lib/supabase/client";
import type { TestimonialRow } from "@/lib/testimonials-server";

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
  const [featuredTrips, setFeaturedTrips] = useState<FeaturedTrip[]>([]);
  const [partnerTrips, setPartnerTrips] = useState<PartnerTrip[]>([]);
  const [activeHostedTrip, setActiveHostedTrip] = useState<{ tripId: string; title: string; imgSrc: string } | null>(null);
  const [discoveryLoaded, setDiscoveryLoaded] = useState(false);
  const [destinations, setDestinations] = useState<AdminDestinationRow[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    getDestinations().then((rows) => {
      if (!cancelled) setDestinations(rows);
    });
    // Explicit is_published filter even though RLS already restricts a
    // non-staff caller to published rows — an admin/staff viewer browsing
    // this page should still only see what's actually live, not a preview
    // of drafts (that preview belongs to the admin panel, not the
    // consumer homepage).
    createClient()
      .from("testimonials")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(9)
      .then(({ data }) => {
        if (!cancelled) setTestimonials(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("see your home", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getRealExploreTrips(), getMyHostedTrips(user.id)]).then(([trips, hosted]) => {
      if (cancelled) return;
      setFeaturedTrips(
        trips
          .filter((t) => t.type === "community")
          .slice(0, 8)
          .map((t) => ({
            id: t.id,
            title: t.title,
            dates: t.dates,
            members: t.members.replace("/", " of "),
            trust: t.trust,
            organizer: `Hosted by ${t.organizer.split(" ")[0]}`,
            imgAlt: t.destination,
            imgSrc: t.imgSrc,
            minAge: t.minAge,
            maxAge: t.maxAge,
            genderRestriction: t.genderRestriction,
          }))
      );
      setPartnerTrips(
        trips
          .filter((t) => t.type === "partner")
          .slice(0, 3)
          .map((t) => ({
            id: t.id,
            title: t.title,
            dates: t.dates,
            seats: t.members.split("/")[1] ?? "—",
            price: t.budget,
            imgAlt: t.destination,
            imgSrc: t.imgSrc,
            minAge: t.minAge,
            maxAge: t.maxAge,
            genderRestriction: t.genderRestriction,
          }))
      );
      // "Active trip" banner: host-side only for now — the member-side
      // ("Going") relationship isn't wired to real data yet (see My Trips'
      // Going tab, still mock), so this only ever shows a trip the viewer
      // organizes rather than fabricating a "going" state that isn't real.
      const live = hosted.find((h) => h.status === "live" || h.status === "in-progress");
      setActiveHostedTrip(live ? { tripId: live.tripId, title: live.title, imgSrc: live.imgSrc } : null);
      setDiscoveryLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!authChecked || !user) {
    return (
      <>
        <Header activePath="/home" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  const firstName = user.name.split(" ")[0];
  const isReturning = !!activeHostedTrip;

  return (
    <>
      <Header activePath="/home" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-(--section-max-width) px-8 pt-8 pb-4 max-[599px]:px-4">
          <h1 className="font-display text-2xl font-bold">
            {isReturning ? `Welcome back, ${firstName}` : `Welcome, ${firstName}`}
          </h1>
        </div>

        {activeHostedTrip && (
          <ActiveTripBanner tripId={activeHostedTrip.tripId} title={activeHostedTrip.title} imgSrc={activeHostedTrip.imgSrc} />
        )}

        {/* Discovery zone — always present, identical for every visitor
            regardless of activity level, mirroring the Homepage's own
            "personal-relevance zone, then discovery zone" rhythm. */}
        {destinations.length > 0 && (
          <section className="mx-auto max-w-(--section-max-width) px-8 pt-10 max-[599px]:px-4">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">Popular destinations</h2>
              <Link href="/destinations" className="text-[12.5px] font-semibold text-primary hover:underline">
                See all →
              </Link>
            </div>
            <div className="rail flex gap-3 overflow-x-auto pb-1" role="group" aria-label="Popular destinations">
              {destinations.slice(0, 6).map((d) => (
                <DestinationChip key={d.id} name={d.name} imgSrc={d.cover_image_url ?? "/placeholders/manali.svg"} />
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-(--section-max-width) px-8 pt-10 max-[599px]:px-4">
          <AvailabilityDateNotice />
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold">Trips being planned</h2>
            <Link href="/explore" className="text-[12.5px] font-semibold text-primary hover:underline">
              Explore all →
            </Link>
          </div>
          {discoveryLoaded && featuredTrips.length === 0 ? (
            <p className="text-[13px] text-text-tertiary">
              No trips yet —{" "}
              <Link href="/create-trip" className="font-semibold text-primary hover:underline">
                be the first to plan one
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4">
              {featuredTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
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
              {partnerTrips.map((trip) => (
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

        <TestimonialsSection testimonials={testimonials} />
      </main>
      <Footer />
    </>
  );
}

function ActiveTripBanner({
  tripId,
  title,
  imgSrc,
}: {
  tripId: string;
  title: string;
  imgSrc: string;
}) {
  return (
    <section className="mx-auto max-w-(--section-max-width) px-8 pt-6 max-[599px]:px-4">
      <Link
        href={`/host/trips/${tripId}/manage`}
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
              You&apos;re hosting
            </div>
            <div className="font-display text-lg font-bold text-white">{title}</div>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-text-primary">
            Manage Trip
          </span>
        </div>
      </Link>
    </section>
  );
}
