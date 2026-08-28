import Image from "next/image";
import Link from "next/link";
import type { PastTrip } from "@/lib/real-past-trips";

/** Read-only showcase card for a completed trip — deliberately no Trust
 * Score/price/"join" affordance (this isn't joinable), just proof the trip
 * actually happened: photo, title, destination, when it ran, who went. */
export function PastTripCard({ trip }: { trip: PastTrip }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block overflow-hidden rounded-[18px] border border-border-divider bg-surface transition-shadow hover:shadow-[0_8px_24px_-8px_oklch(20%_0.02_255/0.15)]"
    >
      <div className="relative h-[150px] w-full bg-surface-hover">
        <Image
          src={trip.imgSrc}
          alt={trip.imgAlt}
          fill
          sizes="(min-width: 900px) 33vw, 260px"
          className="object-cover grayscale-[35%]"
        />
        <span className="absolute left-3 top-3 inline-flex items-center rounded-md bg-[oklch(20%_0.01_255/0.55)] px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          Completed
        </span>
      </div>
      <div className="p-3.5">
        <div className="mb-1.5 text-sm font-bold">{trip.title}</div>
        <div className="text-[11.5px] text-text-muted">
          {trip.destination}
          {trip.dates ? ` · ${trip.dates}` : ""}
        </div>
        {trip.memberCount > 0 && (
          <div className="mt-2 text-[11px] text-text-tertiary">
            {trip.memberCount} traveller{trip.memberCount === 1 ? "" : "s"} went
          </div>
        )}
      </div>
    </Link>
  );
}
