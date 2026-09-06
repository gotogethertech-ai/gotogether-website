"use client";

import { useCallback, useEffect, useState } from "react";
import { getVerificationState, type VerificationState } from "@/lib/real-verification";
import { VerificationSubmitModal } from "@/components/auth/VerificationSubmitModal";

/**
 * Real "Verification status" row for My Profile — replaces the old
 * users.verification_status-only display (which could only ever show
 * "Not verified"/"ID Verified" and linked to a Settings row that itself
 * did nothing) with the true state derived from the `verifications`
 * table: unverified, pending review, verified, or rejected with a
 * reason and a way to resubmit.
 */
export function VerificationStatusRow({ userId }: { userId: string }) {
  const [state, setState] = useState<VerificationState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    getVerificationState(userId).then(setState);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!state) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border px-5 py-3.5">
        <span className="text-[12.5px] font-semibold text-text-secondary">Verification status</span>
        <span className="text-[12px] text-text-muted">Loading…</span>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border px-5 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-text-secondary">Verification status</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-[12px] font-bold ${
                state.kind === "verified" ? "text-trust-fg" : state.kind === "rejected" ? "text-danger" : "text-text-tertiary"
              }`}
            >
              {state.kind === "verified" && "ID Verified"}
              {state.kind === "pending" && "Verification pending"}
              {state.kind === "rejected" && "Not verified — resubmission needed"}
              {state.kind === "unverified" && "Not verified"}
            </span>
            {(state.kind === "unverified" || state.kind === "rejected") && (
              <button onClick={() => setModalOpen(true)} className="text-[11.5px] font-semibold text-primary hover:underline">
                {state.kind === "rejected" ? "Resubmit →" : "Complete →"}
              </button>
            )}
          </div>
        </div>
        {state.kind === "rejected" && state.reason && (
          <p className="mt-1.5 text-[11.5px] text-text-tertiary">Reason: {state.reason}</p>
        )}
      </div>

      {modalOpen && (
        <VerificationSubmitModal
          userId={userId}
          onClose={() => setModalOpen(false)}
          onSubmitted={load}
        />
      )}
    </>
  );
}
