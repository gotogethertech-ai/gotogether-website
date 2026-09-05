"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Avatar } from "@/components/Avatar";
import { LikeButton } from "@/components/clicks/LikeButton";
import { FollowButton } from "@/components/clicks/FollowButton";
import { CommentsSection } from "@/components/clicks/CommentsSection";
import { ReportModal } from "@/components/clicks/ReportModal";
import { useAuth } from "@/lib/auth-context";
import { CLICK_TRIP_TYPES } from "@/lib/real-clicks";
import { getClickLikeState } from "@/lib/real-clicks-social";
import { getOrCreateDirectUserChat } from "@/lib/real-chat";
import type { ClickDetail } from "@/lib/real-clicks-feed";

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const startLabel = new Date(start).toLocaleDateString("en-US", opts);
  if (!end || end === start) return startLabel;
  return `${startLabel} – ${new Date(end).toLocaleDateString("en-US", opts)}`;
}

/**
 * Click detail page — spec section 9: a travel-journal-feeling page, not a
 * caption-under-a-photo social post. Full photo gallery + full-screen
 * viewer (spec section 8's "clicking the photos opens a full-screen
 * gallery"). Follow (Phase 3) and Message (Phase 4) are both real actions:
 * Message starts/resumes a direct chat via get_or_create_direct_chat
 * (migration 064) and navigates to it, the same pattern
 * TripActionPanel.startCompanyChat uses for "Message [Company]".
 */
