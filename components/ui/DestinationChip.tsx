import Image from "next/image";
import Link from "next/link";

export function DestinationChip({
  name,
  imgSrc,
}: {
  name: string;
  imgSrc: string;
}) {
  return (
    <Link
      href={`/explore?destination=${encodeURIComponent(name)}`}
      className="flex-none w-40 text-center"
    >
      <div className="relative h-[110px] w-40 overflow-hidden rounded-2xl bg-surface-hover">
        <Image
          src={imgSrc}
          alt={`${name} — trips departing from Delhi NCR`}
          fill
          sizes="160px"
          className="object-cover"
        />
      </div>
      <div className="mt-2 truncate text-[12.5px] font-semibold">{name}</div>
    </Link>
  );
}
