import Image from "next/image";
import Link from "next/link";
import { genderRestrictionLabel, formatAgeRange } from "@/lib/trip-dates";
import { PriceTag } from "@/components/ui/PriceTag";

type GenderRestriction = "any" | "women_only" | "men_only";

export type FeaturedTrip = {
  id: string;
  title: string;
  dates: string;
  members: string;
  trust: string;
  organizer: string;
  imgAlt: string;
  imgSrc: string;
  minAge?: number | null;
  maxAge?: number | null;
  genderRestriction?: GenderRestriction;
};

export type PartnerTrip = {
  id: string;
  title: string;
  dates: string;
  seats: string;
  price: string;
  // Raw numeric price fields, when available, so the card can render the
  // struck-through discount display via PriceTag instead of just the
  // plain formatted `price` string above.
  priceValue?: number | null;
  originalPriceValue?: number | null;
  imgAlt: string;
  imgSrc: string;
  minAge?: number | null;
  maxAge?: number | null;
  genderRestriction?: GenderRestriction;
};

/** Shared "Women only · Age 22–30" badge row — hidden entirely when the
 * trip has neither a gender restriction nor an age range set, so a
 * default/unrestricted trip's card stays uncluttered. */
function GroupBadges({
  minAge,
  maxAge,
  genderRestriction,
}: {
  minAge?: number | null;
  maxAge?: number | null;
  genderRestriction?: GenderRestriction;
}) {
  const ageRange = formatAgeRange(minAge ?? null, maxAge ?? null);
  const showGenderBadge = genderRestriction && genderRestriction !== "any";
  if (!showGenderBadge && !ageRange) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {showGenderBadge && (
        <span className="inline-flex items-center rounded-md bg-[oklch(96%_0.004_255)] px-2 py-0.5 text-[9.5px] font-bold text-text-tertiary">
          {genderRestrictionLabel(genderRestriction)}
        </span>
      )}
      {ageRange && (
        <span className="inline-flex items-center rounded-md bg-[oklch(96%_0.004_255)] px-2 py-0.5 text-[9.5px] font-bold text-text-tertiary">
          Age {ageRange}
        </span>
      )}
    </div>
  );
}

/** Community trip card — Trust Score badge, matches mobile Trip Card IA. */
export function TripCard({ trip }: { trip: FeaturedTrip }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block overflow-hidden rounded-[18px] border border-border bg-surface transition-shadow hover:shadow-[0_8px_24px_-8px_oklch(20%_0.02_255/0.15)]"
    >
      <div className="relative h-[150px] w-full bg-surface-hover">
        <Image
          src={trip.imgSrc}
          alt={trip.imgAlt}
          fill
          sizes="(min-width: 900px) 33vw, 260px"
          className="object-cover"
        />
      </div>
      <div className="p-3.5">
        <div className="mb-1.5 text-sm font-bold">{trip.title}</div>
        <div className="mb-2 text-[11.5px] text-text-muted">
          <span className="text-text-tertiary">Available</span> {trip.dates} &middot; {trip.members} joined
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-md bg-trust-bg px-2 py-0.5 text-[10.5px] font-semibold text-trust-fg">
            ⭐ {trip.trust} Trust
          </span>
          <span className="text-[11px] text-text-muted">{trip.organizer}</span>
        </div>
        <GroupBadges minAge={trip.minAge} maxAge={trip.maxAge} genderRestriction={trip.genderRestriction} />
      </div>
    </Link>
  );
}

/** Verified Partner card — subtle professional cue via border, not louder color. */
export function PartnerTripCard({ trip }: { trip: PartnerTrip }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block overflow-hidden rounded-[18px] border border-border-partner bg-surface transition-shadow hover:shadow-[0_8px_24px_-8px_oklch(20%_0.02_255/0.15)]"
    >
      <div className="relative h-[150px] w-full bg-surface-hover">
        <Image
          src={trip.imgSrc}
          alt={trip.imgAlt}
          fill
          sizes="(min-width: 900px) 33vw, 260px"
          className="object-cover"
        />
      </div>
      <div className="p-3.5">
        <span className="mb-2 inline-flex items-center gap-1 rounded-md bg-partner-bg px-2 py-0.5 text-[10.5px] font-semibold text-partner-fg">
          Verified Partner
        </span>
        <div className="mb-1 text-sm font-bold">{trip.title}</div>
        <div className="mb-2 text-[11.5px] text-text-muted">
          {trip.dates} &middot; {trip.seats} seats left
        </div>
        {trip.priceValue ? (
          <PriceTag price={trip.priceValue} originalPrice={trip.originalPriceValue} size="sm" />
        ) : (
          <div className="text-[13px] font-bold text-text-secondary">{trip.price}</div>
        )}
        <GroupBadges minAge={trip.minAge} maxAge={trip.maxAge} genderRestriction={trip.genderRestriction} />
      </div>
    </Link>
  );
}