export function ClickDetailClient({ click }: { click: ClickDetail }) {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [likeState, setLikeState] = useState<{ count: number; isLiked: boolean }>({
    count: click.likeCount,
    isLiked: false,
  });
  const [startingChat, setStartingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getClickLikeState(click.id, user?.id ?? null).then((state) => {
      if (!cancelled) setLikeState(state);
    });
    return () => {
      cancelled = true;
    };
  }, [click.id, user?.id]);

  const isOwnClick = user?.id === click.author.id;
  const dateRange = formatDateRange(click.startDate, click.endDate);
  const tripTypeLabel = click.tripType ? CLICK_TRIP_TYPES.find((t) => t.value === click.tripType)?.label : null;

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function startChat() {
    setChatError(null);
    setStartingChat(true);
    try {
      const roomId = await getOrCreateDirectUserChat(click.author.id);
      router.push(`/messages?room=${roomId}`);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Couldn't start a chat. Try again.");
    } finally {
      setStartingChat(false);
    }
  }

  function handleMessage() {
    requireAuth("message this traveller", startChat);
  }

  return (
    <>
      <Header activePath="/clicks" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[720px] px-6 py-6 max-[599px]:px-0">
          <div className="mb-4 flex items-center justify-between px-6 max-[599px]:px-4">
            <Link href="/clicks" className="text-sm font-semibold text-text-secondary hover:text-primary">
              ← Back
            </Link>
            <div className="flex items-center gap-2">
              <button onClick={handleShare} className="text-[12.5px] font-semibold text-text-secondary hover:text-primary">
                ↗ Share
              </button>
              {copied && <span className="text-[11px] font-semibold text-trust-fg">Link copied</span>}
              {!isOwnClick && (
                <button
                  onClick={() => requireAuth("report this Click", () => setReportOpen(true))}
                  aria-label="Report this Click"
                  className="text-[12.5px] font-semibold text-text-secondary hover:text-primary"
                >
                  ⋯
                </button>
              )}
            </div>
          </div>

          {click.coverImageUrl && (
            <button onClick={() => setGalleryIndex(0)} className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-hover max-[599px]:aspect-square">
              <Image src={click.coverImageUrl} alt={click.title} fill sizes="720px" className="object-cover" priority />
            </button>
          )}

          <div className="px-6 pt-5 max-[599px]:px-4">
            <h1 className="mb-4 font-display text-[26px] font-bold leading-tight">{click.title}</h1>

            <div className="mb-5 flex items-center justify-between">
              <Link href={`/profile/${click.author.id}`} className="flex items-center gap-2.5">
                <Avatar avatarUrl={click.author.avatarUrl} initials={click.author.initials} size={40} />
                <div>
                  <div className="flex items-center gap-1 text-[14px] font-bold">
                    {click.author.name}
                    {click.author.verificationStatus === "id_verified" && (
                      <span title="ID Verified" className="text-primary">✓</span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted">Traveller</div>
                </div>
              </Link>
              {!isOwnClick && (
                <div className="flex gap-2">
                  <FollowButton targetUserId={click.author.id} />
                  <button
                    onClick={handleMessage}
                    disabled={startingChat}
                    className="rounded-full border border-border px-4 py-1.5 text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover disabled:opacity-60"
                  >
                    {startingChat ? "Opening chat…" : "Message"}
                  </button>
                </div>
              )}
              {isOwnClick && (
                // Editing a published Click isn't built yet (tracked for a
                // later phase) — this is a visible placeholder, not a
                // dead link to a page that doesn't exist.
                <span className="rounded-full bg-surface-tint px-4 py-1.5 text-[12.5px] font-semibold text-text-muted">This is your Click</span>
              )}
            </div>

            {chatError && <p className="mb-3 text-[11.5px] font-medium text-danger">{chatError}</p>}

            <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-text-tertiary">
              {click.destination && <span>📍 {click.destination}</span>}
              {dateRange && <span>🗓 {dateRange}</span>}
              {tripTypeLabel && <span className="rounded-md bg-surface-tint px-2 py-0.5 text-[11px] font-semibold">{tripTypeLabel}</span>}
            </div>

            {click.tripId && click.tripTitle && (
              <Link href={`/trips/${click.tripId}`} className="mb-5 block rounded-xl border border-border-partner bg-surface-tint px-4 py-2.5 text-[12.5px] text-text-secondary hover:bg-surface-hover">
                This Click is from: <span className="font-semibold text-primary">{click.tripTitle}</span> →
              </Link>
            )}

            <div className="mb-6 whitespace-pre-wrap text-[14.5px] leading-relaxed text-text-primary">{click.story}</div>

            {click.allPhotos.length > 1 && (
              <div className="mb-6 grid grid-cols-3 gap-1.5">
                {click.allPhotos.map((photo, i) => (
                  <button key={photo.id} onClick={() => setGalleryIndex(i)} className="relative aspect-square overflow-hidden rounded-lg bg-surface-hover">
                    <Image src={photo.imageUrl} alt="" fill sizes="200px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-5 border-b border-border-divider py-4 text-[13px] text-text-muted">
              <LikeButton clickId={click.id} initialLiked={likeState.isLiked} initialCount={likeState.count} />
              <span>💬 {click.commentCount} comments</span>
            </div>

            <CommentsSection clickId={click.id} />
          </div>
        </div>
      </main>
      <Footer />

      {galleryIndex !== null && (
        <FullScreenGallery
          photos={click.allPhotos}
          index={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          onNavigate={setGalleryIndex}
        />
      )}

      {reportOpen && <ReportModal contentType="click" contentId={click.id} onClose={() => setReportOpen(false)} />}
    </>
  );
}

function FullScreenGallery({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: { id: string; imageUrl: string }[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button aria-label="Close" onClick={onClose} className="absolute top-4 right-4 text-2xl text-white">
        ✕
      </button>
      {index > 0 && (
        <button
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index - 1);
          }}
          className="absolute left-4 text-3xl text-white"
        >
          ‹
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index + 1);
          }}
          className="absolute right-4 text-3xl text-white"
        >
          ›
        </button>
      )}
      <div className="relative h-[80vh] w-[90vw] max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <Image src={photo.imageUrl} alt="" fill sizes="90vw" className="object-contain" />
      </div>
      <div className="absolute bottom-4 text-[12px] text-white/70">
        {index + 1} / {photos.length}
      </div>
    </div>
  );
}
