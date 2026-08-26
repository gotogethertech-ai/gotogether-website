"use client";

import { useEffect, useState, useCallback } from "react";
import { getPendingVerifications, type AdminVerificationListItem } from "@/lib/admin/data";
import { approveVerification, rejectVerification, AlreadyDecidedError } from "@/lib/admin/mutations";
import { EmptyState, ErrorRetry, AdminButton, useLiveAnnouncer } from "@/components/admin/ui";
import type { Database } from "@/lib/supabase/database.types";

type RejectionReason = Database["public"]["Enums"]["verification_rejection_reason"];

const REJECTION_LABELS: Record<RejectionReason, string> = {
  blurry_image: "Blurry image",
  name_mismatch: "Name mismatch",
  expired_document: "Expired document",
  selfie_mismatch: "Selfie mismatch",
  unsupported_document_type: "Unsupported document type",
};

function daysAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
}

export function VerificationQueueClient() {
  const [queue, setQueue] = useState<AdminVerificationListItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | "">("");
  const [busy, setBusy] = useState(false);
  const { announce, region } = useLiveAnnouncer();

  const load = useCallback(() => {
    setError(false);
    getPendingVerifications()
      .then((rows) => {
        setQueue(rows);
        setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const selected = queue?.find((v) => v.id === selectedId) ?? null;
  const oldest = queue?.[0];

  async function handleApprove() {
    if (!selected) return;
    setBusy(true);
    try {
      await approveVerification(selected.id);
      announce(`Approved verification for ${selected.userName}.`);
      setSelectedId(null);
      load();
    } catch (err) {
      if (err instanceof AlreadyDecidedError) {
        announce(err.message);
        load();
      } else {
        announce(err instanceof Error ? err.message : "Failed to approve.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!selected || !rejectionReason) return;
    setBusy(true);
    try {
      await rejectVerification(selected.id, rejectionReason);
      announce(`Rejected verification for ${selected.userName}.`);
      setRejecting(false);
      setRejectionReason("");
      setSelectedId(null);
      load();
    } catch (err) {
      if (err instanceof AlreadyDecidedError) {
        announce(err.message);
        setRejecting(false);
        load();
      } else {
        announce(err instanceof Error ? err.message : "Failed to reject.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorRetry message="Couldn't load the verification queue." onRetry={load} />;

  return (
    <div>
      {region}
      <h1 className="font-display text-[26px] font-bold">Verification queue</h1>
      <p className="mb-6 text-[13px] text-[oklch(50%_0.01_255)]">
        {queue ? `${queue.length} pending` : "Loading…"}
        {oldest ? ` · oldest submitted ${daysAgo(oldest.submitted_at)} day${daysAgo(oldest.submitted_at) === 1 ? "" : "s"} ago` : ""}
      </p>

      {!queue ? (
        <div className="h-[300px] animate-pulse rounded-2xl bg-[oklch(93%_0.003_255)]" />
      ) : queue.length === 0 ? (
        <EmptyState title="Nothing pending" hint="Every submitted verification has been reviewed." />
      ) : (
        <div className="grid grid-cols-[280px_1fr] gap-6">
          <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
            {queue.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`block w-full border-b border-[oklch(94%_0.003_255)] px-4 py-3 text-left last:border-0 ${
                  v.id === selectedId ? "bg-[oklch(96%_0.03_255)]" : "hover:bg-[oklch(98%_0.002_255)]"
                }`}
              >
                <div className="text-[13px] font-bold">{v.userName}</div>
                <div className="text-[11px] text-[oklch(55%_0.01_255)]">
                  {v.document_type ?? "Document"} · {daysAgo(v.submitted_at)} day{daysAgo(v.submitted_at) === 1 ? "" : "s"} ago
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="rounded-2xl border border-[oklch(90%_0.005_255)] bg-white p-5">
              <h2 className="mb-4 text-[15px] font-bold">
                {selected.userName} · {selected.document_type ?? "Government ID"}
              </h2>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <DocPlaceholder label="ID document" />
                <DocPlaceholder label="Selfie" />
              </div>

              <dl className="mb-5 flex flex-col gap-2 text-[12.5px]">
                <Row label="Document type" value={selected.document_type ?? "—"} />
                <Row label="Submitted" value={`${daysAgo(selected.submitted_at)} day${daysAgo(selected.submitted_at) === 1 ? "" : "s"} ago`} />
              </dl>

              {!rejecting ? (
                <div className="flex gap-2.5">
                  <AdminButton variant="primary" onClick={handleApprove} loading={busy}>
                    Approve
                  </AdminButton>
                  <AdminButton variant="danger" onClick={() => setRejecting(true)} disabled={busy}>
                    Reject with reason
                  </AdminButton>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-semibold">Rejection reason (required)</label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
                    className="mb-3 w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
                  >
                    <option value="">Select a reason…</option>
                    {(Object.keys(REJECTION_LABELS) as RejectionReason[]).map((r) => (
                      <option key={r} value={r}>
                        {REJECTION_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2.5">
                    <AdminButton variant="danger" onClick={handleReject} disabled={!rejectionReason} loading={busy}>
                      Confirm rejection
                    </AdminButton>
                    <AdminButton variant="ghost" onClick={() => setRejecting(false)} disabled={busy}>
                      Cancel
                    </AdminButton>
                  </div>
                </div>
              )}
              <p className="mt-4 text-[11px] text-[oklch(55%_0.01_255)]">
                Rejection requires a reason code: blurry image, name mismatch, expired document, selfie mismatch, or unsupported document type.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-[120px] items-center justify-center rounded-xl bg-[oklch(95%_0.003_255)] text-[11.5px] text-[oklch(55%_0.01_255)]">
      {label}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[oklch(95%_0.003_255)] pb-2 last:border-0">
      <dt className="text-[oklch(55%_0.01_255)]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
