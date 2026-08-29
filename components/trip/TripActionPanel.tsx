"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TripDetail } from "@/lib/trip-details";
import { useAuth } from "@/lib/auth-context";
import { sendJoinRequest, leaveTrip } from "@/lib/real-trip-details";
import type { ViewerRelationship } from "@/lib/real-trip-details";
import { analytics } from "@/lib/analytics";
import { getOrCreateCompanyChat } from "@/lib/real-companies";

export type { ViewerRelationship };

type TripActionPanelProps = {
  trip: TripDetail;
  relationship: ViewerRelationship;
};

/**
 * Sticky CTA — desktop sidebar (persistent, pinned) collapsing to a mobile
 * bottom bar from tablet-portrait down, per Trip Details Blueprint's
 * Concept A. One component renders both forms via breakpoint classes so
 * the two stay behavior-identical, not separately built (Self-Critique
 * "Responsive layout problems" #6 flags exactly this risk).
 *
 * CTA label/state follows the blueprint's Primary Action Area table.
 * Auth interruption now goes through the real AuthModal (Authentication
 * Blueprint's Concept B) via requireAuth — a logged-out click opens the
 * modal, and success auto-fires the join action with a confirmation toast,
 * per the blueprint's "auto-resume, not redirect" architecture.
 */
export function TripActionPanel({ trip, relationship }: TripActionPanelProps) {
  const { user, requireAuth, requireVerification, requireCompleteProfile } = useAuth();
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(relationship === "pending");
  const [toast, setToast] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [left, setLeft] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const cta = resolveCta({ trip, relationship, requested });

  // Trust Score warning is conditional — only within 72 hours of departure,
  // evaluated at confirm time (not cached from page load), per the
  // Participant Trip Experience Blueprint's exact rule. No real departure
  // countdown exists in this mock data, so this defaults to the
  // non-urgent copy; the branch is left wired for when real dates land.
  const within72Hours = false;

  async function fireJoin() {
    if (!user) return;
    setRequesting(true);
    setJoinError(null);
    try {
      await sendJoinRequest(trip.id, user.id, trip.status === "full");
      analytics.tripJoinRequested(trip.id);
      setRequested(true);
      setToast(true);
      window.setTimeout(() => setToast(false), 3000);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Couldn't send your request. Try again.");
    } finally {
      setRequesting(false);
    }
  }

  async function startCompanyChat() {
    if (!trip.companyId) return;
    setChatError(null);
    setStartingChat(true);
    try {
      const roomId = await getOrCreateCompanyChat(trip.companyId);
      router.push(`/messages?room=${roomId}`);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Couldn't start a chat. Try again.");
    } finally {
      setStartingChat(false);
    }
  }

  function handleMessageCompanyClick() {
    if (!trip.companyId) return;
    requireAuth("message this company", () => startCompanyChat());
  }

  function handleClick() {
    if (!cta.actionable) return;
    if (cta.action === "manage" || cta.action === "chat") {
      if (cta.href) router.push(cta.href);
      return;
    }
    if (cta.action !== "join") return;
    const actionLabel =
      trip.kind === "partner" ? "book your spot on this trip" : "request to join this trip";
    // Request to Join is ID-verification-gated (Authentication Blueprint
    // §1.6) — chained as a second return_to after login succeeds, so an
    // already-logged-in-but-unverified visitor also hits the interstitial.
    requireAuth(actionLabel, () => requireVerification(() => requireCompleteProfile(fireJoin)));
  }

  const priceRow = (
    <>
      <Row label={trip.budgetLabel} value={trip.budget || "—"} />
      <Row
        label="Members joined"
        value={trip.membersMax ? `${trip.membersJoined} of ${trip.membersMax}` : `${trip.membersJoined}`}
      />
    </>
  );

  if (left) {
    return (
      <div className="hidden min-[900px]:block">
        <div className="rounded-[18px] border border-border p-5 text-center text-[12.5px] text-text-tertiary">
          You&apos;ve left this trip.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet-landscape sticky sidebar */}
      <div className="hidden min-[900px]:block">
        <div
          className="sticky rounded-[18px] border border-border p-5 shadow-[0_8px_24px_-10px_oklch(20%_0.02_255/0.12)]"
          style={{ top: 96 }}
        >
          <div className="mb-4 flex flex-col gap-2.5">{priceRow}</div>
          <ActionButton
            cta={cta}
            loading={requesting}
            onClick={handleClick}
            className="w-full"
          />
          {toast && <ConfirmationToast trip={trip} />}
          {joinError && !toast && (
            <p role="alert" className="mt-2.5 text-center text-[10.5px] font-medium text-danger">
              {joinError}
            </p>
          )}
          {cta.helperText && !toast && !joinError && (
            <p className="mt-2.5 text-center text-[10.5px] text-text-muted">
              {cta.helperText}
            </p>
          )}
          {trip.kind === "partner" && trip.companyId && (
            <div className="mt-3 flex flex-col gap-2 border-t border-border-divider pt-3">
              <button
                type="button"
                onClick={handleMessageCompanyClick}
                disabled={startingChat}
                className="w-full rounded-full border border-border-input py-2.5 text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover disabled:opacity-60"
              >
                {startingChat ? "Opening chat…" : `Message ${trip.organizer.name}`}
              </button>
              {trip.companyCounsellorPhone && (
                <a
                  href={`tel:${trip.companyCounsellorPhone}`}
                  className="w-full rounded-full border border-border-input py-2.5 text-center text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover"
                >
                  📞 Talk to our counsellor
                </a>
              )}
              {chatError && (
                <p role="alert" className="text-center text-[10.5px] font-medium text-danger">
                  {chatError}
                </p>
              )}
            </div>
          )}
          {relationship === "member" && (
            <button
              onClick={() => setConfirmLeave(true)}
              className="mt-3 block w-full text-center text-[11.5px] font-semibold text-danger hover:underline"
            >
              Leave this trip
            </button>
          )}
        </div>
      </div>

      {relationship === "member" && confirmLeave && (
        <LeaveTripDialog
          within72Hours={within72Hours}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={async () => {
            if (user) {
              try {
                await leaveTrip(trip.id, user.id);
              } catch {
                // The dialog already closes below regardless — a failed
                // leave just means the panel still shows "member" state,
                // which the user can retry rather than a silently stuck UI.
              }
            }
            setConfirmLeave(false);
            setLeft(true);
          }}
        />
      )}

      {/* Tablet-portrait + mobile sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 py-3.5 min-[900px]:hidden">
        {toast && (
          <div className="mb-2">
            <ConfirmationToast trip={trip} compact />
          </div>
        )}
        {chatError && (
          <p role="alert" className="mb-2 text-center text-[10.5px] font-medium text-danger">
            {chatError}
          </p>
        )}
        {trip.kind === "partner" && trip.companyId && (
          <div className="mb-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleMessageCompanyClick}
              disabled={startingChat}
              className="flex-1 rounded-full border border-border-input py-2 text-[11.5px] font-semibold text-text-secondary hover:bg-surface-hover disabled:opacity-60"
            >
              {startingChat ? "Opening chat…" : "Message company"}
            </button>
            {trip.companyCounsellorPhone && (
              <a
                href={`tel:${trip.companyCounsellorPhone}`}
                className="flex-1 rounded-full border border-border-input py-2 text-center text-[11.5px] font-semibold text-text-secondary hover:bg-surface-hover"
              >
                📞 Counsellor
              </a>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-text-muted">
              {trip.budgetLabel}
              {trip.membersMax ? ` · ${trip.membersJoined} of ${trip.membersMax} joined` : ""}
            </div>
            <div className="text-sm font-bold">{trip.budget || "—"}</div>
          </div>
          <ActionButton cta={cta} loading={requesting} onClick={handleClick} />
        </div>
      </div>
      {/* Spacer so the fixed bottom bar never overlaps page content — taller
          on a partner trip since the company chat/counsellor row adds
          height above the primary CTA row. */}
      <div className={`${trip.kind === "partner" && trip.companyId ? "h-[128px]" : "h-[76px]"} min-[900px]:hidden`} aria-hidden="true" />
    </>
  );
}

