"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { PrimaryButton } from "@/components/ui/Button";
import {
  CLICK_MAX_PHOTOS,
  CLICK_PHOTO_MAX_BYTES,
  CLICK_PHOTO_MIME_TO_EXT,
  CLICK_STORY_MAX,
  CLICK_TITLE_MAX,
  CLICK_TRIP_TYPES,
  ClickValidationError,
  createClickDraft,
  deleteClickPhoto,
  publishClick,
  reorderClickPhotos,
  saveClickFields,
  uploadClickPhoto,
  type ClickDraftFields,
  type ClickPhotoRow,
  type ClickTripType,
} from "@/lib/real-clicks";
import { getMyHostedTrips } from "@/lib/real-trips";
import type { HostedTrip } from "@/lib/my-trips-data";

type Step = "photos" | "story" | "trip-info";
const STEP_ORDER: Step[] = ["photos", "story", "trip-info"];
const STEP_LABEL: Record<Step, string> = {
  photos: "Photos",
  story: "Story",
  "trip-info": "Trip Info",
};

type LocalPhoto = { row: ClickPhotoRow; uploading: false } | { tempId: string; file: File; previewUrl: string; uploading: true };

/**
 * Create Click — a 3-step flow (Photos -> Story -> optional Trip Info),
 * per the Clicks feature spec sections 3-5. Unlike Create Trip's
 * blueprint-mandated step wizard with strict forward/back gating, this
 * stays intentionally loose: a Click row is created in 'draft' status
 * immediately (createClickDraft) so "Save Draft" is always just "leave
 * without publishing" rather than a separate persistence path — the spec
 * explicitly says drafts must survive and be resumable, and the simplest
 * way to guarantee that is for the draft to already be a real row from
 * the first photo upload onward.
 */
export function CreateClickClient() {
  const { user, isLoggedIn, loading, requireAuth } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);
  const gateHasRun = authChecked;

  useEffect(() => {
    if (loading || gateHasRun) return;
    requireAuth("create a Click", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, gateHasRun]);

  if (!authChecked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <button onClick={() => router.push("/")} className="text-sm font-semibold text-text-secondary hover:text-primary">
          ← Back to GoTogether
        </button>
      </div>
    );
  }

  return <CreateClickFlow userId={user.id} />;
}

