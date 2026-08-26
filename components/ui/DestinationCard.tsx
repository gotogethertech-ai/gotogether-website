import Image from "next/image";
import Link from "next/link";
import type { DestinationRow } from "@/lib/destinations-server";

/**
 * DestinationCard, per the Destinations Blueprint's Destination Card spec:
 * image (4:3, 14px rounded) → name → live trip count. Whole card is the
 * link, routing to Destination Details (never straight to Explore, so the
 * "bridge role" is preserved). No travel-guide metadata.
 *
 * tripCount is passed in rather than computed here — it comes from a real
 * Explore trips read (see DestinationsClient), and this component has no
 * opinion on where that count comes from.
 */
export function DestinationCard({
  destination,
  tripCount,
  size = "default",
}: {
  destination: DestinationRow;
  tripCount: number;
  size?: "default" | "compact";
}) {
  const label = tripCount === 0 ? "No trips yet" : `${tripCount} trip${tripCount === 1 ? "" : "s"} available`;
  const height = size === "compact" ? "h-[100px]" : "h-[140px]";

  return (
    <Link href={`/destinations/${destination.slug}`} className="group block">
      <div className={`relative w-full ${height} overflow-hidden rounded-[14px] bg-surface-hover transition-shadow group-hover:shadow-[0_8px_20px_-8px_oklch(20%_0.02_255/0.18)]`}>
        <Image
          src={destination.cover_image_url ?? "/placeholders/manali.svg"}
          alt={`${destination.name}${destination.category ? `, ${destination.category.replace("-", " ")} destination` : ""}`}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 900px) 33vw, 50vw"
          className="object-cover"
        />
      </div>
      <div className="mt-2 truncate text-[13.5px] font-bold text-text-primary">{destination.name}</div>
      <div className="mt-0.5 text-[11px] text-text-muted">{label}</div>
    </Link>
  );
}
