"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth, MINIMUM_AGE } from "@/lib/auth-context";
import type {
  PendingApplicant,
  Participant,
  WaitingListEntry,
} from "@/lib/host-management-data";
import type { HostedTrip } from "@/lib/my-trips-data";
import {
  getRealHostManagement,
  acceptJoinRequest,
  rejectJoinRequest,
  removeParticipant,
  cancelTrip,
  publishDraftTrip,
  deleteDraftTrip,
  updateTripDetails,
  closeRegistrations,
  getEditableTripFields,
  type EditableTripFields,
} from "@/lib/real-host-management";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";
import { RangeSlider } from "@/components/ui/RangeSlider";

type TabKey = "overview" | "requests" | "participants" | "edit";

const AVAILABILITY_WINDOW_DAYS = 120;
const DURATION_MIN_DAYS = 1;
const DURATION_MAX_DAYS = 14;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOffset(base: string, iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - new Date(base).getTime()) / 86400000));
}

/**
 * Host Trip Management — Concept C from the approved blueprint: a compact
 * Overview landing page, with Requests/Participants/Edit as tabs that only
 * appear when relevant to the current trip state (no "Requests" tab on a
 * Draft or Cancelled trip — the blueprint explicitly warns against a
 * static 4-tab set that shows empty/irrelevant tabs). Entirely separate
 * from Trip Details (reused unmodified by public/participant viewers) —
 * reached via My Trips' "Manage Trip" CTA.
 */