function CreateClickFlow({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("photos");
  const [clickId, setClickId] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [fields, setFields] = useState<ClickDraftFields>({
    title: "",
    story: "",
    destination: "",
    startDate: null,
    endDate: null,
    tripType: null,
    tripId: null,
  });
  const [myTrips, setMyTrips] = useState<HostedTrip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the user's own trips lazily, only once the Trip Info step is
  // reached — most Clicks won't link to a trip and there's no reason to
  // pay this query on every visit to the create flow.
  useEffect(() => {
    if (step !== "trip-info" || myTrips !== null) return;
    getMyHostedTrips(userId).then(setMyTrips);
  }, [step, myTrips, userId]);

  const ensureDraft = useCallback(async (): Promise<string> => {
    if (clickId) return clickId;
    setCreatingDraft(true);
    try {
      const id = await createClickDraft(userId);
      setClickId(id);
      return id;
    } finally {
      setCreatingDraft(false);
    }
  }, [clickId, userId]);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const files = Array.from(fileList);
    const remainingSlots = CLICK_MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setError(`You can add up to ${CLICK_MAX_PHOTOS} photos per Click.`);
      return;
    }
    const toUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setError(`Only added ${remainingSlots} of ${files.length} photos — ${CLICK_MAX_PHOTOS} photo limit per Click.`);
    }

    let id: string;
    try {
      id = await ensureDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start this Click. Try again.");
      return;
    }

    for (const file of toUpload) {
      if (!CLICK_PHOTO_MIME_TO_EXT[file.type]) {
        setError("Please choose JPEG, PNG, or WEBP images only.");
        continue;
      }
      if (file.size > CLICK_PHOTO_MAX_BYTES) {
        setError("Each photo must be 8MB or smaller.");
        continue;
      }
      const tempId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      const displayOrder = photos.length;
      setPhotos((prev) => [...prev, { tempId, file, previewUrl, uploading: true }]);
      try {
        const row = await uploadClickPhoto(userId, id, file, displayOrder);
        setPhotos((prev) => prev.map((p) => ("tempId" in p && p.tempId === tempId ? { row, uploading: false } : p)));
        URL.revokeObjectURL(previewUrl);
      } catch (err) {
        setPhotos((prev) => prev.filter((p) => !("tempId" in p && p.tempId === tempId)));
        URL.revokeObjectURL(previewUrl);
        setError(err instanceof Error ? err.message : "One of your photos failed to upload. Try again.");
      }
    }
  }

  async function handleRemovePhoto(photo: LocalPhoto) {
    if (photo.uploading) return; // can't remove mid-upload; let it finish or fail first
    setPhotos((prev) => prev.filter((p) => p !== photo));
    try {
      await deleteClickPhoto(photo.row.id, photo.row.storage_path);
    } catch {
      // Row is already gone from local state; a failed remote cleanup
      // isn't worth blocking the UI over — matches deleteClickPhoto's own
      // "best effort storage cleanup" stance.
    }
  }

  async function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const reordered = [...photos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setPhotos(reordered);
    const uploadedIds = reordered.filter((p): p is Extract<LocalPhoto, { uploading: false }> => !p.uploading).map((p) => p.row.id);
    if (clickId && uploadedIds.length > 0) {
      try {
        await reorderClickPhotos(clickId, uploadedIds);
      } catch {
        // Non-fatal — local order still reflects what the user asked for;
        // a failed persist here would surface again next time they load
        // this draft, not silently lose their work.
      }
    }
  }

  async function handleSaveDraft() {
    setError(null);
    setSaving(true);
    try {
      const id = await ensureDraft();
      await saveClickFields(id, fields);
      router.push("/profile?tab=clicks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your draft. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setError(null);
    setSaving(true);
    try {
      const id = await ensureDraft();
      await publishClick(id, fields);
      router.push(`/clicks/${id}`);
    } catch (err) {
      if (err instanceof ClickValidationError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Couldn't publish this Click. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const stepIndex = STEP_ORDER.indexOf(step);
  const uploadedCount = photos.filter((p) => !p.uploading).length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Create Click</h1>
        <button onClick={() => router.back()} className="text-sm font-semibold text-text-secondary hover:text-primary">
          Cancel
        </button>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(s)}
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11.5px] font-bold ${
                i <= stepIndex ? "bg-primary text-white" : "bg-surface-tint text-text-muted"
              }`}
            >
              {i + 1}
            </button>
            <span className={`text-[12.5px] font-semibold ${i <= stepIndex ? "text-text-primary" : "text-text-muted"}`}>{STEP_LABEL[s]}</span>
            {i < STEP_ORDER.length - 1 && <div className="h-px flex-1 bg-border-divider" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-[oklch(96%_0.03_25)] px-4 py-3 text-[13px] text-[oklch(45%_0.16_25)]">{error}</div>
      )}

      {step === "photos" && (
        <PhotosStep
          photos={photos}
          creatingDraft={creatingDraft}
          fileInputRef={fileInputRef}
          onFilesSelected={handleFilesSelected}
          onRemove={handleRemovePhoto}
          onMove={movePhoto}
        />
      )}

      {step === "story" && (
        <StoryStep
          fields={fields}
          onChange={(patch) => setFields((f) => ({ ...f, ...patch }))}
        />
      )}

      {step === "trip-info" && (
        <TripInfoStep
          fields={fields}
          onChange={(patch) => setFields((f) => ({ ...f, ...patch }))}
          myTrips={myTrips}
        />
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStep(STEP_ORDER[stepIndex - 1])}
          className="text-sm font-semibold text-text-secondary hover:text-primary disabled:cursor-default disabled:opacity-0"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="rounded-full border border-border px-5 py-2.5 text-[13px] font-semibold text-text-secondary hover:bg-surface-hover disabled:opacity-60"
          >
            Save Draft
          </button>
          {stepIndex < STEP_ORDER.length - 1 ? (
            <button
              type="button"
              disabled={step === "photos" && uploadedCount === 0}
              onClick={() => setStep(STEP_ORDER[stepIndex + 1])}
              className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-default disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <PrimaryButton onClick={handlePublish} disabled={saving} className="w-auto px-6 py-2.5 text-[13px]">
              {saving ? "Publishing…" : "Publish"}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotosStep({
  photos,
  creatingDraft,
  fileInputRef,
  onFilesSelected,
  onRemove,
  onMove,
}: {
  photos: LocalPhoto[];
  creatingDraft: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | null) => void;
  onRemove: (photo: LocalPhoto) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <div>
      <p className="mb-4 text-[13px] text-text-tertiary">
        Add {CLICK_MAX_PHOTOS >= 10 ? "10–15" : `up to ${CLICK_MAX_PHOTOS}`} photos from your trip. The first photo becomes your cover
        image unless you reorder them.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          onFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={creatingDraft || photos.length >= CLICK_MAX_PHOTOS}
        onClick={() => fileInputRef.current?.click()}
        className="mb-5 flex h-32 w-full items-center justify-center rounded-2xl border-2 border-dashed border-border text-[13px] font-semibold text-text-tertiary hover:border-primary hover:text-primary disabled:cursor-default disabled:opacity-50"
      >
        {creatingDraft ? "Starting…" : photos.length === 0 ? "+ Choose photos from your gallery" : "+ Add more photos"}
      </button>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, i) => (
            <div key={"row" in photo ? photo.row.id : photo.tempId} className="group relative aspect-square overflow-hidden rounded-xl bg-surface-hover">
              <Image
                src={photo.uploading ? photo.previewUrl : photo.row.image_url}
                alt=""
                fill
                sizes="200px"
                className={`object-cover ${photo.uploading ? "opacity-50" : ""}`}
                unoptimized={photo.uploading}
              />
              {photo.uploading && (
                <div className="absolute inset-0 flex items-center justify-center text-[10.5px] font-semibold text-text-secondary">Uploading…</div>
              )}
              {i === 0 && !photo.uploading && (
                <span className="absolute top-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[9.5px] font-bold text-white">Cover</span>
              )}
              {!photo.uploading && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button type="button" disabled={i === 0} onClick={() => onMove(i, -1)} className="text-[11px] text-white disabled:opacity-30">
                      ←
                    </button>
                    <button type="button" disabled={i === photos.length - 1} onClick={() => onMove(i, 1)} className="text-[11px] text-white disabled:opacity-30">
                      →
                    </button>
                  </div>
                  <button type="button" onClick={() => onRemove(photo)} className="text-[11px] font-semibold text-white">
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StoryStep({
  fields,
  onChange,
}: {
  fields: ClickDraftFields;
  onChange: (patch: Partial<ClickDraftFields>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold">Title</label>
        <input
          value={fields.title}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={CLICK_TITLE_MAX}
          placeholder="My 5 Days in Spiti Valley"
          className="w-full rounded-xl border border-border-input px-4 py-3 text-[14px] focus:border-primary focus:outline-none"
        />
        <p className="mt-1 text-right text-[10.5px] text-text-muted">
          {fields.title.length}/{CLICK_TITLE_MAX}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold">Story</label>
        <textarea
          value={fields.story}
          onChange={(e) => onChange({ story: e.target.value })}
          maxLength={CLICK_STORY_MAX}
          rows={10}
          placeholder="I had been planning this trip for months…"
          className="w-full resize-y rounded-xl border border-border-input px-4 py-3 text-[14px] leading-relaxed focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}

function TripInfoStep({
  fields,
  onChange,
  myTrips,
}: {
  fields: ClickDraftFields;
  onChange: (patch: Partial<ClickDraftFields>) => void;
  myTrips: HostedTrip[] | null;
}) {
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-text-muted">Everything below is optional.</p>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold">Destination</label>
        <input
          value={fields.destination}
          onChange={(e) => onChange({ destination: e.target.value })}
          placeholder="Spiti Valley, Himachal Pradesh"
          className="w-full rounded-xl border border-border-input px-4 py-3 text-[14px] focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-[12.5px] font-semibold">Trip start</label>
          <input
            type="date"
            value={fields.startDate ?? ""}
            onChange={(e) => onChange({ startDate: e.target.value || null })}
            className="w-full rounded-xl border border-border-input px-4 py-3 text-[14px] focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-[12.5px] font-semibold">Trip end</label>
          <input
            type="date"
            value={fields.endDate ?? ""}
            onChange={(e) => onChange({ endDate: e.target.value || null })}
            className="w-full rounded-xl border border-border-input px-4 py-3 text-[14px] focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold">Trip type</label>
        <div className="flex flex-wrap gap-2">
          {CLICK_TRIP_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ tripType: fields.tripType === t.value ? null : (t.value as ClickTripType) })}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold ${
                fields.tripType === t.value ? "border-primary bg-primary text-white" : "border-border text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold">Which trip is this from?</label>
        {myTrips === null ? (
          <p className="text-[12.5px] text-text-muted">Loading your trips…</p>
        ) : myTrips.length === 0 ? (
          <p className="text-[12.5px] text-text-muted">You haven&apos;t organized any trips on GoTogether yet.</p>
        ) : (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[13px]">
              <input type="radio" checked={fields.tripId === null} onChange={() => onChange({ tripId: null })} />
              None
            </label>
            {myTrips.map((t) => (
              <label key={t.tripId} className="flex items-center gap-2 text-[13px]">
                <input type="radio" checked={fields.tripId === t.tripId} onChange={() => onChange({ tripId: t.tripId })} />
                {t.title || t.destination}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
