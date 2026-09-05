import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ClickPhotoGrid } from "@/components/clicks/ClickPhotoGrid";
import type { ClickListItem } from "@/lib/real-clicks-feed";

/** Relative-ish date label ("2d ago", "3w ago") for feed cards — short by
 * design, matching the spec's "Post date" field without repeating a full
 * timestamp per card in a scrolling feed. */
function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "Today";
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  if (diffMs < 30 * day) return `${Math.floor(diffMs / (7 * day))}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * A single travel-story card in the Clicks feed — per spec section 2's
 * layout: author row, title, photos, destination, a short excerpt of the
 * story, and real like/comment counts (Phase 3). The counts link through
 * to the detail page rather than acting as inline toggles here, so the
 * feed doesn't need a per-card "does the viewer like this" query — that
 * viewer-specific state is only fetched once, on the detail page itself.
 */
export function ClickCard({ click }: { click: ClickListItem }) {
  const excerpt = click.story.length > 180 ? `${click.story.slice(0, 180).trimEnd()}…` : click.story;

  return (
    <article className="overflow-hidden rounded-[18px] border border-border bg-surface">
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5">
        <Link href={`/profile/${click.author.id}`} className="flex items-center gap-2.5">
          <Avatar avatarUrl={click.author.avatarUrl} initials={click.author.initials} size={34} />
          <div>
            <div className="flex items-center gap-1 text-[13px] font-bold">
              {click.author.name}
              {click.author.verificationStatus === "id_verified" && (
                <span title="ID Verified" aria-label="ID Verified" className="text-primary">
                  ✓
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-text-muted">{relativeDate(click.createdAt)}</div>
          </div>
        </Link>
      </div>

      <Link href={`/clicks/${click.id}`} className="block">
        <ClickPhotoGrid photos={click.photos} totalCount={click.photoCount} alt={click.title} />
      </Link>

      <div className="p-3.5">
        <Link href={`/clicks/${click.id}`}>
          <h3 className="mb-1 text-[15px] font-bold hover:text-primary">{click.title}</h3>
        </Link>
        {click.destination && <div className="mb-1.5 text-[11.5px] text-text-tertiary">📍 {click.destination}</div>}
        {excerpt && <p className="mb-3 text-[12.5px] leading-relaxed text-text-secondary">{excerpt}</p>}

        <div className="flex items-center gap-4 text-[12px] text-text-muted">
          <Link href={`/clicks/${click.id}`} className="flex items-center gap-1.5 hover:text-text-secondary">
            <span>❤️</span>
            <span>{click.likeCount}</span>
          </Link>
          <Link href={`/clicks/${click.id}`} className="flex items-center gap-1.5 hover:text-text-secondary">
            <span>💬</span>
            <span>{click.commentCount}</span>
          </Link>
          <span className="ml-auto">↗ Share</span>
        </div>
      </div>
    </article>
  );
}
