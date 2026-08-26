const AVATAR_TONES = [
  "oklch(85% 0.03 255)",
  "oklch(88% 0.04 185)",
  "oklch(90% 0.03 45)",
  "oklch(86% 0.03 255)",
  "oklch(88% 0.03 320)",
  "oklch(87% 0.04 120)",
];

/**
 * Members preview row — up to 6 avatars + "+N more" + numeric count, per
 * blueprint. Host-aware empty state when only the organizer has joined.
 */
export function MembersPreview({
  joined,
  max,
  isHostView = false,
}: {
  joined: number;
  max: number;
  isHostView?: boolean;
}) {
  if (joined <= 1) {
    return (
      <div className="flex items-center gap-3">
        <div
          className="h-9.5 w-9.5 flex-none rounded-full border-2 border-surface"
          style={{ width: 38, height: 38, background: AVATAR_TONES[0] }}
          aria-hidden="true"
        />
        <div className="text-[12.5px] text-text-tertiary">
          {isHostView
            ? "No one has joined yet — share your trip to find travellers."
            : "Be the first to join."}
        </div>
      </div>
    );
  }

  const shown = Math.min(joined, 6);
  const overflow = joined - shown;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex">
        {Array.from({ length: shown }).map((_, i) => (
          <div
            key={i}
            className="rounded-full border-2 border-surface"
            style={{
              width: 38,
              height: 38,
              marginLeft: i === 0 ? 0 : -8,
              background: AVATAR_TONES[i % AVATAR_TONES.length],
            }}
            aria-hidden="true"
          />
        ))}
        {overflow > 0 && (
          <div
            className="flex items-center justify-center rounded-full border-2 border-surface bg-[oklch(93%_0.005_255)] text-[10px] font-bold text-text-tertiary"
            style={{ width: 38, height: 38, marginLeft: -8 }}
          >
            +{overflow}
          </div>
        )}
      </div>
      <div className="text-[12.5px] text-text-tertiary">
        {joined} of {max} joined
      </div>
    </div>
  );
}
