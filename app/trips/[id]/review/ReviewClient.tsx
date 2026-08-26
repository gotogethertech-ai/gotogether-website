"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth-context";
import { getReviewableCoTravellers, submitReview, type ReviewableCoTraveller } from "@/lib/real-reviews";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Leave a Review — one card per accepted co-traveller (organizer included)
 * from a completed trip, each with its own star rating + optional comment,
 * submitted independently via submit_trip_review. Reachable from My
 * Trips' Going tab "Leave Review" action on any completed trip. People
 * already reviewed show as done rather than disappearing, so the page
 * reads as "here's where you stand" rather than losing your place after
 * a partial pass.
 */
export function ReviewClient({ tripId }: { tripId: string }) {
  const { user, isLoggedIn, requireAuth } = useAuth();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);
  const [tripTitle, setTripTitle] = useState("");
  const [people, setPeople] = useState<ReviewableCoTraveller[] | null>(null);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("leave a review", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getReviewableCoTravellers(tripId, user.id).then((result) => {
      if (cancelled) return;
      setTripTitle(result.tripTitle);
      setPeople(result.people);
    });
    return () => {
      cancelled = true;
    };
  }, [tripId, user]);

  function handleReviewed(personId: string) {
    setPeople((prev) => (prev ? prev.map((p) => (p.id === personId ? { ...p, alreadyReviewed: true } : p)) : prev));
  }

  if (!authChecked || !user) {
    return (
      <>
        <Header activePath="/my-trips" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header activePath="/my-trips" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[640px] px-8 py-8 pb-20 max-[599px]:px-4">
          <nav aria-label="Breadcrumb" className="mb-2 text-[11.5px] text-primary">
            <Link href={`/trips/${tripId}`} className="font-medium hover:underline">
              ← Back to trip
            </Link>
          </nav>
          <h1 className="mb-1 font-display text-xl font-bold">Leave a review</h1>
          <p className="mb-6 text-[12.5px] text-text-tertiary">
            {tripTitle ? `Rate your co-travellers from ${tripTitle}.` : "Rate your co-travellers from this trip."}{" "}
            Reviews help everyone on GoTogether know who they&apos;re travelling with.
          </p>

          {people === null ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[100px] animate-pulse rounded-2xl bg-surface-hover" />
              ))}
            </div>
          ) : people.length === 0 ? (
            <div className="rounded-2xl border border-border-divider px-6 py-12 text-center">
              <p className="text-[13.5px] text-text-tertiary">
                There&apos;s no one left to review for this trip — either it isn&apos;t completed yet, or
                you weren&apos;t an accepted member.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {people.map((p) => (
                <ReviewCard key={p.id} tripId={tripId} person={p} onReviewed={() => handleReviewed(p.id)} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ReviewCard({
  tripId,
  person,
  onReviewed,
}: {
  tripId: string;
  person: ReviewableCoTraveller;
  onReviewed: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (person.alreadyReviewed) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border-divider bg-surface-tint px-4 py-3.5">
        <Avatar avatarUrl={person.avatarUrl} initials={initialsFrom(person.name)} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">
            {person.name}
            {person.isOrganizer && <span className="ml-1.5 text-[10px] font-bold text-text-muted">ORGANIZER</span>}
          </div>
          <div className="text-[11.5px] text-trust-fg">✓ Reviewed</div>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (rating === 0) {
      setError("Choose a star rating first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReview({ tripId, revieweeId: person.id, rating, comment });
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your review. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border-divider px-4 py-4">
      <div className="mb-3 flex items-center gap-3">
        <Avatar avatarUrl={person.avatarUrl} initials={initialsFrom(person.name)} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">
            {person.name}
            {person.isOrganizer && <span className="ml-1.5 text-[10px] font-bold text-text-muted">ORGANIZER</span>}
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-1" role="radiogroup" aria-label={`Rate ${person.name}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-2xl leading-none"
          >
            <span className={star <= (hoverRating || rating) ? "text-accent" : "text-border-input"}>★</span>
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)"
        rows={2}
        maxLength={500}
        className="mb-3 w-full resize-none rounded-lg border border-border-input bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
      />

      {error && <p className="mb-2 text-[12px] text-danger">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-full bg-primary px-5 py-2 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