/** Leave Trip confirmation — matches Host Management's dialog pattern
 * (focus trap via Escape, aria-live consequence announcement). The Trust
 * Score warning only appears within 72 hours of departure, per the exact
 * blueprint rule — never a blanket warning at every point in a trip's life. */
function LeaveTripDialog({
  within72Hours,
  onCancel,
  onConfirm,
}: {
  within72Hours: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[100]">
      <button aria-label="Close dialog" onClick={onCancel} className="absolute inset-0 bg-[oklch(20%_0.01_255/0.45)]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-live="assertive"
        className="absolute inset-0 m-auto flex h-fit w-[92vw] max-w-[420px] flex-col rounded-[20px] bg-surface p-6 shadow-[0_24px_60px_-12px_oklch(20%_0.02_255/0.35)]"
      >
        <h2 className="mb-2 font-display text-base font-bold">Leave this trip?</h2>
        <p className="mb-2 text-[13px] leading-relaxed text-text-secondary">
          You&apos;ll lose access to this trip&apos;s chat and your spot will open up for others.
        </p>
        {within72Hours && (
          <p className="mb-3 rounded-lg bg-[oklch(96%_0.05_65)] px-3 py-2 text-[12px] leading-relaxed text-[oklch(45%_0.13_65)]">
            This trip departs within 72 hours, so leaving now may affect your Trust Score.
          </p>
        )}
        <div className="mt-2 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-full px-4 py-2.5 text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover">
            Stay in trip
          </button>
          <button
            disabled={leaving}
            onClick={() => {
              setLeaving(true);
              window.setTimeout(onConfirm, 400);
            }}
            className="rounded-full bg-danger px-5 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {leaving ? "Leaving…" : "Leave Trip"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-5 items-center justify-between gap-2.5 text-[12.5px] text-text-tertiary">
      <span className="whitespace-nowrap">{label}</span>
      <span className="font-bold whitespace-nowrap text-text-secondary">{value}</span>
    </div>
  );
}

