"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTrips, getDestinations, getAllUsersForPicker, getCompanies, type AdminTripListItem, type TripsFilter, type AdminDestinationRow, type AdminCompanyListItem } from "@/lib/admin/data";
import { adminCreateTripForOrganizer, bulkDeleteTrips, bulkHideTrips } from "@/lib/admin/mutations";
import { Pill, TableSkeleton, EmptyState, ErrorRetry, AdminButton, ConfirmDialog, useLiveAnnouncer } from "@/components/admin/ui";
import { useAuth, MINIMUM_AGE } from "@/lib/auth-context";
import { can } from "@/lib/admin/guard";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { AvailabilityDatePicker } from "@/components/ui/AvailabilityDatePicker";
import { formatTripTiming } from "@/lib/trip-dates";
import type { Database } from "@/lib/supabase/database.types";

type TripGenderRestriction = Database["public"]["Enums"]["trip_gender_restriction"];
type TripKind = Database["public"]["Enums"]["trip_kind"];

const GENDER_OPTIONS: { value: TripGenderRestriction; label: string }[] = [
  { value: "any", label: "Mixed" },
  { value: "women_only", label: "Women Only" },
  { value: "men_only", label: "Men Only" },
];

const PAGE_SIZE = 25;
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

export function TripsListClient() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<TripsFilter>({});
  const [trips, setTrips] = useState<AdminTripListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"hide" | "delete" | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const { announce, region } = useLiveAnnouncer();

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setError(false);
        return getTrips(filter, PAGE_SIZE, offset);
      })
      .then(({ trips: rows, total: t }) => {
        if (cancelled) return;
        setTrips((prev) => (offset === 0 ? rows : [...(prev ?? []), ...rows]));
        setTotal(t);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, offset, reloadKey]);

  function applyFilter(patch: Partial<TripsFilter>) {
    setTrips(null);
    setOffset(0);
    setSelected(new Set());
    setFilter((f) => ({ ...f, ...patch }));
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (!trips || trips.length === 0) return prev;
      const allSelected = trips.every((t) => prev.has(t.id));
      return allSelected ? new Set() : new Set(trips.map((t) => t.id));
    });
  }

  async function runBulkAction(reason: string) {
    if (!bulkAction || selected.size === 0) return;
    setBulkSubmitting(true);
    try {
      const ids = Array.from(selected);
      if (bulkAction === "delete") {
        await bulkDeleteTrips(ids, reason);
        announce(`${ids.length} trip${ids.length === 1 ? "" : "s"} deleted.`);
      } else {
        await bulkHideTrips(ids, reason || undefined);
        announce(`${ids.length} trip${ids.length === 1 ? "" : "s"} hidden.`);
      }
      setSelected(new Set());
      setBulkAction(null);
      setTrips(null);
      setOffset(0);
      setReloadKey((k) => k + 1);
    } catch (err) {
      announce(err instanceof Error ? err.message : "Bulk action failed. Try again.");
    } finally {
      setBulkSubmitting(false);
    }
  }

  const hiddenCount = (trips ?? []).filter((t) => t.status === "hidden").length;
  const allOnPageSelected = !!trips && trips.length > 0 && trips.every((t) => selected.has(t.id));

  return (
    <div>
      {region}
      <div className="mb-1 flex items-start justify-between">
        <h1 className="font-display text-[26px] font-bold">Trips</h1>
        {can(user, "trip.forceCancel") && (
          <AdminButton variant="primary" onClick={() => setCreateOpen(true)}>
            + Create Trip
          </AdminButton>
        )}
      </div>
      <p className="mb-5 text-[13px] text-[oklch(50%_0.01_255)]">
        {total.toLocaleString()} total{trips ? ` · ${hiddenCount} hidden (this page)` : ""}
      </p>

      <div className="mb-4 flex gap-2.5">
        <input
          placeholder="Search by title"
          onChange={(e) => applyFilter({ q: e.target.value || undefined })}
          className="w-[320px] rounded-lg border border-[oklch(85%_0.005_255)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[oklch(52%_0.18_255)]"
        />
        <select onChange={(e) => applyFilter({ status: (e.target.value || "all") as TripsFilter["status"] })} className="rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2.5 text-[13px]">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="live">Live</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="hidden">Hidden</option>
          <option value="deleted">Deleted</option>
        </select>
        <select onChange={(e) => applyFilter({ kind: (e.target.value || "all") as TripsFilter["kind"] })} className="rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2.5 text-[13px]">
          <option value="all">All types</option>
          <option value="community">Community</option>
          <option value="verified_partner">Verified Partner</option>
        </select>
      </div>

      {selected.size > 0 && (can(user, "trip.hide") || can(user, "trip.delete")) && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-[oklch(85%_0.005_255)] bg-[oklch(98%_0.002_255)] px-4 py-2.5">
          <span className="text-[12.5px] font-semibold text-[oklch(35%_0.01_255)]">
            {selected.size} trip{selected.size === 1 ? "" : "s"} selected
          </span>
          <div className="ml-auto flex gap-2">
            {can(user, "trip.hide") && (
              <AdminButton variant="default" onClick={() => setBulkAction("hide")}>
                Hide selected
              </AdminButton>
            )}
            {can(user, "trip.delete") && (
              <AdminButton variant="danger" onClick={() => setBulkAction("delete")}>
                Delete selected
              </AdminButton>
            )}
            <AdminButton variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </AdminButton>
          </div>
        </div>
      )}

      {error ? (
        <ErrorRetry message="Couldn't load trips." onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !trips ? (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <TableSkeleton rows={8} cols={6} />
        </div>
      ) : trips.length === 0 ? (
        <EmptyState title={Object.values(filter).some(Boolean) ? "No trips match your filters" : "No trips yet"} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[oklch(92%_0.003_255)] bg-[oklch(98%_0.002_255)] text-left text-[11px] font-bold text-[oklch(50%_0.01_255)]">
                {(can(user, "trip.hide") || can(user, "trip.delete")) && (
                  <th scope="col" className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all trips on this page"
                      className="h-4 w-4"
                    />
                  </th>
                )}
                <th scope="col" className="px-4 py-3">Trip</th>
                <th scope="col" className="px-4 py-3">Organizer</th>
                <th scope="col" className="px-4 py-3">Dates</th>
                <th scope="col" className="px-4 py-3">Capacity</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b border-[oklch(94%_0.003_255)] last:border-0 hover:bg-[oklch(98%_0.002_255)]">
                  {(can(user, "trip.hide") || can(user, "trip.delete")) && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggleSelected(t.id)}
                        aria-label={`Select ${t.title}`}
                        className="h-4 w-4"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link href={`/admin/trips/${t.id}`} className="font-semibold hover:text-[oklch(45%_0.14_255)]">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[oklch(40%_0.01_255)]">{t.organizerName}</td>
                  <td className="px-4 py-3">
                    {formatTripTiming({
                      availabilityStart: t.availability_start,
                      availabilityEnd: t.availability_end,
                      durationMin: t.duration_min,
                      durationMax: t.duration_max,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {t.membersJoined} / {t.max_group_size}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={t.kind === "verified_partner" ? "verified" : "draft"}>{t.kind === "verified_partner" ? "Verified Partner" : "Community"}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={t.status}>{t.status.replace("_", " ")}</Pill>
                    {t.registrations_closed && <span className="ml-1.5 text-[10px] text-[oklch(55%_0.01_255)]">(closed)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {trips && trips.length > 0 && trips.length < total && (
        <div className="mt-4 text-center">
          <button onClick={() => setOffset((o) => o + PAGE_SIZE)} className="text-[12.5px] font-semibold text-[oklch(45%_0.14_255)] hover:underline">
            Load more
          </button>
        </div>
      )}

      {createOpen && (
        <CreateTripDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            announce("Trip created.");
            setTrips(null);
            setOffset(0);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      <ConfirmDialog
        open={bulkAction === "delete"}
        title={`Delete ${selected.size} trip${selected.size === 1 ? "" : "s"}?`}
        consequence="Removes these trips from every browse surface and notifies any joined members. This can be undone by support if needed, but travellers will be told the trip is gone — this isn't a light action."
        requireReason
        confirmLabel="Delete trips"
        danger
        onConfirm={runBulkAction}
        onCancel={() => !bulkSubmitting && setBulkAction(null)}
      />

      <ConfirmDialog
        open={bulkAction === "hide"}
        title={`Hide ${selected.size} trip${selected.size === 1 ? "" : "s"}?`}
        consequence="Removes these trips from public browse surfaces until unhidden. Reversible at any time."
        requireReason={false}
        confirmLabel="Hide trips"
        danger={false}
        onConfirm={runBulkAction}
        onCancel={() => !bulkSubmitting && setBulkAction(null)}
      />
    </div>
  );
}

function CreateTripDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [destinations, setDestinations] = useState<AdminDestinationRow[] | null>(null);
  const [organizerQuery, setOrganizerQuery] = useState("");
  const [organizers, setOrganizers] = useState<{ id: string; name: string; phone: string | null; email: string | null; verification_status: string }[]>([]);
  const [organizerId, setOrganizerId] = useState("");
  const [title, setTitle] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const today = useState(() => todayIso())[0];
  const [availabilityStart, setAvailabilityStart] = useState(today);
  const [availabilityEnd, setAvailabilityEnd] = useState(() => addDays(today, 7));
  const [durationMin, setDurationMin] = useState(4);
  const [durationMax, setDurationMax] = useState(6);
  const [maxGroupSize, setMaxGroupSize] = useState("6");
  const [description, setDescription] = useState("");
  const [minAge, setMinAge] = useState(String(MINIMUM_AGE));
  const [maxAge, setMaxAge] = useState("");
  const [genderRestriction, setGenderRestriction] = useState<TripGenderRestriction>("any");
  const [kind, setKind] = useState<TripKind>("community");
  const [companies, setCompanies] = useState<AdminCompanyListItem[] | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => getDestinations().then(setDestinations));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => getCompanies().then(setCompanies));
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
    if (!organizerId) {
      setError("Choose an organizer.");
      return;
    }
    if (!title.trim() || !destinationId) {
      setError("Title and destination are required.");
      return;
    }
    const size = Number(maxGroupSize);
    if (!Number.isFinite(size) || size < 2) {
      setError("Max group size must be at least 2.");
      return;
    }
    const minAgeNum = Number(minAge) || MINIMUM_AGE;
    if (minAgeNum < MINIMUM_AGE) {
      setError(`Minimum age can't be less than ${MINIMUM_AGE}.`);
      return;
    }
    const maxAgeNum = maxAge ? Number(maxAge) : undefined;
    if (maxAgeNum != null && maxAgeNum < minAgeNum) {
      setError("Maximum age can't be less than minimum age.");
      return;
    }
    if (kind === "verified_partner" && !companyId) {
      setError("Choose a partner company for a Partner trip.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminCreateTripForOrganizer({
        organizerId,
        title,
        destinationId,
        availabilityStart,
        availabilityEnd,
        durationMin,
        durationMax,
        maxGroupSize: size,
        description: description || undefined,
        minAge: minAgeNum,
        maxAge: maxAgeNum,
        genderRestriction,
        kind,
        companyId: kind === "verified_partner" ? companyId : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trip.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-[16px] font-bold">Create trip</h2>
        <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">
          Creates a live trip on behalf of any user, verified or not. The organizer is added as the accepted first member.
        </p>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Organizer (any user)</label>
          <input
            value={organizerQuery}
            onChange={(e) => setOrganizerQuery(e.target.value)}
            placeholder="Search by name, phone, or email"
            className="mb-1.5 w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
          <select
            value={organizerId}
            onChange={(e) => setOrganizerId(e.target.value)}
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          >
            <option value="">Select an organizer…</option>
            {organizers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {o.phone ?? o.email ?? "no contact"}
                {o.verification_status !== "id_verified" ? " (unverified)" : ""}
              </option>
            ))}
          </select>
          {organizers.length === 0 && organizerQuery && (
            <p className="mt-1 text-[11px] text-[oklch(55%_0.01_255)]">No users match that search.</p>
          )}
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
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

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Trip type</label>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={kind === "community"}
              onClick={() => {
                setKind("community");
                setCompanyId("");
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-semibold ${
                kind === "community"
                  ? "border-[oklch(45%_0.16_255)] bg-[oklch(94%_0.05_255)] text-[oklch(35%_0.16_255)]"
                  : "border-[oklch(85%_0.005_255)] bg-white text-[oklch(35%_0.01_255)]"
              }`}
            >
              Community
            </button>
            <button
              type="button"
              aria-pressed={kind === "verified_partner"}
              onClick={() => setKind("verified_partner")}
              className={`flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-semibold ${
                kind === "verified_partner"
                  ? "border-[oklch(45%_0.16_255)] bg-[oklch(94%_0.05_255)] text-[oklch(35%_0.16_255)]"
                  : "border-[oklch(85%_0.005_255)] bg-white text-[oklch(35%_0.01_255)]"
              }`}
            >
              Partner
            </button>
          </div>
        </div>

        {kind === "verified_partner" && (
          <div className="mb-3">
            <label className="mb-1 block text-[11.5px] font-semibold">Partner company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
            >
              <option value="">Select a company…</option>
              {(companies ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.status !== "verified" ? ` (${c.status.replace("_", " ")})` : ""}
                </option>
              ))}
            </select>
            {companies?.length === 0 && (
              <p className="mt-1 text-[11px] text-[oklch(55%_0.01_255)]">No companies registered yet.</p>
            )}
          </div>
        )}

        <div className="mb-4">
          <AvailabilityDatePicker
            startDate={availabilityStart}
            endDate={availabilityEnd}
            minDate={today}
            onChange={({ start, end }) => {
              setAvailabilityStart(start);
              setAvailabilityEnd(end);
            }}
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

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Gender preference</label>
          <select
            value={genderRestriction}
            onChange={(e) => setGenderRestriction(e.target.value as TripGenderRestriction)}
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3 flex gap-3">
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
            <label className="mb-1 block text-[11.5px] font-semibold">Max age (optional)</label>
            <input
              type="number"
              min={MINIMUM_AGE}
              value={maxAge}
              placeholder="No limit"
              onChange={(e) => setMaxAge(e.target.value)}
              className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-[11.5px] font-semibold">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
        </div>

        {error && <p className="mb-3 text-[12px] text-[oklch(45%_0.16_25)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" loading={submitting}>
            Create trip
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
