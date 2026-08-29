"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getUserDetail,
  getUserTrips,
  getUserReviews,
  getTrips,
  type AdminUserDetail,
  type AdminUserTripRow,
  type AdminUserReviewRow,
  type AdminTripListItem,
} from "@/lib/admin/data";
import {
  warnUser,
  restrictUser,
  liftRestriction,
  suspendUser,
  reinstateUser,
  removeUser,
  hideReview,
  removeReview,
  restoreReview,
  updateUserProfile,
  setTrustScore,
  writeReview,
  editReview,
} from "@/lib/admin/mutations";
import { Pill, ConfirmDialog, AdminButton, ErrorRetry, useLiveAnnouncer } from "@/components/admin/ui";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin/guard";

type Tab = "overview" | "trips" | "reviews" | "moderation";

export function UserDetailClient({ userId }: { userId: string }) {
  const { user: staffUser } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [trips, setTrips] = useState<AdminUserTripRow[] | null>(null);
  const [reviews, setReviews] = useState<AdminUserReviewRow[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<null | "warn" | "restrict" | "suspend" | "remove" | "liftRestriction" | "reinstate">(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingTrust, setEditingTrust] = useState(false);
  const [addingReview, setAddingReview] = useState(false);
  const { announce, region } = useLiveAnnouncer();

  const load = useCallback(() => {
    setError(false);
    Promise.all([getUserDetail(userId), getUserTrips(userId), getUserReviews(userId)])
      .then(([d, t, r]) => {
        setDetail(d);
        setTrips(t);
        setReviews(r);
      })
      .catch(() => setError(true));
  }, [userId]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load, reloadKey]);

  if (error) {
    return <ErrorRetry message="Couldn't load this user." onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  if (!detail) {
    return <div className="h-[200px] animate-pulse rounded-2xl bg-[oklch(93%_0.003_255)]" />;
  }

  async function runAction(kind: NonNullable<typeof pendingAction>, reason: string) {
    if (!staffUser) return;
    try {
      if (kind === "warn") await warnUser(userId, reason);
      if (kind === "restrict") await restrictUser(userId, reason);
      if (kind === "suspend") await suspendUser(userId, reason);
      if (kind === "remove") await removeUser(userId, reason);
      if (kind === "liftRestriction") await liftRestriction(userId, reason || undefined);
      if (kind === "reinstate") await reinstateUser(userId, reason || undefined);
      announce("Action completed.");
      setPendingAction(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      announce(err instanceof Error ? err.message : "Action failed.");
      setPendingAction(null);
    }
  }

  return (
    <div>
      {region}
      <Link href="/admin/users" className="mb-3 inline-block text-[12px] font-semibold text-[oklch(50%_0.01_255)] hover:text-[oklch(45%_0.14_255)]">
        ← Users
      </Link>

      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[oklch(90%_0.02_255)] text-[16px] font-bold text-[oklch(40%_0.1_255)]">
          {detail.initials ?? detail.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-[22px] font-bold">{detail.name}</h1>
          <div className="flex items-center gap-2 text-[12.5px] text-[oklch(50%_0.01_255)]">
            {detail.phone ?? detail.email ?? "No contact on file"}
            <Pill tone={detail.account_status}>{detail.account_status}</Pill>
            <Pill tone={detail.verification_status}>{detail.verification_status.replace("_", " ")}</Pill>
          </div>
        </div>
      </div>

      <div role="tablist" className="mb-5 flex gap-6 border-b border-[oklch(90%_0.005_255)]">
        {(["overview", "trips", "reviews", "moderation"] as Tab[]).map((t) => (
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

      {tab === "overview" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">Profile</h2>
            <div className="flex gap-2">
              <AdminButton onClick={() => setEditingProfile(true)}>Edit profile</AdminButton>
              <AdminButton onClick={() => setEditingTrust(true)}>Set Trust Score</AdminButton>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoCard label="Trust Score" value={detail.trustFrozen ? `${detail.trustScore.toFixed(1)} (frozen)` : detail.trustScore.toFixed(1)} />
            <InfoCard label="Gender" value={detail.gender ?? "—"} />
            <InfoCard label="Date of birth" value={detail.date_of_birth ? new Date(detail.date_of_birth).toLocaleDateString() : "—"} />
            <InfoCard label="Phone" value={detail.phone ?? "—"} />
            <InfoCard label="Email" value={detail.email ?? "—"} />
            <InfoCard label="Bio" value={detail.bio ?? "—"} />
            <InfoCard label="Smoking" value={detail.smoking_preference ?? "—"} />
            <InfoCard label="Drinking" value={detail.drinking_preference ?? "—"} />
            <InfoCard label="Joined" value={new Date(detail.created_at).toLocaleDateString()} />
          </div>
        </div>
      )}

      {tab === "trips" && (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          {!trips ? (
            <div className="h-[100px] animate-pulse" />
          ) : trips.length === 0 ? (
            <p className="p-6 text-[12.5px] text-[oklch(55%_0.01_255)]">No trips yet.</p>
          ) : (
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[oklch(92%_0.003_255)] bg-[oklch(98%_0.002_255)] text-left text-[11px] font-bold text-[oklch(50%_0.01_255)]">
                  <th scope="col" className="px-4 py-3">Trip</th>
                  <th scope="col" className="px-4 py-3">Role</th>
                  <th scope="col" className="px-4 py-3">Dates</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.tripId} className="border-b border-[oklch(94%_0.003_255)] last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/trips/${t.tripId}`} className="font-semibold hover:text-[oklch(45%_0.14_255)]">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{t.role}</td>
                    <td className="px-4 py-3">{t.dates}</td>
                    <td className="px-4 py-3">
                      <Pill tone={t.status}>{t.status.replace("_", " ")}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div>
          {can(staffUser, "decision.reverse") && (
            <div className="mb-4 flex justify-end">
              <AdminButton variant="primary" onClick={() => setAddingReview(true)}>
                + Add review
              </AdminButton>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {!reviews ? (
              <div className="h-[100px] animate-pulse rounded-2xl bg-[oklch(93%_0.003_255)]" />
            ) : reviews.length === 0 ? (
              <p className="text-[12.5px] text-[oklch(55%_0.01_255)]">No reviews yet.</p>
            ) : (
              reviews.map((r) => (
                <ReviewRow
                  key={r.id}
                  review={r}
                  canEdit={can(staffUser, "decision.reverse")}
                  onChanged={() => setReloadKey((k) => k + 1)}
                  onAnnounce={announce}
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === "moderation" && (
        <div className="rounded-2xl border border-[oklch(90%_0.005_255)] bg-white p-5">
          <h2 className="mb-4 text-[15px] font-bold">Enforcement ladder</h2>
          <div className="flex flex-wrap gap-2.5">
            {can(staffUser, "user.warn") && (
              <AdminButton onClick={() => setPendingAction("warn")}>Warn</AdminButton>
            )}
            {can(staffUser, "user.restrict") &&
              (detail.account_status === "restricted" ? (
                <AdminButton onClick={() => setPendingAction("liftRestriction")}>Lift restriction</AdminButton>
              ) : (
                <AdminButton onClick={() => setPendingAction("restrict")}>Restrict</AdminButton>
              ))}
            {can(staffUser, "user.suspend") &&
              (detail.account_status === "suspended" ? (
                <AdminButton onClick={() => setPendingAction("reinstate")}>Reinstate</AdminButton>
              ) : (
                <AdminButton variant="danger" onClick={() => setPendingAction("suspend")}>
                  Suspend
                </AdminButton>
              ))}
            {can(staffUser, "user.remove") && !detail.deleted_at && (
              <AdminButton variant="danger" onClick={() => setPendingAction("remove")}>
                Remove
              </AdminButton>
            )}
          </div>
          {!can(staffUser, "user.suspend") && (
            <p className="mt-3 text-[11.5px] text-[oklch(55%_0.01_255)]">Suspend and Remove require admin — you have moderator access.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingAction === "warn"}
        title="Warn user"
        consequence={`Sends a notification to ${detail.name}. No account state changes.`}
        onConfirm={(reason) => runAction("warn", reason)}
        onCancel={() => setPendingAction(null)}
        danger={false}
      />
      <ConfirmDialog
        open={pendingAction === "restrict"}
        title="Restrict account"
        consequence={`Blocks new trip creation and new join requests for ${detail.name}. Existing memberships, chats, and pending requests are untouched. Auto-lifts after 30 days.`}
        onConfirm={(reason) => runAction("restrict", reason)}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "liftRestriction"}
        title="Lift restriction early"
        consequence={`Restores full access for ${detail.name} immediately.`}
        requireReason={false}
        danger={false}
        onConfirm={(reason) => runAction("liftRestriction", reason)}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "suspend"}
        title="Suspend account"
        consequence={`Full freeze for ${detail.name}: cannot log in to authenticated actions. Any trips they organize with accepted members will be force-cancelled and members notified. This is the highest-impact enforcement action.`}
        confirmLabel="Suspend"
        onConfirm={(reason) => runAction("suspend", reason)}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "reinstate"}
        title="Reinstate account"
        consequence={`Restores full access for ${detail.name}.`}
        requireReason={false}
        danger={false}
        onConfirm={(reason) => runAction("reinstate", reason)}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingAction === "remove"}
        title="Remove account"
        consequence={`Permanently anonymizes ${detail.name}'s profile (name, contact, bio, photo). This cannot be undone. Reviews they wrote remain visible to their subjects as "Former traveller."`}
        confirmLabel="Remove permanently"
        onConfirm={(reason) => runAction("remove", reason)}
        onCancel={() => setPendingAction(null)}
      />

      {editingProfile && (
        <EditProfileDialog
          detail={detail}
          onClose={() => setEditingProfile(false)}
          onSaved={() => {
            setEditingProfile(false);
            announce("Profile updated.");
            setReloadKey((k) => k + 1);
          }}
        />
      )}
      {editingTrust && (
        <EditTrustScoreDialog
          userId={userId}
          currentScore={detail.trustScore}
          onClose={() => setEditingTrust(false)}
          onSaved={() => {
            setEditingTrust(false);
            announce("Trust Score updated.");
            setReloadKey((k) => k + 1);
          }}
        />
      )}
      {addingReview && (
        <AddReviewDialog
          revieweeId={userId}
          trips={trips ?? []}
          onClose={() => setAddingReview(false)}
          onSaved={() => {
            setAddingReview(false);
            announce("Review added.");
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[oklch(90%_0.005_255)] bg-white p-4">
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[oklch(55%_0.01_255)]">{label}</div>
      <div className="text-[13.5px]">{value}</div>
    </div>
  );
}

function ReviewRow({
  review,
  canEdit,
  onChanged,
  onAnnounce,
}: {
  review: { id: string; comment: string | null; rating: number; visibility: string; reviewerName: string };
  canEdit: boolean;
  onChanged: () => void;
  onAnnounce: (msg: string) => void;
}) {
  const [confirming, setConfirming] = useState<null | "hide" | "remove" | "restore">(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function act(kind: "hide" | "remove" | "restore", reason: string) {
    setBusy(true);
    try {
      if (kind === "hide") await hideReview(review.id, reason);
      if (kind === "remove") await removeReview(review.id, reason);
      if (kind === "restore") await restoreReview(review.id, reason || undefined);
      onAnnounce("Review updated.");
      onChanged();
    } catch (err) {
      onAnnounce(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[oklch(90%_0.005_255)] bg-white p-4">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[12.5px] font-semibold">
          {review.reviewerName} · ⭐ {review.rating}
        </div>
        <Pill tone={review.visibility}>{review.visibility}</Pill>
      </div>
      <p className="mb-3 text-[12.5px] text-[oklch(40%_0.01_255)]">{review.comment ?? "No comment."}</p>
      <div className="flex gap-2">
        {review.visibility === "published" && (
          <AdminButton onClick={() => setConfirming("hide")} disabled={busy}>
            Hide
          </AdminButton>
        )}
        {review.visibility !== "removed" && (
          <AdminButton variant="danger" onClick={() => setConfirming("remove")} disabled={busy}>
            Remove
          </AdminButton>
        )}
        {review.visibility === "hidden" && (
          <AdminButton onClick={() => setConfirming("restore")} disabled={busy}>
            Restore
          </AdminButton>
        )}
        {canEdit && (
          <AdminButton onClick={() => setEditing(true)} disabled={busy}>
            Edit
          </AdminButton>
        )}
      </div>
      <ConfirmDialog
        open={confirming === "hide"}
        title="Hide review"
        consequence="Excludes this review from Trust Score while hidden. Reversible."
        onConfirm={(reason) => act("hide", reason)}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "remove"}
        title="Remove review"
        consequence="Permanently excludes this review from Trust Score."
        confirmLabel="Remove"
        onConfirm={(reason) => act("remove", reason)}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "restore"}
        title="Restore review"
        consequence="Re-includes this review in Trust Score."
        requireReason={false}
        danger={false}
        onConfirm={(reason) => act("restore", reason)}
        onCancel={() => setConfirming(null)}
      />
      {editing && (
        <EditReviewDialog
          review={review}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onAnnounce("Review edited.");
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function EditReviewDialog({
  review,
  onClose,
  onSaved,
}: {
  review: { id: string; comment: string | null; rating: number };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(String(review.rating));
  const [comment, setComment] = useState(review.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      setError("Rating must be between 1 and 5.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await editReview(review.id, { rating: r, comment });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-[16px] font-bold">Edit review</h2>
        <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">
          Directly edits this review&apos;s rating and text, then recomputes Trust Score. This is an admin override of peer-authored content.
        </p>
        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Rating (1–5)</label>
          <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-[11.5px] font-semibold">Comment</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
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

function EditProfileDialog({
  detail,
  onClose,
  onSaved,
}: {
  detail: AdminUserDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(detail.name);
  const [bio, setBio] = useState(detail.bio ?? "");
  const [gender, setGender] = useState(detail.gender ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(detail.date_of_birth ?? "");
  const [phone, setPhone] = useState(detail.phone ?? "");
  const [email, setEmail] = useState(detail.email ?? "");
  const [smokingPreference, setSmokingPreference] = useState(detail.smoking_preference ?? "");
  const [drinkingPreference, setDrinkingPreference] = useState(detail.drinking_preference ?? "");
  const [tripsJoined, setTripsJoined] = useState(detail.trips_joined_override != null ? String(detail.trips_joined_override) : "");
  const [tripsCompleted, setTripsCompleted] = useState(detail.trips_completed_override != null ? String(detail.trips_completed_override) : "");
  const [tripsOrganized, setTripsOrganized] = useState(detail.trips_organized_override != null ? String(detail.trips_organized_override) : "");
  const [citiesExplored, setCitiesExplored] = useState(detail.cities_explored_override != null ? String(detail.cities_explored_override) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateUserProfile(detail.id, {
        name,
        bio,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        phone,
        email,
        smokingPreference,
        drinkingPreference,
        tripsJoinedOverride: tripsJoined === "" ? null : Number(tripsJoined),
        clearTripsJoinedOverride: tripsJoined === "",
        tripsCompletedOverride: tripsCompleted === "" ? null : Number(tripsCompleted),
        clearTripsCompletedOverride: tripsCompleted === "",
        tripsOrganizedOverride: tripsOrganized === "" ? null : Number(tripsOrganized),
        clearTripsOrganizedOverride: tripsOrganized === "",
        citiesExploredOverride: citiesExplored === "" ? null : Number(citiesExplored),
        clearCitiesExploredOverride: citiesExplored === "",
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-[16px] font-bold">Edit profile</h2>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
          </div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Gender</label>
            <input value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Date of birth</label>
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
          </div>
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Smoking preference</label>
            <input value={smokingPreference} onChange={(e) => setSmokingPreference(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Drinking preference</label>
            <input value={drinkingPreference} onChange={(e) => setDrinkingPreference(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-[oklch(85%_0.005_255)] p-3">
          <p className="mb-1 text-[11.5px] font-semibold">Travel activity (shown on profile)</p>
          <p className="mb-2.5 text-[11px] text-[oklch(55%_0.01_255)]">
            Manually set numbers — not computed from real trip history yet. Leave blank to show 0.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[oklch(45%_0.01_255)]">Trips joined</label>
              <input
                type="number"
                min={0}
                value={tripsJoined}
                onChange={(e) => setTripsJoined(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[oklch(45%_0.01_255)]">Trips completed</label>
              <input
                type="number"
                min={0}
                value={tripsCompleted}
                onChange={(e) => setTripsCompleted(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[oklch(45%_0.01_255)]">Trips organized</label>
              <input
                type="number"
                min={0}
                value={tripsOrganized}
                onChange={(e) => setTripsOrganized(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[oklch(45%_0.01_255)]">Cities explored</label>
              <input
                type="number"
                min={0}
                value={citiesExplored}
                onChange={(e) => setCitiesExplored(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
              />
            </div>
          </div>
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

function EditTrustScoreDialog({
  userId,
  currentScore,
  onClose,
  onSaved,
}: {
  userId: string;
  currentScore: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [score, setScore] = useState(String(currentScore.toFixed(1)));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = Number(score);
    if (!Number.isFinite(s) || s < 0 || s > 10) {
      setError("Score must be between 0 and 10.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required for this override.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await setTrustScore(userId, s, reason);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-[16px] font-bold">Set Trust Score</h2>
        <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">
          Directly overrides the computed score and freezes it — it will no longer update automatically from reviews or trip history until
          unfrozen.
        </p>
        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Score (0–10)</label>
          <input type="number" min={0} max={10} step={0.1} value={score} onChange={(e) => setScore(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-[11.5px] font-semibold">Reason (required)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        {error && <p className="mb-3 text-[12px] text-[oklch(45%_0.16_25)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" type="submit" loading={submitting}>
            Set score
          </AdminButton>
        </div>
      </form>
    </div>
  );
}

function AddReviewDialog({
  revieweeId,
  trips,
  onClose,
  onSaved,
}: {
  revieweeId: string;
  trips: AdminUserTripRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // No restriction to this user's own completed trips anymore — admin can
  // attribute a review to any trip on the platform. This user's own trips
  // (any status) are offered first since they're the most likely pick;
  // the search box below reaches every other trip.
  const [tripQuery, setTripQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminTripListItem[] | null>(null);
  const [tripId, setTripId] = useState(trips[0]?.tripId ?? "");
  const [tripLabel, setTripLabel] = useState(trips[0]?.title ?? "");
  const [reviewerDisplayName, setReviewerDisplayName] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripQuery.trim()) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    Promise.resolve()
      .then(() => getTrips({ q: tripQuery }, 10, 0))
      .then(({ trips: rows }) => {
        if (!cancelled) setSearchResults(rows);
      });
    return () => {
      cancelled = true;
    };
  }, [tripQuery]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tripId) {
      setError("Choose a trip to attribute this review to.");
      return;
    }
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      setError("Rating must be between 1 and 5.");
      return;
    }
    if (!comment.trim()) {
      setError("Comment is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await writeReview({ revieweeId, tripId, rating: r, comment, reviewerDisplayName: reviewerDisplayName.trim() || undefined });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-[16px] font-bold">Add review</h2>
        <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">
          Directly authors a published review on this user&apos;s profile. This is an admin override of the normal peer-review flow.
        </p>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Trip</label>
          {trips.length > 0 && (
            <select
              value={trips.some((t) => t.tripId === tripId) ? tripId : ""}
              onChange={(e) => {
                const t = trips.find((x) => x.tripId === e.target.value);
                if (t) {
                  setTripId(t.tripId);
                  setTripLabel(t.title);
                  setTripQuery("");
                }
              }}
              className="mb-1.5 w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
            >
              <option value="">This user's trips…</option>
              {trips.map((t) => (
                <option key={t.tripId} value={t.tripId}>
                  {t.title} ({t.status})
                </option>
              ))}
            </select>
          )}
          <input
            value={tripQuery}
            onChange={(e) => setTripQuery(e.target.value)}
            placeholder="Or search any trip by title…"
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
          {searchResults && (
            <div className="mt-1.5 max-h-[140px] overflow-y-auto rounded-lg border border-[oklch(90%_0.005_255)]">
              {searchResults.length === 0 ? (
                <p className="px-3 py-2 text-[11.5px] text-[oklch(55%_0.01_255)]">No trips match.</p>
              ) : (
                searchResults.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTripId(t.id);
                      setTripLabel(t.title);
                      setTripQuery("");
                      setSearchResults(null);
                    }}
                    className="block w-full px-3 py-2 text-left text-[12.5px] hover:bg-[oklch(97%_0.003_255)]"
                  >
                    {t.title}
                  </button>
                ))
              )}
            </div>
          )}
          {tripId && (
            <p className="mt-1.5 text-[11.5px] font-medium text-[oklch(40%_0.14_255)]">Selected: {tripLabel}</p>
          )}
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Reviewer name (optional)</label>
          <input
            value={reviewerDisplayName}
            onChange={(e) => setReviewerDisplayName(e.target.value)}
            placeholder="Leave blank to show your admin account"
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
          <p className="mt-1 text-[10.5px] text-[oklch(55%_0.01_255)]">
            A free-text name shown as the reviewer — not linked to a real account.
          </p>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Rating (1–5)</label>
          <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-[11.5px] font-semibold">Comment</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        {error && <p className="mb-3 text-[12px] text-[oklch(45%_0.16_25)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" loading={submitting}>
            Add review
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
