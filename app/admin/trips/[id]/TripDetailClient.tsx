"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getTripDetail,
  getTripMembers,
  getAllUsersForPicker,
  getDestinations,
  type AdminTripRow,
  type AdminTripMemberRow,
  type AdminDestinationRow,
} from "@/lib/admin/data";
import {
  hideTrip,
  unhideTrip,
  closeTripRegistrations,
  reopenTripRegistrations,
  forceCancelTrip,
  removeTripMember,
  addTripMember,
  TripFullError,
  updateTrip,
  MaxGroupSizeBelowMemberCountError,
} from "@/lib/admin/mutations";
import type { Database } from "@/lib/supabase/database.types";
import { Pill, ConfirmDialog, AdminButton, ErrorRetry, useLiveAnnouncer } from "@/components/admin/ui";
import { useAuth, MINIMUM_AGE } from "@/lib/auth-context";
import { can } from "@/lib/admin/guard";
import { RangeSlider } from "@/components/ui/RangeSlider";

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

type Tab = "participants" | "moderation";
type Action = "hide" | "unhide" | "close" | "reopen" | "forceCancel";

export function TripDetailClient({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("participants");
  const [trip, setTrip] = useState<AdminTripRow | null>(null);
  const [members, setMembers] = useState<AdminTripMemberRow[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [removingMember, setRemovingMember] = useState<{ userId: string; name: string } | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const { announce, region } = useLiveAnnouncer();

  const load = useCallback(() => {
    setError(false);
    Promise.all([getTripDetail(tripId), getTripMembers(tripId)])
      .then(([t, m]) => {
        setTrip(t);
        setMembers(m);
      })
      .catch(() => setError(true));
  }, [tripId]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load, reloadKey]);

  if (error) return <ErrorRetry message="Couldn't load this trip." onRetry={() => setReloadKey((k) => k + 1)} />;
  if (!trip) return <div className="h-[200px] animate-pulse rounded-2xl bg-[oklch(93%_0.003_255)]" />;

  const acceptedMembers = (members ?? []).filter((m) => m.status === "accepted");

  async function runAction(action: Action, reason: string) {
    try {
      if (action === "hide") await hideTrip(tripId, reason);
      if (action === "unhide") await unhideTrip(tripId, reason || undefined);
      if (action === "close") await closeTripRegistrations(tripId, reason || undefined);
      if (action === "reopen") await reopenTripRegistrations(tripId, reason || undefined);
      if (action === "forceCancel") await forceCancelTrip(tripId, reason);
      announce("Action completed.");
      setPendingAction(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      announce(err instanceof Error ? err.message : "Action failed.");
      setPendingAction(null);
    }
  }

  async function confirmRemoveMember(reason: string) {
    if (!removingMember) return;
    try {
      await removeTripMember(tripId, removingMember.userId, reason);
      announce(`Removed ${removingMember.name} from the trip.`);
      setRemovingMember(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      announce(err instanceof Error ? err.message : "Failed.");
      setRemovingMember(null);
    }
  }

  return (
    <div>
      {region}
      <Link href="/admin/trips" className="mb-3 inline-block text-[12px] font-semibold text-[oklch(50%_0.01_255)] hover:text-[oklch(45%_0.14_255)]">
        ← Trips
      </Link>

      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[22px] font-bold">{trip.title}</h1>
          <div className="flex items-center gap-2 text-[12.5px] text-[oklch(50%_0.01_255)]">
            <Pill tone={trip.status}>{trip.status.replace("_", " ")}</Pill>
            {trip.registrations_closed && <Pill tone="hidden">Registrations closed</Pill>}
            <Pill tone={trip.kind === "verified_partner" ? "verified" : "draft"}>{trip.kind === "verified_partner" ? "Verified Partner" : "Community"}</Pill>
          </div>
        </div>
        {can(user, "review.hideRemove") && (
          <AdminButton onClick={() => setEditingTrip(true)}>Edit trip</AdminButton>
        )}
      </div>

      {trip.cancellation_reason && (
        <div className="mb-5 rounded-xl border border-[oklch(88%_0.02_25)] bg-[oklch(98%_0.01_25)] px-4 py-3 text-[12.5px] text-[oklch(45%_0.14_25)]">
          Cancelled{trip.cancelled_by_role ? ` by ${trip.cancelled_by_role}` : ""}: {trip.cancellation_reason}
        </div>
      )}

      <div role="tablist" className="mb-5 flex gap-6 border-b border-[oklch(90%_0.005_255)]">
        {(["participants", "moderation"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`border-b-2 pb-2.5 text-[13px] font-semibold capitalize ${
              tab === t ? "border-[oklch(52%_0.18_255)] text-[oklch(30%_0.14_255)]" : "border-transparent text-[oklch(50%_0.01_255)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "participants" && (
        <div>
          {can(user, "review.hideRemove") && (
            <div className="mb-3 flex justify-end">
              <AdminButton variant="primary" onClick={() => setAddingMember(true)}>
                + Add member
              </AdminButton>
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          {!members ? (
            <div className="h-[100px] animate-pulse" />
          ) : acceptedMembers.length === 0 ? (
            <p className="p-6 text-[12.5px] text-[oklch(55%_0.01_255)]">No accepted members.</p>
          ) : (
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[oklch(92%_0.003_255)] bg-[oklch(98%_0.002_255)] text-left text-[11px] font-bold text-[oklch(50%_0.01_255)]">
                  <th scope="col" className="px-4 py-3">Member</th>
                  <th scope="col" className="px-4 py-3">Joined</th>
                  <th scope="col" className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {acceptedMembers.map((m) => (
                  <tr key={m.userId} className="border-b border-[oklch(94%_0.003_255)] last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${m.userId}`} className="font-semibold hover:text-[oklch(45%_0.14_255)]">
                        {m.name}
                      </Link>
                      {m.userId === trip.organizer_id && <span className="ml-2 text-[10.5px] text-[oklch(55%_0.01_255)]">Organizer</span>}
                    </td>
                    <td className="px-4 py-3">{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {m.userId !== trip.organizer_id && can(user, "review.hideRemove") && (
                        <button
                          onClick={() => setRemovingMember({ userId: m.userId, name: m.name })}
                          className="text-[11.5px] font-semibold text-[oklch(45%_0.16_25)] hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      )}

      {tab === "moderation" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[oklch(90%_0.005_255)] bg-white p-5">
            <h2 className="mb-1 text-[14.5px] font-bold">Hide</h2>
            <p className="mb-3 text-[12px] text-[oklch(50%_0.01_255)]">Removes from search/discovery. Existing members keep full access and chat. Reversible.</p>
            {trip.status === "hidden" ? (
              <AdminButton onClick={() => setPendingAction("unhide")}>Unhide</AdminButton>
            ) : (
              <AdminButton onClick={() => setPendingAction("hide")} disabled={trip.status === "cancelled" || trip.status === "completed"}>
                Hide
              </AdminButton>
            )}
          </div>

          <div className="rounded-2xl border border-[oklch(90%_0.005_255)] bg-white p-5">
            <h2 className="mb-1 text-[14.5px] font-bold">Close registrations</h2>
            <p className="mb-3 text-[12px] text-[oklch(50%_0.01_255)]">Still visible, join CTA disabled. Pending requests stay actionable by the organizer.</p>
            {trip.registrations_closed ? (
              <AdminButton onClick={() => setPendingAction("reopen")}>Reopen registrations</AdminButton>
            ) : (
              <AdminButton onClick={() => setPendingAction("close")}>Close registrations</AdminButton>
            )}
          </div>

          {can(user, "trip.forceCancel") && trip.status !== "cancelled" && trip.status !== "completed" && (
            <div className="rounded-2xl border border-[oklch(88%_0.02_25)] bg-white p-5">
              <h2 className="mb-1 text-[14.5px] font-bold text-[oklch(45%_0.14_25)]">Force-cancel</h2>
              <p className="mb-3 text-[12px] text-[oklch(50%_0.01_255)]">
                Terminal, admin only. Removes the trip entirely, moves chat to a read-only archive, and notifies every accepted member with the reason.
              </p>
              <AdminButton variant="danger" onClick={() => setPendingAction("forceCancel")}>
                Force-cancel trip
              </AdminButton>
            </div>
          )}
          {!can(user, "trip.forceCancel") && (
            <p className="text-[11.5px] text-[oklch(55%_0.01_255)]">Force-cancel requires admin — you have moderator access.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingAction === "hide"}
        title="Hide trip"
        consequence="Removes this trip from search and discovery. Existing members keep full access. Reversible."
        onConfirm={(reason) => runAction("hide", reason)}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "unhide"}
        title="Unhide trip"
        consequence="Makes this trip visible in search and discovery again."
        requireReason={false}
        danger={false}
        onConfirm={(reason) => runAction("unhide", reason)}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "close"}
        title="Close registrations"
        consequence="Disables the join CTA. The trip stays visible and pending requests remain actionable by the organizer."
        requireReason={false}
        danger={false}
        onConfirm={(reason) => runAction("close", reason)}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "reopen"}
        title="Reopen registrations"
        consequence="Re-enables the join CTA for this trip."
        requireReason={false}
        danger={false}
        onConfirm={(reason) => runAction("reopen", reason)}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "forceCancel"}
        title="Force-cancel trip"
        consequence={`This notifies all ${acceptedMembers.length} accepted member${acceptedMembers.length === 1 ? "" : "s"} and cannot be undone. The trip is removed from discovery and its chat becomes a read-only archive.`}
        confirmLabel="Force-cancel"
        onConfirm={(reason) => runAction("forceCancel", reason)}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={!!removingMember}
        title="Remove member"
        consequence={`Removes ${removingMember?.name ?? "this member"} from the trip. If the trip has a waiting list, the earliest waitlisted request is promoted automatically.`}
        confirmLabel="Remove"
        onConfirm={confirmRemoveMember}
        onCancel={() => setRemovingMember(null)}
      />
      {addingMember && (
        <AddMemberDialog
          tripId={tripId}
          existingMemberIds={new Set((members ?? []).map((m) => m.userId))}
          onClose={() => setAddingMember(false)}
          onAdded={(name) => {
            announce(`Added ${name} to the trip.`);
            setAddingMember(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
      {editingTrip && (
        <EditTripDialog
          trip={trip}
          onClose={() => setEditingTrip(false)}
          onSaved={() => {
            announce("Trip updated.");
            setEditingTrip(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function AddMemberDialog({
  tripId,
  existingMemberIds,
  onClose,
  onAdded,
}: {
  tripId: string;
  existingMemberIds: Set<string>;
  onClose: () => void;
  onAdded: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<{ id: string; name: string; phone: string | null; email: string | null; verification_status: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => getAllUsersForPicker(query || undefined))
      .then((rows) => {
        if (!cancelled) setCandidates(rows.filter((r) => !existingMemberIds.has(r.id)));
      });
    return () => {
      cancelled = true;
    };
    // existingMemberIds is a Set derived fresh each render; only re-fetch on query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Choose a user to add.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addTripMember(tripId, selected.id, reason || undefined);
      onAdded(selected.name);
    } catch (err) {
      if (err instanceof TripFullError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to add member.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-[16px] font-bold">Add member</h2>
        <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">Adds any user directly as an accepted member — no verification required.</p>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">User</label>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Search by name, phone, or email"
            className="mb-1.5 w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
          <select
            value={selected?.id ?? ""}
            onChange={(e) => {
              const c = candidates.find((c) => c.id === e.target.value);
              setSelected(c ? { id: c.id, name: c.name } : null);
            }}
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          >
            <option value="">Select a user…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone ?? c.email ?? "no contact"}
                {c.verification_status !== "id_verified" ? " (unverified)" : ""}
              </option>
            ))}
          </select>
          {candidates.length === 0 && query && (
            <p className="mt-1 text-[11px] text-[oklch(55%_0.01_255)]">No users match that search.</p>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-[11.5px] font-semibold">Reason (optional)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>

        {error && <p className="mb-3 text-[12px] text-[oklch(45%_0.16_25)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" loading={submitting}>
            Add
          </AdminButton>
        </div>
      </form>
    </div>
  );
}

function EditTripDialog({ trip, onClose, onSaved }: { trip: AdminTripRow; onClose: () => void; onSaved: () => void }) {
  const [destinations, setDestinations] = useState<AdminDestinationRow[] | null>(null);
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description ?? "");
  const [destinationId, setDestinationId] = useState(trip.destination_id ?? "");
  const today = useState(() => todayIso())[0];
  const [availabilityStart, setAvailabilityStart] = useState(trip.availability_start ?? today);
  const [availabilityEnd, setAvailabilityEnd] = useState(trip.availability_end ?? addDays(today, 7));
  const [durationMin, setDurationMin] = useState(trip.duration_min ?? 4);
  const [durationMax, setDurationMax] = useState(trip.duration_max ?? 6);
  const [maxGroupSize, setMaxGroupSize] = useState(String(trip.max_group_size));
  const [budgetMin, setBudgetMin] = useState(trip.budget_min != null ? String(trip.budget_min) : "");
  const [budgetMax, setBudgetMax] = useState(trip.budget_max != null ? String(trip.budget_max) : "");
  const [minAge, setMinAge] = useState(trip.min_age != null ? String(trip.min_age) : "");
  const [maxAge, setMaxAge] = useState(trip.max_age != null ? String(trip.max_age) : "");
  const [genderRestriction, setGenderRestriction] = useState<Database["public"]["Enums"]["trip_gender_restriction"]>(trip.gender_restriction);
  const [coverImageUrl, setCoverImageUrl] = useState(trip.cover_image_url ?? "");

  const [organizerQuery, setOrganizerQuery] = useState("");
  const [organizers, setOrganizers] = useState<{ id: string; name: string; phone: string | null; email: string | null; verification_status: string }[]>([]);
  const [organizerId, setOrganizerId] = useState(trip.organizer_id);
  const [organizerLabel, setOrganizerLabel] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => getDestinations().then(setDestinations));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => getAllUsersForPicker(organizerQuery || undefined))
      .then((rows) => {
        if (!cancelled) setOrganizers(rows);
      });
    return () => {
      cancelled = true;
    };
  }, [organizerQuery]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !destinationId) {
      setError("Title and destination are required.");
      return;
    }
    const size = Number(maxGroupSize);
    if (!Number.isFinite(size) || size < 2) {
      setError("Max group size must be at least 2.");
      return;
    }
    const minAgeNum = minAge ? Number(minAge) : undefined;
    if (minAgeNum != null && minAgeNum < MINIMUM_AGE) {
      setError(`Minimum age can't be less than ${MINIMUM_AGE}.`);
      return;
    }
    const maxAgeNum = maxAge ? Number(maxAge) : undefined;
    if (maxAgeNum != null && minAgeNum != null && maxAgeNum < minAgeNum) {
      setError("Maximum age can't be less than minimum age.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateTrip(trip.id, {
        title,
        description: description || undefined,
        destinationId,
        availabilityStart,
        availabilityEnd,
        durationMin,
        durationMax,
        maxGroupSize: size,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        minAge: minAgeNum,
        maxAge: maxAgeNum,
        genderRestriction,
        coverImageUrl: coverImageUrl || undefined,
        clearCoverImage: !coverImageUrl,
        organizerId: organizerId !== trip.organizer_id ? organizerId : undefined,
      });
      onSaved();
    } catch (err) {
      if (err instanceof MaxGroupSizeBelowMemberCountError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to update trip.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <form onSubmit={submit} className="w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-[16px] font-bold">Edit trip</h2>
        <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">Changes are audit-logged with the before/after values.</p>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Destination</label>
          <select
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          >
            <option value="">Select a destination…</option>
            {(destinations ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <RangeSlider
            label="AVAILABILITY WINDOW"
            min={0}
            max={AVAILABILITY_WINDOW_DAYS}
            valueMin={dayOffset(today, availabilityStart)}
            valueMax={dayOffset(today, availabilityEnd)}
            onChange={({ min, max }) => {
              setAvailabilityStart(addDays(today, min));
              setAvailabilityEnd(addDays(today, max));
            }}
            formatValue={(offset) => new Date(addDays(today, offset)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          />
        </div>

        <div className="mb-4">
          <RangeSlider
            label="DURATION"
            min={DURATION_MIN_DAYS}
            max={DURATION_MAX_DAYS}
            valueMin={durationMin}
            valueMax={durationMax}
            onChange={({ min, max }) => {
              setDurationMin(min);
              setDurationMax(max);
            }}
            formatValue={(days) => `${days} day${days === 1 ? "" : "s"}`}
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Max group size</label>
          <input
            type="number"
            min={2}
            value={maxGroupSize}
            onChange={(e) => setMaxGroupSize(e.target.value)}
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
        </div>

        <div className="mb-3 flex gap-2.5">
          <div className="flex-1">
            <label className="mb-1 block text-[11.5px] font-semibold">Budget min</label>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11.5px] font-semibold">Budget max</label>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
            />
          </div>
        </div>

        <div className="mb-3 flex gap-2.5">
          <div className="flex-1">
            <label className="mb-1 block text-[11.5px] font-semibold">Min age</label>
            <input
              type="number"
              min={MINIMUM_AGE}
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11.5px] font-semibold">Max age</label>
            <input
              type="number"
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Gender restriction</label>
          <select
            value={genderRestriction}
            onChange={(e) => setGenderRestriction(e.target.value as Database["public"]["Enums"]["trip_gender_restriction"])}
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          >
            <option value="any">Mixed</option>
            <option value="women_only">Women Only</option>
            <option value="men_only">Men Only</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-[11.5px] font-semibold">Cover image URL</label>
          <input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
        </div>

        <div className="mb-4 rounded-lg border border-[oklch(88%_0.02_25)] bg-[oklch(98%_0.01_25)] p-3">
          <label className="mb-1 block text-[11.5px] font-semibold text-[oklch(45%_0.14_25)]">Organizer / host</label>
          <p className="mb-2 text-[11px] text-[oklch(50%_0.01_25)]">Reassigning adds the new organizer as an accepted member.</p>
          <input
            value={organizerQuery}
            onChange={(e) => {
              setOrganizerQuery(e.target.value);
              setOrganizerLabel(null);
            }}
            placeholder="Search by name, phone, or email to change organizer"
            className="mb-1.5 w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
          <select
            value={organizerId}
            onChange={(e) => {
              setOrganizerId(e.target.value);
              const o = organizers.find((o) => o.id === e.target.value);
              setOrganizerLabel(o ? o.name : null);
            }}
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          >
            <option value={trip.organizer_id}>{organizerLabel && organizerId === trip.organizer_id ? organizerLabel : "Current organizer (unchanged)"}</option>
            {organizers
              .filter((o) => o.id !== trip.organizer_id)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} — {o.phone ?? o.email ?? "no contact"}
                  {o.verification_status !== "id_verified" ? " (unverified)" : ""}
                </option>
              ))}
          </select>
        </div>

        {error && <p className="mb-3 text-[12px] text-[oklch(45%_0.16_25)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" loading={submitting}>
            Save
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
