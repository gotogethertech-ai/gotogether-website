import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OrganizerCard } from "@/components/trip/OrganizerCard";
import { MembersSection } from "@/components/trip/MembersSection";
import { ConditionalSection } from "@/components/trip/ConditionalSection";
import { TripActionPanelConnected } from "@/components/trip/TripRelationshipProvider";
import { TripStatusChip } from "@/components/trip/TripStatusChip";
import { getRealTripDetailServer } from "@/lib/real-trip-details-server";
import { genderRestrictionLabel, formatAgeRange } from "@/lib/trip-dates";
import { PriceTag } from "@/components/ui/PriceTag";
import { AvailabilityDateNotice } from "@/components/AvailabilityDateNotice";

// Real trip ids aren't known at build time — every /trips/[id] request is
// rendered on demand against the live database rather than a fixed set of
// pre-generated mock trip pages.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const trip = await getRealTripDetailServer(id);
  if (!trip) return { title: "Trip not found — GoTogether" };
  return {
    title: `${trip.title} — GoTogether`,
    description: trip.about,
  };
}

export default async function TripDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getRealTripDetailServer(id);
  if (!trip) notFound();

  const ageRange = formatAgeRange(trip.minAge ?? null, trip.maxAge ?? null);
  const hasGroupRestriction = !!(trip.genderRestriction && trip.genderRestriction !== "any") || !!ageRange;

  const metaRow: string[] = [];
  if (trip.dates) {
    metaRow.push(
      trip.kind === "partner"
        ? `📅 ${trip.dates}`
        : `📅 Available ${trip.dates}${trip.duration ? ` · ${trip.duration}` : ""}`
    );
  }
  if (trip.tripType) metaRow.push(`🎒 ${trip.tripType}`);
  if (hasGroupRestriction) {
    const parts = [genderRestrictionLabel(trip.genderRestriction)];
    if (ageRange) parts.push(`Age ${ageRange}`);
    metaRow.push(`👥 ${parts.join(" · ")}`);
  }

  return (
    <>
      <Header activePath="/explore" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-(--section-max-width) px-8">
          <div className="relative mt-6 h-[280px] w-full overflow-hidden rounded-[20px] bg-surface-hover max-[899px]:h-[180px]">
            <Image
              src={trip.imgSrc}
              alt={trip.region}
              fill
              sizes="(min-width: 1200px) 1200px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="mx-auto grid max-w-(--section-max-width) items-start gap-14 px-8 py-8 pb-20 min-[900px]:grid-cols-[1.9fr_1fr]">
          {/* MAIN CONTENT */}
          <div className="max-w-[640px]">
            <div className="border-b border-border-divider pb-7">
              <div className="mb-1 text-[12.5px] text-text-muted">{trip.region}</div>
              <h1 className="mb-3 font-display text-[28px] leading-tight font-bold tracking-tight">
                {trip.title}
              </h1>
              {metaRow.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-4 text-[12.5px] text-text-tertiary">
                  {metaRow.map((m) => (
                    <div key={m}>{m}</div>
                  ))}
                </div>
              )}
              {trip.kind === "community" && <AvailabilityDateNotice compact />}
              <div className="flex items-center gap-2.5">
                {trip.kind === "partner" && trip.priceValue ? (
                  <PriceTag price={trip.priceValue} originalPrice={trip.originalPriceValue} />
                ) : (
                  trip.budget && (
                    <div className="text-base font-bold text-text-secondary">
                      {trip.budget}{" "}
                      <span className="text-[11px] font-medium text-text-muted">estimated</span>
                    </div>
                  )
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold ${
                    trip.kind === "partner"
                      ? "bg-partner-bg text-partner-fg"
                      : "bg-[oklch(94%_0.002_255)] text-text-tertiary"
                  }`}
                >
                  {trip.kind === "partner" ? "Verified Partner" : "Community Trip"}
                </span>
                <TripStatusChip tripId={trip.id} />
              </div>
            </div>

            <ConditionalSection title="Organized by">
              <OrganizerCard organizer={trip.organizer} />
            </ConditionalSection>

            <ConditionalSection title="Who's going">
              <MembersSection tripId={trip.id} joined={trip.membersJoined} max={trip.membersMax} members={trip.members} />
            </ConditionalSection>

            <ConditionalSection title="About this trip">
              <p className="text-[13.5px] leading-[1.75] text-text-secondary">
                {trip.about}
              </p>
            </ConditionalSection>

            <ConditionalSection title="Safety on GoTogether" last={!trip.groupPreferences && !trip.itinerary}>
              <div className="flex flex-col gap-2.5 text-[12.5px] text-text-secondary">
                <SafetyLine text="Every traveller completes phone, email, and government ID verification before joining a trip." />
                <SafetyLine text="Trust Scores are built from real, double-blind reviews after completed trips." />
                <SafetyLine text="Report or block anyone, any time, directly from the trip chat or their profile." />
              </div>
            </ConditionalSection>

            {trip.groupPreferences && (
              <ConditionalSection
                title="Group preferences"
                last={!trip.itinerary}
              >
                <div className="flex flex-wrap gap-2">
                  {trip.groupPreferences.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 rounded-md bg-[oklch(96%_0.004_255)] px-2.5 py-1 text-[10px] font-bold text-text-tertiary"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </ConditionalSection>
            )}

            {trip.itinerary && (
              <ConditionalSection title="Itinerary" last>
                <div className="flex flex-col gap-3.5">
                  {trip.itinerary.map((day) => (
                    <div key={day.day} className="flex gap-3.5">
                      <div className="w-14 flex-none text-[12.5px] font-bold text-primary">
                        {day.day}
                      </div>
                      <div className="text-[12.5px] text-text-secondary">{day.text}</div>
                    </div>
                  ))}
                </div>
              </ConditionalSection>
            )}
          </div>

          {/* STICKY ACTION PANEL */}
          <TripActionPanelConnected trip={trip} />
        </div>

        <div className="mx-auto max-w-(--section-max-width) px-8 pb-8">
          <Link
            href="/explore"
            className="text-sm font-semibold text-text-secondary hover:text-primary"
          >
            ← Back to Explore
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

function SafetyLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[oklch(45%_0.15_185)]">✓</span>
      {text}
    </div>
  );
}
