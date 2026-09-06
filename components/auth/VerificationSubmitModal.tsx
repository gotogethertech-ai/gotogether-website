"use client";

import { useState } from "react";
import {
  VERIFICATION_DOCUMENT_TYPES,
  VERIFICATION_DOC_MAX_BYTES,
  VerificationValidationError,
  submitVerification,
} from "@/lib/real-verification";

/**
 * Real ID-verification submission form: pick a document type, upload a
 * photo of it, submit — this is the actual write path behind the
 * dormant `verifications` table + admin review queue. Rendered wherever
 * a user needs to start verification (the VerificationRequiredInterstitial
 * gate, the Settings page, and My Profile's "Verification status" row),
 * all of which previously had no real submission UI at all.
 */
export function VerificationSubmitModal({
  userId,
  onClose,
  onSubmitted,
}: {
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Please choose a JPEG, PNG, or WEBP image.");
      return;
    }
    if (selected.size > VERIFICATION_DOC_MAX_BYTES) {
      setError("The photo must be 8MB or smaller.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!documentType || !file) {
      setError("Choose a document type and upload a photo.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitVerification(userId, documentType, file);
      setSubmitted(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof VerificationValidationError || err instanceof Error ? err.message : "Couldn't submit your verification. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[oklch(20%_0.01_255/0.45)] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-[20px] bg-surface p-7 shadow-[0_24px_60px_-12px_oklch(20%_0.02_255/0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <>
            <h2 className="mb-2 font-display text-lg font-bold">Verification submitted</h2>
            <p className="mb-5 text-[13px] leading-relaxed text-text-secondary">
              Thanks — we&apos;ll review your document and usually get back to you within 24 hours.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-full bg-primary py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90"
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="verification-modal-title" className="mb-1 font-display text-lg font-bold">
              Verify your ID
            </h2>
            <p className="mb-4 text-[12.5px] leading-relaxed text-text-tertiary">
              Choose a government ID and upload a clear photo of it. Reviewed by our team, usually within 24 hours.
            </p>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold">Document type</label>
              <div className="flex flex-wrap gap-2">
                {VERIFICATION_DOCUMENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setDocumentType(t.value)}
                    className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold ${
                      documentType === t.value ? "border-primary bg-primary text-white" : "border-border text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-semibold">Document photo</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="verification-file-input"
              />
              {previewUrl ? (
                <label
                  htmlFor="verification-file-input"
                  className="block cursor-pointer overflow-hidden rounded-xl border border-border-input"
                >
                  {/* Local blob preview only — no need for next/image here */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="" className="max-h-[180px] w-full object-contain bg-surface-hover" />
                </label>
              ) : (
                <label
                  htmlFor="verification-file-input"
                  className="flex h-28 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border text-[13px] font-semibold text-text-tertiary hover:border-primary hover:text-primary"
                >
                  + Upload a photo of your document
                </label>
              )}
            </div>

            {error && <p className="mb-3 text-[11.5px] font-medium text-danger">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !documentType || !file}
                className="rounded-full bg-primary px-5 py-2 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