export function HostManagementClient({ tripId }: { tripId: string }) {
  const { user, isLoggedIn, requireAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("manage your trip", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [trip, setTrip] = useState<HostedTrip | null>(null);
  const [pending, setPending] = useState<PendingApplicant[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [status, setStatus] = useState<HostedTrip["status"]>("live");
  const [membersMax, setMembersMax] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyResult = useCallback((result: Awaited<ReturnType<typeof getRealHostManagement>>) => {
    if (!result) {
      setNotFound(true);
      setLoaded(true);
      return;
    }
    setTrip(result.trip);
    setPending(result.record.pendingApplicants);
    setParticipants(result.record.participants);
    setWaitingList(result.record.waitingList);
    setStatus(result.trip.status);
    setMembersMax(result.trip.membersMax ?? result.record.participants.length);
    setLoaded(true);
  }, []);

  // load() is called both from this mount effect and from mutation
  // handlers below (accept/reject/remove/etc. re-fetch after writing) — so
  // it can't itself be the effect body (react-hooks/set-state-in-effect
  // flags a same-tick setState-only async call as the entire effect body).
  // The mount effect instead fetches inline and hands the result to
  // applyResult, which every handler below also reuses via load().
  const load = useCallback(async () => {
    if (!user) return;
    const result = await getRealHostManagement(tripId, user.id);
    applyResult(result);
  }, [tripId, user, applyResult]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getRealHostManagement(tripId, user.id).then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [user, tripId, applyResult]);

  const tabParam = searchParams.get("tab");
  const availableTabs = tabsForStatus(status);
  const activeTab: TabKey = availableTabs.includes(tabParam as TabKey)
    ? (tabParam as TabKey)
    : "overview";

  function setTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/host/trips/${tripId}/manage?${params.toString()}`, { scroll: false });
  }

  if (!authChecked || !loaded) {
    return (
      <>
        <Header activePath="/my-trips" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  if (notFound || !trip) {
    return (
      <>
        <Header activePath="/my-trips" />
        <main className="flex-1 bg-surface">
          <div className="mx-auto max-w-[860px] px-8 py-24 text-center text-[13.5px] text-text-tertiary">
            This trip doesn&apos;t exist or you don&apos;t organize it.{" "}
            <Link href="/my-trips?tab=hosting" className="font-semibold text-primary hover:underline">
              Back to My Trips
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const membersJoined = participants.length;

  async function handleAccept(applicant: PendingApplicant) {
    setActionError(null);
    try {
      await acceptJoinRequest(tripId, applicant.id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't accept this request. Try again.");
    }
  }

  async function handleReject(applicantId: string) {
    setActionError(null);
    try {
      await rejectJoinRequest(tripId, applicantId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't reject this request. Try again.");
    }
  }

  async function handleRemove(participantId: string, reason: string) {
    setActionError(null);
    try {
      await removeParticipant(tripId, participantId, reason);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't remove this participant. Try again.");
    }
  }

  async function handlePublish() {
    setActionError(null);
    try {
      await publishDraftTrip(tripId);
      await load();
      setTab("overview" as TabKey);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't publish this trip. Try again.");
    }
  }

  async function handleDeleteDraft() {
    setActionError(null);
    try {
      await deleteDraftTrip(tripId);
      router.push("/my-trips?tab=hosting");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't delete this draft. Try again.");
    }
  }

  async function handleCancel(reason: string) {
    setActionError(null);
    try {
      await cancelTrip(tripId, reason);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't cancel this trip. Try again.");
    }
  }

  async function handleCloseRegistrations() {
    setActionError(null);
    try {
      await closeRegistrations(tripId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't close registrations. Try again.");
    }
  }

  async function handleSaveEdit(patch: Partial<EditableTripFields>) {
    await updateTripDetails(tripId, patch);
    await load();
  }

  return (
    <>
      <Header activePath="/my-trips" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[1000px] px-8 py-6 pb-20 max-[599px]:px-4">
          <div className="mb-4">
            <Link href="/my-trips?tab=hosting" className="text-[11.5px] font-semibold text-primary hover:underline">
              ← My Trips
            </Link>
          </div>

          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-xl font-bold">{trip.title}</h1>
            {/* "You're viewing this as it appears to others" framing, per
                self-critique — a host must never confuse this read-only
                link with an editable surface. */}
            <Link
              href={`/trips/${tripId}`}
              className="text-[11.5px] font-semibold text-text-tertiary hover:text-primary"
              title="Opens the public trip page — what travellers see, not editable here"
            >
              View as travellers see it →
            </Link>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2 text-[12.5px] text-text-tertiary">
            <StatusPill status={status} />
            <span>
              {trip.destination}
              {trip.dates ? ` · ${trip.dates}` : ""}
            </span>
          </div>

          {status !== "draft" && status !== "cancelled" && status !== "completed" && (
            <div className="mb-6 grid grid-cols-2 gap-3 max-w-[420px]">
              <StatCard value={`${membersJoined} of ${membersMax}`} label="spots filled" />
              <StatCard value={trip.dates ?? "—"} label="dates" />
            </div>
          )}

          {status === "cancelled" && (
            <div className="mb-6 rounded-2xl bg-[oklch(96%_0.03_25)] px-5 py-4 text-[12.5px] text-[oklch(45%_0.15_25)]">
              <div className="mb-1 font-bold">This trip was cancelled</div>
              <p>{trip.cancelledReason ?? "Cancelled by the organizer."}</p>
              <p className="mt-2 text-[11.5px] text-[oklch(50%_0.13_25)]">
                This is final — a cancelled trip can&apos;t be reopened. Create a new trip to plan again.
              </p>
            </div>
          )}

          {actionError && (
            <div className="mb-6 rounded-xl bg-[oklch(96%_0.03_25)] px-4 py-3 text-[12px] font-medium text-[oklch(45%_0.15_25)]">
              {actionError}
            </div>
          )}

          {status === "completed" && (
            <div className="mb-6 rounded-2xl bg-surface-tint px-5 py-4 text-[12.5px] text-text-secondary">
              This trip has ended. The summary below is read-only.
            </div>
          )}

          {pending.length > 0 && status !== "draft" && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-[oklch(94%_0.05_255)] px-5 py-3.5">
              <span className="text-[12.5px] font-semibold text-primary">
                {pending.length} pending request{pending.length === 1 ? "" : "s"} need{pending.length === 1 ? "s" : ""} your response
              </span>
              <button onClick={() => setTab("requests")} className="text-[12px] font-bold text-primary hover:underline">
                View Requests →
              </button>
            </div>
          )}

          {availableTabs.length > 1 && (
            <div role="tablist" aria-label="Trip management sections" className="mb-6 flex gap-6 border-b border-border-divider">
              {availableTabs.map((tab) => (
                <TabButton key={tab} active={activeTab === tab} onClick={() => setTab(tab)}>
                  {TAB_LABELS[tab]}
                  {tab === "requests" && pending.length > 0 ? ` (${pending.length})` : ""}
                </TabButton>
              ))}
            </div>
          )}

          {activeTab === "overview" && (
            <OverviewTab
              trip={trip}
              status={status}
              pending={pending}
              participants={participants}
              onAccept={handleAccept}
              onReject={handleReject}
              onPublish={handlePublish}
              onDeleteDraft={handleDeleteDraft}
              onCancel={handleCancel}
              onCloseRegistrations={handleCloseRegistrations}
              onViewTab={setTab}
            />
          )}
          {activeTab === "requests" && (
            <RequestsTab pending={pending} waitingList={waitingList} onAccept={handleAccept} onReject={handleReject} />
          )}
          {activeTab === "participants" && (
            <ParticipantsTab
              participants={participants}
              waitingList={waitingList}
              membersMax={membersMax}
              onRemove={handleRemove}
            />
          )}
          {activeTab === "edit" && user && (
            <EditTab tripId={tripId} organizerId={user.id} membersJoined={membersJoined} onSave={handleSaveEdit} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  requests: "Requests",
  participants: "Participants",
  edit: "Edit",
};

function tabsForStatus(status: string): TabKey[] {
  // Draft: ONLY Overview, per the blueprint's state matrix. Completed/
  // Cancelled: Overview + read-only Participants, no Requests/Edit.
  if (status === "draft") return ["overview"];
  if (status === "completed" || status === "cancelled") return ["overview", "participants"];
  return ["overview", "requests", "participants", "edit"];
}

function StatusPill({ status }: { status: string }) {
  const label =
    status === "draft"
      ? "Draft"
      : status === "full"
        ? "Full"
        : status === "in-progress"
          ? "In Progress"
          : status === "completed"
            ? "Completed"
            : status === "cancelled"
              ? "Cancelled"
              : "Published · Accepting";
  const cls =
    status === "cancelled"
      ? "bg-[oklch(96%_0.03_25)] text-[oklch(45%_0.15_25)]"
      : status === "draft"
        ? "bg-surface-tint text-text-tertiary"
        : status === "completed"
          ? "bg-surface-tint text-text-tertiary"
          : "bg-trust-bg text-trust-fg";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-bold ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-tint px-4 py-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10.5px] text-text-muted">{label}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`pb-3 text-[13px] font-semibold ${
        active ? "border-b-2 border-primary text-primary" : "text-text-tertiary hover:text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function OverviewTab({
  trip,
  status,
  pending,
  participants,
  onAccept,
  onReject,
  onPublish,
  onDeleteDraft,
  onCancel,
  onCloseRegistrations,
  onViewTab,
}: {
  trip: HostedTrip;
  status: string;
  pending: PendingApplicant[];
  participants: Participant[];
  onAccept: (a: PendingApplicant) => void;
  onReject: (id: string) => void;
  onPublish: () => void;
  onDeleteDraft: () => void;
  onCancel: (reason: string) => void;
  onCloseRegistrations: () => void;
  onViewTab: (tab: TabKey) => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (status === "draft") {
    return (
      <div className="max-w-[520px]">
        <p className="mb-4 text-[13px] text-text-secondary">
          This trip isn&apos;t visible to anyone yet.
          {trip.draftExpiresInDays !== undefined && (
            <> Drafts expire after 14 days of inactivity — this one expires in {trip.draftExpiresInDays} day{trip.draftExpiresInDays === 1 ? "" : "s"}.</>
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/create-trip?resume=${trip.tripId}`}
            className="rounded-full bg-primary px-5 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90"
          >
            Continue Editing
          </Link>
          <button
            onClick={onPublish}
            className="rounded-full bg-accent px-5 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90"
          >
            Publish
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-full border border-border-input px-5 py-2.5 text-[12.5px] font-semibold text-danger hover:bg-surface-hover"
          >
            Delete
          </button>
        </div>
        {confirmDelete && (
          <ConfirmDialog
            title="Delete this draft? This can't be undone."
            confirmLabel="Delete"
            danger
            onConfirm={() => {
              setConfirmDelete(false);
              onDeleteDraft();
            }}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {(status === "live" || status === "full") && pending.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold">Pending requests</h2>
            <button onClick={() => onViewTab("requests")} className="text-[12px] font-semibold text-primary hover:underline">
              View all →
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {pending.slice(0, 3).map((applicant) => (
              <RequestRow key={applicant.id} applicant={applicant} onAccept={onAccept} onReject={onReject} />
            ))}
          </div>
        </div>
      )}

      {(status === "live" || status === "full") && pending.length === 0 && (
        <p className="mb-8 text-[12.5px] text-text-tertiary">
          No requests yet. Share your trip to reach more travellers.
        </p>
      )}

      {status === "completed" && (
        <p className="mb-8 text-[12.5px] text-text-tertiary">
          {participants.length} traveller{participants.length === 1 ? "" : "s"} went on this trip.
        </p>
      )}

      {(status === "live" || status === "full") && (
        <div className="rounded-2xl border border-border p-5">
          <h2 className="mb-3 font-display text-base font-bold">Trip settings</h2>
          <div className="flex items-center justify-between border-b border-border-divider py-3">
            <div>
              <div className="text-[13px] font-semibold">Close registrations</div>
              <div className="text-[11px] text-text-muted">Existing pending requests stay actionable</div>
            </div>
            <button
              onClick={onCloseRegistrations}
              className="rounded-full border border-border-input px-4 py-2 text-[12px] font-semibold hover:bg-surface-hover"
            >
              Close
            </button>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[oklch(96%_0.03_25)] px-3 py-3 -mx-3 mt-1">
            <div>
              <div className="text-[13px] font-semibold text-[oklch(45%_0.15_25)]">Cancel this trip</div>
              <div className="text-[11px] text-[oklch(50%_0.13_25)]">Notifies all {participants.length - 1} member{participants.length - 1 === 1 ? "" : "s"}, can&apos;t be undone</div>
            </div>
            <button
              onClick={() => setConfirmCancel(true)}
              className="rounded-full border border-[oklch(70%_0.15_25)] px-4 py-2 text-[12px] font-semibold text-[oklch(45%_0.15_25)] hover:bg-[oklch(93%_0.04_25)]"
            >
              Cancel Trip
            </button>
          </div>
        </div>
      )}

      {confirmCancel && (
        <ConfirmDialog
          title={`Cancel this trip? This will notify ${participants.length - 1} member${participants.length - 1 === 1 ? "" : "s"} and can't be undone.`}
          confirmLabel="Cancel Trip"
          danger
          requireReason
          onConfirm={(reason) => {
            setConfirmCancel(false);
            onCancel(reason);
          }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  );
}

function RequestsTab({
  pending,
  waitingList,
  onAccept,
  onReject,
}: {
  pending: PendingApplicant[];
  waitingList: WaitingListEntry[];
  onAccept: (a: PendingApplicant) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 font-display text-base font-bold">Pending ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="mb-8 text-[12.5px] text-text-tertiary">
          No requests yet. Share your trip to reach more travellers.
        </p>
      ) : (
        <div className="mb-8 flex flex-col gap-2">
          {pending.map((applicant) => (
            <RequestRow key={applicant.id} applicant={applicant} onAccept={onAccept} onReject={onReject} />
          ))}
        </div>
      )}

      {waitingList.length > 0 && (
        <>
          {/* Strong visual/heading separation from Pending, per self-critique
              — a host must never confuse these read-only rows with
              actionable requests. */}
          <h2 className="mb-1 font-display text-base font-bold text-text-tertiary">
            Waiting List ({waitingList.length})
          </h2>
          <p className="mb-3 text-[11px] text-text-muted">
            Automatically promoted in order as spots open up — no manual reordering.
          </p>
          <div className="flex flex-col gap-2">
            {waitingList.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl bg-surface-tint px-4 py-3"
              >
                <Avatar initials={entry.initials} />
                <span className="flex-1 text-[13px] font-semibold">{entry.name}</span>
                <span className="text-[11px] text-text-muted">#{entry.position} in line</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RequestRow({
  applicant,
  onAccept,
  onReject,
}: {
  applicant: PendingApplicant;
  onAccept: (a: PendingApplicant) => void;
  onReject: (id: string) => void;
}) {
  const [processing, setProcessing] = useState<"accept" | "reject" | null>(null);
  const urgent = applicant.hoursRemaining <= 24;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
      <Avatar initials={applicant.initials} />
      <div className="flex-1">
        <div className="text-[13px] font-semibold">{applicant.name}</div>
        <div className="text-[11px] text-text-muted">
          ⭐ {applicant.trustScore} · requested {applicant.requestedDaysAgo} day{applicant.requestedDaysAgo === 1 ? "" : "s"} ago
        </div>
      </div>
      <span className={`text-[10.5px] font-semibold ${urgent ? "text-danger" : "text-text-muted"}`}>
        {applicant.hoursRemaining}h left
      </span>
      <Link href={`/profile/${applicant.id}`} className="text-[11px] font-semibold text-primary hover:underline">
        View Profile
      </Link>
      <button
        disabled={!!processing}
        onClick={() => {
          setProcessing("reject");
          window.setTimeout(() => onReject(applicant.id), 400);
        }}
        className="rounded-full border border-border-input px-3.5 py-1.5 text-[11.5px] font-semibold text-text-secondary hover:bg-surface-hover disabled:opacity-60"
      >
        {processing === "reject" ? "…" : "Reject"}
      </button>
      <button
        disabled={!!processing}
        onClick={() => {
          setProcessing("accept");
          window.setTimeout(() => onAccept(applicant), 400);
        }}
        className="rounded-full bg-primary px-3.5 py-1.5 text-[11.5px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {processing === "accept" ? "…" : "Accept"}
      </button>
    </div>
  );
}

function ParticipantsTab({
  participants,
  waitingList,
  membersMax,
  onRemove,
}: {
  participants: Participant[];
  waitingList: WaitingListEntry[];
  membersMax: number;
  onRemove: (id: string, reason: string) => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState<Participant | null>(null);

  return (
    <div>
      <h2 className="mb-3 font-display text-base font-bold">
        {participants.length} of {membersMax} confirmed
      </h2>
      {participants.length <= 1 ? (
        <p className="mb-8 text-[12.5px] text-text-tertiary">No one else has joined yet</p>
      ) : (
        <div className="mb-8 flex flex-col gap-2">
          {participants.map((p) =>
            p.role === "organizer" ? (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-tint px-4 py-3">
                <Avatar initials={p.initials} />
                <div className="flex-1">
                  {/* Styled distinctly so it's never mistaken for an
                      actionable/removable participant, per self-critique. */}
                  <div className="text-[13px] font-bold text-primary">You (Organizer)</div>
                </div>
              </div>
            ) : (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                <Avatar initials={p.initials} />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">{p.name}</div>
                  <div className="text-[11px] text-text-muted">
                    ⭐ {p.trustScore} · {p.joinedDate}
                  </div>
                </div>
                <Link href={`/profile/${p.id}`} className="text-[11px] font-semibold text-primary hover:underline">
                  View Profile
                </Link>
                <button
                  onClick={() => setConfirmRemove(p)}
                  className="rounded-full border border-border-input px-3.5 py-1.5 text-[11.5px] font-semibold text-danger hover:bg-surface-hover"
                >
                  Remove
                </button>
              </div>
            )
          )}
        </div>
      )}

      {waitingList.length > 0 && (
        <>
          <h2 className="mb-1 font-display text-base font-bold text-text-tertiary">
            Waiting List ({waitingList.length})
          </h2>
          <div className="flex flex-col gap-2">
            {waitingList.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-surface-tint px-4 py-3">
                <Avatar initials={entry.initials} />
                <span className="flex-1 text-[13px] font-semibold">{entry.name}</span>
                <span className="text-[11px] text-text-muted">#{entry.position} in line</span>
              </div>
            ))}
          </div>
        </>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title={`Remove ${confirmRemove.name} from this trip? This can't be undone.`}
          confirmLabel="Remove"
          danger
          requireReason
          onConfirm={(reason) => {
            onRemove(confirmRemove.id, reason);
            setConfirmRemove(null);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}

const GENDER_OPTIONS: { value: EditableTripFields["genderRestriction"]; label: string }[] = [
  { value: "any", label: "Mixed" },
  { value: "women_only", label: "Women Only" },
  { value: "men_only", label: "Men Only" },
];

/** Edit tab — expanded to cover every field the trips table actually has
 * (previously only title + max group size were editable here, even though
 * description, dates, budget, age range, gender restriction, destination,
 * and cover image were all real, saveable columns going unused). Fetches
 * its own wider row via getEditableTripFields rather than reusing the thin
 * HostedTrip shape, which stays intentionally light for list/overview
 * views. */
function EditTab({
  tripId,
  organizerId,
  membersJoined,
  onSave,
}: {
  tripId: string;
  organizerId: string;
  membersJoined: number;
  onSave: (patch: Partial<EditableTripFields>) => Promise<void>;
}) {
  const [fields, setFields] = useState<EditableTripFields | null>(null);
  const [destinations, setDestinations] = useState<AdminDestinationRow[] | null>(null);
  const today = useState(() => todayIso())[0];
  const [loadError, setLoadError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [maxError, setMaxError] = useState("");
  const [ageError, setAgeError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getEditableTripFields(tripId, organizerId), getDestinations()]).then(([tripFields, dests]) => {
      if (cancelled) return;
      if (!tripFields) {
        setLoadError(true);
        return;
      }
      setFields(tripFields);
      setDestinations(dests);
    });
    return () => {
      cancelled = true;
    };
  }, [tripId, organizerId]);

  function update<K extends keyof EditableTripFields>(key: K, value: EditableTripFields[K]) {
    setFields((f) => (f ? { ...f, [key]: value } : f));
    setDirty(true);
  }

  function handleSave() {
    if (!fields) return;
    if (fields.maxGroupSize < membersJoined) {
      setMaxError(`Can't be lower than ${membersJoined} — that's how many have already joined.`);
      return;
    }
    setMaxError("");
    if (fields.minAge != null && fields.minAge < MINIMUM_AGE) {
      setAgeError(`Minimum age can't be less than ${MINIMUM_AGE}.`);
      return;
    }
    if (fields.maxAge != null && fields.minAge != null && fields.maxAge < fields.minAge) {
      setAgeError("Maximum age can't be less than minimum age.");
      return;
    }
    setAgeError("");
    if (membersJoined > 1) {
      setConfirmSave(true);
      return;
    }
    commitSave();
  }

  async function commitSave() {
    if (!fields) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave({
        title: fields.title.trim(),
        description: fields.description.trim(),
        destinationId: fields.destinationId,
        availabilityStart: fields.availabilityStart,
        availabilityEnd: fields.availabilityEnd,
        durationMin: fields.durationMin,
        durationMax: fields.durationMax,
        maxGroupSize: fields.maxGroupSize,
        budgetMin: fields.budgetMin,
        budgetMax: fields.budgetMax,
        minAge: fields.minAge,
        maxAge: fields.maxAge,
        genderRestriction: fields.genderRestriction,
        coverImageUrl: fields.coverImageUrl,
      });
      setSaved(true);
      setDirty(false);
      setConfirmSave(false);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save changes. Try again.");
      setConfirmSave(false);
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return <p className="text-[12.5px] text-danger">Couldn&apos;t load this trip&apos;s details. Try refreshing.</p>;
  }
  if (!fields || !destinations) {
    return <div className="h-[300px] max-w-[560px] animate-pulse rounded-2xl bg-[oklch(95%_0.003_255)]" />;
  }

  return (
    <div className="max-w-[560px]">
      {/* Reuses Create Trip's exact field styling — a single scrollable
          form with clear visual grouping (self-critique), not a flat list
          or the multi-step wizard Create Trip itself uses. */}
      <FieldGroup title="Trip details">
        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">Title</label>
        <input
          value={fields.title}
          onChange={(e) => update("title", e.target.value)}
          className="mb-4 w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
        />

        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">Description</label>
        <textarea
          value={fields.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          className="mb-4 w-full resize-none rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
        />

        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">Destination</label>
        <select
          value={fields.destinationId}
          onChange={(e) => update("destinationId", e.target.value)}
          className="w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
        >
          <option value="">Select a destination…</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup title="Availability">
        <RangeSlider
          label="AVAILABILITY WINDOW"
          min={0}
          max={AVAILABILITY_WINDOW_DAYS}
          valueMin={dayOffset(today, fields.availabilityStart || today)}
          valueMax={dayOffset(today, fields.availabilityEnd || addDays(today, 7))}
          onChange={({ min, max }) => {
            update("availabilityStart", addDays(today, min));
            update("availabilityEnd", addDays(today, max));
          }}
          formatValue={(offset) => new Date(addDays(today, offset)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        />
        <p className="mb-4 mt-2 text-[11.5px] text-text-tertiary">
          The trip could begin any day in this range — not a fixed departure date.
        </p>
        <RangeSlider
          label="DURATION"
          min={DURATION_MIN_DAYS}
          max={DURATION_MAX_DAYS}
          valueMin={fields.durationMin ?? 4}
          valueMax={fields.durationMax ?? 6}
          onChange={({ min, max }) => {
            update("durationMin", min);
            update("durationMax", max);
          }}
          formatValue={(days) => `${days} day${days === 1 ? "" : "s"}`}
        />
      </FieldGroup>

      <FieldGroup title="Budget (per person, ₹)">
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Min"
            value={fields.budgetMin ?? ""}
            onChange={(e) => update("budgetMin", e.target.value === "" ? null : Number(e.target.value))}
            className="flex-1 rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
          />
          <input
            type="number"
            placeholder="Max"
            value={fields.budgetMax ?? ""}
            onChange={(e) => update("budgetMax", e.target.value === "" ? null : Number(e.target.value))}
            className="flex-1 rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Capacity">
        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">Max group size</label>
        <input
          type="number"
          value={fields.maxGroupSize}
          min={membersJoined}
          onChange={(e) => {
            update("maxGroupSize", Number(e.target.value));
            setMaxError("");
          }}
          className={`w-24 rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none font-sans ${
            maxError ? "border-danger" : "border-border-input focus:border-primary"
          }`}
        />
        {maxError && <p className="mt-1.5 text-[11px] font-medium text-danger">{maxError}</p>}
      </FieldGroup>

      <FieldGroup title="Who can join">
        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">Age range</label>
        <div className="mb-1 flex items-center gap-3">
          <input
            type="number"
            min={MINIMUM_AGE}
            placeholder="Min age"
            value={fields.minAge ?? ""}
            onChange={(e) => {
              update("minAge", e.target.value === "" ? null : Number(e.target.value));
              setAgeError("");
            }}
            className={`w-28 rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none font-sans ${
              ageError ? "border-danger" : "border-border-input focus:border-primary"
            }`}
          />
          <span className="text-[12px] text-text-tertiary">to</span>
          <input
            type="number"
            min={MINIMUM_AGE}
            placeholder="Max age"
            value={fields.maxAge ?? ""}
            onChange={(e) => {
              update("maxAge", e.target.value === "" ? null : Number(e.target.value));
              setAgeError("");
            }}
            className={`w-28 rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none font-sans ${
              ageError ? "border-danger" : "border-border-input focus:border-primary"
            }`}
          />
        </div>
        {ageError && <p className="mb-3 text-[11px] font-medium text-danger">{ageError}</p>}
        {!ageError && <div className="mb-4" />}

        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">Gender</label>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("genderRestriction", opt.value)}
              className={`rounded-full border-[1.5px] px-4 py-2 text-[12px] font-semibold ${
                fields.genderRestriction === opt.value
                  ? "border-primary bg-primary text-white"
                  : "border-border-input text-text-secondary hover:border-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup title="Cover image">
        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">Cover image URL</label>
        <input
          value={fields.coverImageUrl}
          onChange={(e) => update("coverImageUrl", e.target.value)}
          placeholder="https://…"
          className="w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
        />
      </FieldGroup>

      {dirty && (
        <p className="mb-3 text-[11.5px] font-medium text-text-tertiary">
          You have unsaved changes to this trip
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-full bg-primary px-6 py-3 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span className="self-center text-[12px] font-semibold text-trust-fg">✓ Saved</span>}
      </div>
      {saveError && <p className="mt-2 text-[11px] font-medium text-danger">{saveError}</p>}

      {confirmSave && (
        <ConfirmDialog
          title={`This will notify all ${membersJoined - 1} member${membersJoined - 1 === 1 ? "" : "s"}.`}
          confirmLabel="Save Changes"
          onConfirm={commitSave}
          onCancel={() => setConfirmSave(false)}
        />
      )}
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-2xl border border-border p-5">
      <h3 className="mb-3 text-[12px] font-bold text-text-tertiary uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-surface-avatar text-[12px] font-semibold text-[oklch(40%_0.1_255)]">
      {initials}
    </div>
  );
}

function ConfirmDialog({
  title,
  confirmLabel,
  danger = false,
  requireReason = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmLabel: string;
  danger?: boolean;
  requireReason?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const canConfirm = !requireReason || reason.trim().length > 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100]">
      <button aria-label="Close dialog" onClick={onCancel} className="absolute inset-0 bg-[oklch(20%_0.01_255/0.45)]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-live="assertive"
        className="absolute inset-0 m-auto flex h-fit w-[92vw] max-w-[420px] flex-col rounded-[20px] bg-surface p-6 shadow-[0_24px_60px_-12px_oklch(20%_0.02_255/0.35)]"
      >
        <p className="mb-4 text-[13.5px] font-semibold leading-relaxed">{title}</p>
        {requireReason && (
          <>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              placeholder="Reason (shared with those affected)"
              rows={3}
              className="mb-1 w-full resize-none rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-[13px] outline-none focus:border-primary font-sans"
            />
            <p className="mb-3 text-right text-[10.5px] text-text-muted">{reason.length}/300</p>
          </>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-full px-4 py-2.5 text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm}
            className={`rounded-full px-5 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50 ${
              danger ? "bg-danger" : "bg-primary"
            } hover:opacity-90`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
