"use client";

import { useState } from "react";
import { reportContent, REPORT_REASONS, type ReportContentType, type ReportReason } from "@/lib/real-clicks-moderation";

/**
 * Report dialog (spec sections 17/18) — used for both a Click and a
 * comment on one, distinguished by contentType/contentId. This is the
 * first Report UI built anywhere in the app; PublicProfileClient's own
 * "Report" button (⋮ menu) is still a no-op stub from an earlier phase —
 * left as-is here since generalizing it to users is a separate follow-up,
 * not blocking Clicks moderation.
 */
export function ReportModal({
  contentType,
  contentId,
  onClose,
}: {
  contentType: ReportContentType;
  contentId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Choose a reason.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reportContent(contentType, contentId, reason, details);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your report. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <>
            <h2 className="mb-2 text-[16px] font-bold">Report submitted</h2>
            <p className="mb-5 text-[13px] text-text-secondary">
              Thanks for letting us know. Our team will review this {contentType === "click_comment" ? "comment" : "Click"}.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-full bg-clicks-primary py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-clicks-primary-dark"
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="report-modal-title" className="mb-1 text-[16px] font-bold">
              Report this {contentType === "click_comment" ? "comment" : "Click"}
            </h2>
            <p className="mb-4 text-[12.5px] text-text-tertiary">
              Tell us what's wrong. Reports are reviewed by our team and kept confidential from the person you're reporting.
            </p>

            <div className="mb-4 flex flex-col gap-1.5">
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2.5 rounded-lg border border-border-input px-3 py-2.5 text-[12.5px] has-[:checked]:border-clicks-primary has-[:checked]:bg-clicks-background">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              maxLength={1000}
              rows={3}
              className="mb-4 w-full resize-none rounded-lg border border-border-input px-3 py-2 text-[12.5px] outline-none focus:border-clicks-primary"
            />

            {error && <p className="mb-3 text-[11.5px] font-medium text-danger">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason}
                className="rounded-full bg-clicks-primary px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-clicks-primary-dark disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
