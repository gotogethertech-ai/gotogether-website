import Image from "next/image";

/**
 * The feed card's photo layout (spec section 8): don't show all N photos
 * at once — one hero image, a 2-up split, a large-plus-two split, or a
 * 2x2 grid with a "+N" overlay on the last tile once there are more than
 * 4. Takes only the already-capped subset the feed query fetched
 * (FEED_PHOTOS_PER_CLICK in lib/real-clicks-feed.ts) plus the true total
 * count, so the "+N" reflects photos that exist but weren't even
 * downloaded, not just ones hidden client-side.
 */
export function ClickPhotoGrid({
  photos,
  totalCount,
  alt,
  rounded = false,
}: {
  photos: { imageUrl: string }[];
  totalCount: number;
  alt: string;
  rounded?: boolean;
}) {
  if (photos.length === 0) return null;
  const radius = rounded ? "rounded-[14px]" : "";

  if (photos.length === 1) {
    return (
      <div className={`relative aspect-[4/3] w-full overflow-hidden bg-surface-hover ${radius}`}>
        <Image src={photos[0].imageUrl} alt={alt} fill sizes="(min-width: 700px) 600px, 100vw" className="object-cover" />
      </div>
    );
  }

  if (photos.length === 2) {
    return (
      <div className={`grid aspect-[4/3] w-full grid-cols-2 gap-0.5 overflow-hidden bg-surface-hover ${radius}`}>
        {photos.map((p, i) => (
          <div key={i} className="relative h-full w-full">
            <Image src={p.imageUrl} alt={alt} fill sizes="300px" className="object-cover" />
          </div>
        ))}
      </div>
    );
  }

  if (photos.length === 3) {
    return (
      <div className={`grid aspect-[4/3] w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-surface-hover ${radius}`}>
        <div className="relative row-span-2 h-full w-full">
          <Image src={photos[0].imageUrl} alt={alt} fill sizes="300px" className="object-cover" />
        </div>
        <div className="relative h-full w-full">
          <Image src={photos[1].imageUrl} alt={alt} fill sizes="150px" className="object-cover" />
        </div>
        <div className="relative h-full w-full">
          <Image src={photos[2].imageUrl} alt={alt} fill sizes="150px" className="object-cover" />
        </div>
      </div>
    );
  }

  // 4 or more: 2x2 grid, last tile shows a "+N" overlay for whatever
  // remains beyond the 4 shown (spec's [Large][Small] / [Small][+7]).
  const remaining = totalCount - 4;
  return (
    <div className={`grid aspect-[4/3] w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-surface-hover ${radius}`}>
      {photos.slice(0, 4).map((p, i) => (
        <div key={i} className="relative h-full w-full">
          <Image src={p.imageUrl} alt={alt} fill sizes="150px" className="object-cover" />
          {i === 3 && remaining > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-bold text-white">+{remaining}</div>
          )}
        </div>
      ))}
    </div>
  );
}
