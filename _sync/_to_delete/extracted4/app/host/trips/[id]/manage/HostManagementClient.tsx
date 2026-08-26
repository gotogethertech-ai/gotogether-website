"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import {
  getHostedTrip,
  getHostManagementRecord,
  type PendingApplicant,
  type Participant,
  type WaitingListEntry,
} from "@/lib/host-management-data";
import type { HostedTrip } from "@/lib/my-trips-data";

type TabKey = "overview" | "requests" | "participants" | "edit";

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
  const { isLoggedIn, requireAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("manage your trip", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trip = getHostedTrip(tripId);
  const record = getHostManagementRecord(tripId);

  const [pending, setPending] = useState<PendingApplicant[]>(record.pendingApplicants);
  const [participants, setParticipants] = useState<Participant[]>(record.participants);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>(record.waitingList);
  const [status, setStatus] = useState<
    "draft" | "live" | "full" | "in-progress" | "completed" | "cancelled"
  >(trip?.status ?? "live");
  const [membersMax, setMembersMax] = useState(trip?.membersMax ?? participants.length);

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

  if (!authChecked || !trip) {
    return (
      <>
        <Header activePath="/my-trips" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  const membersJoined = participants.length;

  function handleAccept(applicant: PendingApplicant) {
    setPending((prev) => prev.filter((p) => p.id !== applicant.id));
    setParticipants((prev) => [
      ...prev,
      {
        id: applicant.id,
        name: applicant.name,
        initials: applicant.initials,
        trustScore: applicant.trustScore,
        role: "member",
        joinedDate: "Joined just now",
      },
    ]);
    if (membersJoined + 1 >= membersMax) setStatus("full");
  }

  function handleReject(applicantId: string) {
    setPending((prev) => prev.filter((p) => p.id !== applicantId));
  }

  function handleRemove(participantId: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    if (status === "full") setStatus("live");
    // Removing a participant frees a spot — auto-promote the next Waiting
    // List entry in FIFO order (no manual reordering, per the blueprint's
    // "deliberate trust-preserving constraint").
    setWaitingList((prev) => {
      if (prev.length === 0) return prev;
      const [promoted, ...rest] = prev;
      setParticipants((p) => [
        ...p,
        {
          id: promoted.id,
          name: promoted.name,
          initials: promoted.initials,
          trustScore: "—",
          role: "member",
          joinedDate: "Joined just now",
        },
      ]);
      return rest.map((entry, i) => ({ ...entry, position: i + 1 }));
    });
  }

  function handlePublish() {
    setStatus("live");
    setTab("overview" as TabKey);
  }

  function handleCancel() {
    setStatus("cancelled");
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
              <p>
                {trip.cancelledByModerator
                  ? "This trip was cancelled by GoTogether."
                  : trip.cancelledReason ?? "Cancelled by the organizer."}
              </p>
              <p className="mt-2 text-[11.5px] text-[oklch(50%_0.13_25)]">
                This is final — a cancelled trip can&apos;t be reopened. Create a new trip to plan again.
              </p>
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
              onCancel={handleCancel}
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
          {activeTab === "edit" && (
            <EditTab trip={trip} membersJoined={membersJoined} membersMax={membersMax} onChangeMax={setMembersMax} />
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
  onCancel,
  onViewTab,
}: {
  trip: HostedTrip;
  status: string;
  pending: PendingApplicant[];
  participants: Participant[];
  onAccept: (a: PendingApplicant) => void;
  onReject: (id: string) => void;
  onPublish: () => void;
  onCancel: () => void;
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
            onConfirm={() => setConfirmDelete(false)}
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
            <button className="rounded-full border border-border-input px-4 py-2 text-[12px] font-semibold hover:bg-surface-hover">
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
          onConfirm={() => {
            onCancel();
            setConfirmCancel(false);
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
  onRemove: (id: string) => void;
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
          onConfirm={() => {
            onRemove(confirmRemove.id);
            setConfirmRemove(null);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}

function EditTab({
  trip,
  membersJoined,
  membersMax,
  onChangeMax,
}: {
  trip: HostedTrip;
  membersJoined: number;
  membersMax: number;
  onChangeMax: (n: number) => void;
}) {
  const [title, setTitle] = useState(trip.title);
  const [maxValue, setMaxValue] = useState(membersMax);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [maxError, setMaxError] = useState("");

  function handleSave() {
    if (maxValue < membersJoined) {
      setMaxError(`Can't be lower than ${membersJoined} — that's how many have already joined.`);
      return;
    }
    setMaxError("");
    if (membersJoined > 1) {
      setConfirmSave(true);
      return;
    }
    commitSave();
  }

  function commitSave() {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setDirty(false);
      setConfirmSave(false);
      onChangeMax(maxValue);
      window.setTimeout(() => setSaved(false), 2500);
    }, 500);
  }

  return (
    <div className="max-w-[560px]">
      {/* Reuses Create Trip's exact field styling — a single scrollable
          form with clear visual grouping (self-critique), not a flat list
          or the multi-step wizard Create Trip itself uses. */}
      <FieldGroup title="Trip details">
        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">Title</label>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="mb-4 w-full rounded-xl border-[1.5px] border-border-input px-3.5 py-3 text-sm outline-none focus:border-primary font-sans"
        />
      </FieldGroup>

      <FieldGroup title="Capacity">
        <label className="mb-1.5 block text-[11px] font-semibold text-text-tertiary">Max group size</label>
        <input
          type="number"
          value={maxValue}
          min={membersJoined}
          onChange={(e) => {
            setMaxValue(Number(e.target.value));
            setDirty(true);
            setMaxError("");
          }}
          className={`w-24 rounded-xl border-[1.5px] px-3.5 py-3 text-sm outline-none font-sans ${
            maxError ? "border-danger" : "border-border-input focus:border-primary"
          }`}
        />
        {maxError && <p className="mt-1.5 text-[11px] font-medium text-danger">{maxError}</p>}
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
  onConfirm: () => void;
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
            onClick={onConfirm}
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
