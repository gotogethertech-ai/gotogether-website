import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchIcon, ChatBubbleIcon, ShieldIcon } from "@/components/icons";
import { AccentButton } from "@/components/ui/Button";
import { HeroSearch } from "@/components/HeroSearch";
import { TripCard, PartnerTripCard } from "@/components/ui/TripCard";
import { PastTripCard } from "@/components/ui/PastTripCard";
import { DestinationChip } from "@/components/ui/DestinationChip";
import { TrustScoreSection } from "@/components/TrustScoreSection";
import { TripTypesSection } from "@/components/TripTypesSection";
import { HeroBackground } from "@/components/HeroBackground";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { AvailabilityDateNotice } from "@/components/AvailabilityDateNotice";
import { getRealHomepageTrips } from "@/lib/real-homepage-server";
import { getActiveDestinations } from "@/lib/destinations-server";
import { getPublishedTestimonials } from "@/lib/testimonials-server";
import { getRecentCompletedTrips } from "@/lib/real-past-trips";

// Below this many real completed trips, the Past Trips section stays
// hidden entirely rather than showing a sparse, unconvincing rail — same
// "no showcase of near-nothing" reasoning as the Verified Partner Trips
// section's partners.length > 0 gate.
const MIN_PAST_TRIPS_TO_SHOW = 3;

// Fixed layout slots for up to 3 hero-peek cards — previously paired with
// each mock card individually; now assigned by position since real trips
// have no inherent "which corner" preference.
const HERO_PEEK_POSITIONS = ["top-0 right-10 rotate-3", "top-[130px] left-2.5 -rotate-2", "bottom-0 right-0 rotate-2"];

const HOW_IT_WORKS = [
  {
    icon: <SearchIcon size={20} className="text-primary" />,
    tile: "bg-tile-blue",
    title: "Search & find a trip",
    body: "Browse trips already being planned to your destination, by community organizers and verified partners.",
  },
  {
    icon: <ChatBubbleIcon size={20} />,
    tile: "bg-tile-teal",
    title: "Chat before you go",
    body: "Once you're accepted, plan budget, stay and activities together in the trip's group chat.",
  },
  {
    icon: <ShieldIcon size={20} />,
    tile: "bg-tile-orange",
    title: "Travel with people you trust",
    body: "Every traveller is verified and rated after each trip — so you always know who you're travelling with.",
  },
];