/** Post-join confirmation, per the Authentication Blueprint's "auto-resume
 * then show a brief confirmation toast" pattern (also fires for an
 * already-logged-in visitor, not just the post-auth-modal path). */
function ConfirmationToast({
  trip,
  compact = false,
}: {
  trip: TripDetail;
  compact?: boolean;
}) {
  const message =
    trip.kind === "partner"
      ? "Spot booked — confirmation on its way."
      : `Request sent to ${trip.organizer.name}.`;
  return (
    <p
      className={`rounded-lg bg-trust-bg px-3 py-2 text-center text-[11px] font-medium text-trust-fg ${
        compact ? "" : "mt-3"
      }`}
    >
      ✓ {message}
    </p>
  );
}

type CtaResolution = {
  label: string;
  actionable: boolean;
  disabled: boolean;
  variant: "accent" | "secondary" | "disabled";
  action?: "join" | "chat" | "manage";
  href?: string;
  helperText?: string;
};

function resolveCta({
  trip,
  relationship,
  requested,
}: {
  trip: TripDetail;
  relationship: ViewerRelationship;
  requested: boolean;
}): CtaResolution {
  if (trip.status === "cancelled") {
    return { label: "This trip was cancelled", actionable: false, disabled: true, variant: "disabled" };
  }
  if (trip.status === "completed") {
    return { label: "This trip has ended", actionable: false, disabled: true, variant: "disabled" };
  }
  if (relationship === "host") {
    return {
      label: "Manage Trip",
      actionable: true,
      disabled: false,
      variant: "secondary",
      action: "manage",
      href: `/host/trips/${trip.id}/manage`,
    };
  }
  if (relationship === "member") {
    return {
      label: "Open Trip Chat",
      actionable: true,
      disabled: false,
      variant: "accent",
      action: "chat",
      href: `/messages/${trip.id}`,
    };
  }
  if (requested || relationship === "pending") {
    return {
      label: "Request Sent",
      actionable: false,
      disabled: true,
      variant: "disabled",
      helperText: "The organizer usually responds within a day.",
    };
  }
  if (trip.status === "closed") {
    return { label: "Registrations closed", actionable: false, disabled: true, variant: "disabled" };
  }
  if (trip.status === "full") {
    return {
      label: "Join Waiting List",
      actionable: true,
      disabled: false,
      variant: "secondary",
      action: "join",
    };
  }
  const isPartner = trip.kind === "partner";
  return {
    label: isPartner ? "Book Your Spot" : "Request to Join",
    actionable: true,
    disabled: false,
    variant: "accent",
    action: "join",
    helperText: isPartner ? undefined : "You'll join a planning group — no payment required",
  };
}

function ActionButton({
  cta,
  loading,
  onClick,
  className = "",
}: {
  cta: CtaResolution;
  loading: boolean;
  onClick: () => void;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-bold whitespace-nowrap font-sans transition-opacity";
  const styles =
    cta.variant === "accent"
      ? "bg-accent text-white hover:opacity-90"
      : cta.variant === "secondary"
        ? "bg-primary text-white hover:opacity-90"
        : "bg-[oklch(88%_0.01_255)] text-[oklch(60%_0.01_255)] cursor-default";

  return (
    <button
      onClick={onClick}
      disabled={cta.disabled || loading}
      aria-disabled={cta.disabled || loading}
      className={`${base} ${styles} ${className}`}
    >
      {loading ? "Sending…" : cta.label}
    </button>
  );
}
