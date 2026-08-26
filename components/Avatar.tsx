"use client";

/**
 * Shared avatar circle: renders the user's uploaded photo (avatarUrl) when
 * present, falling back to the initials circle everywhere else in the app
 * already uses. Centralized so every surface (header menu, profile page,
 * edit form) falls back the same way instead of re-implementing the
 * img-vs-initials branch independently.
 *
 * Plain <img> rather than next/image: avatar hosts are user-controlled
 * Supabase Storage public URLs, which would otherwise require a
 * next.config remote-pattern entry; these are small thumbnails so the
 * optimization tradeoff isn't worth that coupling.
 */
export function Avatar({
  avatarUrl,
  initials,
  size,
  alt = "",
  className = "",
  onClick,
}: {
  avatarUrl?: string | null;
  initials: string;
  size: number;
  /** Pass a real name for a clickable/enlargeable avatar (e.g. "Riya Anand's photo"); leave empty for decorative-only uses. */
  alt?: string;
  className?: string;
  onClick?: () => void;
}) {
  const baseClassName = `flex-none rounded-full ${onClick ? "cursor-pointer" : ""} ${className}`;
  const style = { width: size, height: size };

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={alt}
        onClick={onClick}
        className={`${baseClassName} object-cover`}
        style={style}
      />
    );
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      aria-hidden={onClick ? undefined : "true"}
      aria-label={onClick ? alt : undefined}
      onClick={onClick}
      className={`${baseClassName} flex items-center justify-center bg-surface-avatar font-bold text-[oklch(40%_0.1_255)]`}
      style={{ ...style, fontSize: Math.max(11, Math.round(size * 0.32)) }}
    >
      {initials}
    </div>
  );
}