export default async function Home() {
  const { featured, partners, heroPeek } = await getRealHomepageTrips();
  const destinations = await getActiveDestinations();
  const testimonials = await getPublishedTestimonials();
  const pastTrips = await getRecentCompletedTrips();

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden bg-surface-alt">
          <HeroBackground />
          <div className="relative mx-auto grid max-w-(--section-max-width) items-center gap-12 px-8 pt-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="hero-fade-in">
              <h1 className="mb-4 max-w-xl font-display text-4xl leading-[1.1] font-bold tracking-tight lg:text-[44px]">
                Find people already planning your next trip.
              </h1>
              <p className="mb-7 max-w-[480px] text-[15.5px] leading-relaxed text-text-tertiary">
                Search a destination, see who&apos;s going, and join a trip
                with real travellers &mdash; verified, reviewed, and ready to
                plan with you.
              </p>

              <HeroSearch />
              <Link
                href="/create-trip"
                className="text-sm font-semibold text-text-secondary hover:text-primary"
              >
                Have a trip in mind? Create your own &rarr;
              </Link>
            </div>

            {/* Peeking real trip cards — proof of supply within the first screen.
                Only rendered once real trips exist; a showcase of fake
                trips here would be exactly the "not a showcase" problem
                this pass fixed everywhere else. */}
            {heroPeek.length > 0 && (
              <div className="relative hidden h-[440px] md:block">
                {heroPeek.map((card, i) => (
                  <Link
                    key={card.id}
                    href={`/trips/${card.id}`}
                    style={{ animationDelay: `${200 + i * 130}ms` }}
                    className={`hero-fade-in absolute w-[220px] ${HERO_PEEK_POSITIONS[i]} overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_8px_24px_-8px_oklch(20%_0.02_255/0.15)] transition-transform hover:scale-[1.02] hover:shadow-[0_16px_36px_-12px_oklch(20%_0.02_255/0.25)]`}
                  >
                    <div className="relative h-[120px] w-full">
                      <Image
                        src={card.imgSrc}
                        alt={card.imgAlt}
                        fill
                        sizes="220px"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <div className="text-[12.5px] font-bold">{card.title}</div>
                      <div className="my-0.5 mb-1.5 text-[10.5px] text-text-muted">
                        {card.dates} &middot; {card.members}
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-trust-bg px-2 py-0.5 text-[10.5px] font-semibold text-trust-fg">
                        ⭐ {card.trust} Trust
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="h-8 lg:h-16" />
        </section>

        {/* TRIPS FOR YOU */}
        <section className="mx-auto max-w-(--section-max-width) px-8 py-14">
          <AvailabilityDateNotice />
          <p className="mb-2 text-[11px] font-bold tracking-wide text-primary uppercase">
            Live right now
          </p>
          <h2 className="mb-2 font-display text-[28px] font-bold tracking-tight">
            Trips For You
          </h2>
          <p className="mb-7 max-w-[560px] text-[14.5px] leading-relaxed text-text-tertiary">
            Real trips organized by real travellers, ranked by how well they
            match your travel style and trust history.
          </p>

          {featured.length === 0 ? (
            <div className="rounded-2xl bg-surface-tint px-6 py-10 text-center">
              <p className="mb-4 text-[13.5px] text-text-tertiary">
                No trips yet — be the first to plan one.
              </p>
              <AccentButton href="/create-trip">+ Create a Trip</AccentButton>
            </div>
          ) : (
            <div className="rail -mx-8 flex gap-5 overflow-x-auto px-8 pb-1.5 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
              {featured.map((trip) => (
                <div key={trip.id} className="w-[260px] flex-none md:w-auto">
                  <TripCard trip={trip} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-7 text-center">
            <Link
              href="/explore"
              className="text-sm font-semibold text-text-secondary hover:text-primary"
            >
              View all trips &rarr;
            </Link>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-(--section-max-width) px-8 py-14">
            <p className="mb-2 text-[11px] font-bold tracking-wide text-primary uppercase">
              How it works
            </p>
            <h2 className="mb-2 font-display text-[28px] font-bold tracking-tight">
              Travel with people, not just a booking
            </h2>
            <div className="mt-2 grid gap-7 sm:grid-cols-3">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.title}>
                  <div
                    className={`mb-3.5 flex h-11 w-11 items-center justify-center rounded-2xl ${step.tile}`}
                  >
                    {step.icon}
                  </div>
                  <div className="mb-1.5 text-[15px] font-bold">
                    {step.title}
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-text-tertiary">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRIP TYPES — explains Community vs Partner before the visitor
            hits the Partner Trips rail below, so the distinction (and
            which one fits them) is clear before they start browsing. */}
        <TripTypesSection />

        {/* VERIFIED PARTNER TRIPS — hidden entirely when no real partner
            trips exist yet (no travel company has published one), rather
            than showing fake ones. Placed above Trust Score per the Aug 24
            product decision. */}
        {partners.length > 0 && (
        <section className="mx-auto max-w-(--section-max-width) px-8 py-14">
          <div className="mb-2 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[11px] font-bold tracking-wide text-primary uppercase">
                Verified Partner Trips
              </p>
              <h2 className="font-display text-[28px] font-bold tracking-tight">
                Professionally organized, fully verified
              </h2>
            </div>
            <Link
              href="/travel-companies"
              className="text-sm font-semibold whitespace-nowrap text-text-secondary hover:text-primary"
            >
              Are you a travel company? &rarr;
            </Link>
          </div>
          <p className="mb-7 max-w-[560px] text-[14.5px] leading-relaxed text-text-tertiary">
            Run by verified travel companies, with fixed pricing and
            confirmed departures.
          </p>

          <div className="rail -mx-8 flex gap-5 overflow-x-auto px-8 pb-1.5 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
            {partners.map((trip) => (
              <div key={trip.id} className="w-[260px] flex-none md:w-auto">
                <PartnerTripCard trip={trip} />
              </div>
            ))}
          </div>
        </section>
        )}

        {/* TRUST SCORE — GoTogether's most important differentiator, so it
            gets its own dedicated scroll moment: what it is, how it helps
            a traveller decide who to go with, and (honestly) how it's
            calculated from the real recompute_trust_score() formula. */}
        <TrustScoreSection />

        {/* POPULAR DESTINATIONS — real, admin-managed destinations (same
            source as /destinations), not the old hardcoded mock list.
            Hidden entirely when there are none yet, rather than showing an
            empty rail. */}
        {destinations.length > 0 && (
          <section className="bg-surface-alt">
            <div className="mx-auto max-w-(--section-max-width) px-8 py-14">
              <p className="mb-2 text-[11px] font-bold tracking-wide text-primary uppercase">
                Popular from Delhi NCR
              </p>
              <h2 className="mb-6 font-display text-[28px] font-bold tracking-tight">
                Where travellers are headed
              </h2>
              <div className="rail -mx-8 flex gap-4 overflow-x-auto px-8 pb-1.5 md:mx-0 md:px-0">
                {destinations.slice(0, 6).map((d) => (
                  <DestinationChip
                    key={d.id}
                    name={d.name}
                    imgSrc={d.cover_image_url ?? "/placeholders/manali.svg"}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* PAST TRIPS — proof of real activity on GoTogether: trips an
            organizer has explicitly marked completed (never automatic —
            see lib/real-host-management.ts's markTripCompleted). Hidden
            entirely below MIN_PAST_TRIPS_TO_SHOW so this never shows a
            sparse, unconvincing rail. */}
        {pastTrips.length >= MIN_PAST_TRIPS_TO_SHOW && (
          <section className="bg-surface-alt">
            <div className="mx-auto max-w-(--section-max-width) px-8 py-14">
              <p className="mb-2 text-[11px] font-bold tracking-wide text-primary uppercase">
                Past Trips
              </p>
              <h2 className="mb-2 font-display text-[28px] font-bold tracking-tight">
                Trips that already happened on GoTogether
              </h2>
              <p className="mb-7 max-w-[560px] text-[14.5px] leading-relaxed text-text-tertiary">
                Real trips, wrapped up by real organizers — a look at where GoTogether travellers
                have actually gone.
              </p>
              <div className="rail -mx-8 flex gap-5 overflow-x-auto px-8 pb-1.5 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
                {pastTrips.map((trip) => (
                  <div key={trip.id} className="w-[260px] flex-none md:w-auto">
                    <PastTripCard trip={trip} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CREATE TRIP CTA */}
        <section className="mx-auto max-w-(--section-max-width) px-8">
          <div className="my-14 rounded-3xl bg-surface-accent px-8 py-14 text-center">
            <h2 className="mb-2 font-display text-[28px] font-bold tracking-tight">
              Have a trip in mind?
            </h2>
            <p className="mx-auto mb-6 max-w-[560px] text-[14.5px] leading-relaxed text-text-tertiary">
              Publish your trip in under 2 minutes and find people to join
              you &mdash; no long forms, just the essentials.
            </p>
            <AccentButton size="lg" href="/create-trip">
              + Create a Trip
            </AccentButton>
          </div>
        </section>

        {/* TESTIMONIALS — published quotes curated in the admin panel
            (app/admin/testimonials), placed as the closing beat right
            above the footer. Renders nothing when there are none yet. */}
        <TestimonialsSection testimonials={testimonials} />
      </main>
      <Footer />
    </>
  );
}
