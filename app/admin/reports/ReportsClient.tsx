"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin/guard";
import { getReports, type AdminReportListItem, type ReportsFilter } from "@/lib/admin/data";
import { resolveReport, hideClick, deleteClick, removeClickComment } from "@/lib/admin/mutations";
import { Pill, EmptyState, ErrorRetry, AdminButton, ConfirmDialog, useLiveAnnouncer } from "@/components/admin/ui";

const REASON_LABEL: Record<string, string> = {
  spam: "Spam or misleading",
  harassment: "Harassment or bullying",
  inappropriate_content: "Inappropriate content",
  misinformation: "False or misleading information",
  safety_concern: "Safety concern",
  other: "Something else",
};

const STATUS_TONE: Record<string, string> = {
  pending: "pending",
  reviewed: "in_progress",
  actioned: "active",
  dismissed: "hidden",
};

function contentHref(row: AdminReportListItem): string | null {
  if (row.content_type === "click") return `/clicks/${row.content_id}`;
  if (row.content_type === "click_comment") return null; // comments have no standalone page
  return null;
}

/**
 * Reports queue (spec sections 17/18, migration 065) — the first admin
 * moderation-queue page in the app: every other admin_* moderation action
 * (hide a trip, remove a review) has no "someone reported this" step
 * behind it, just a direct staff decision. This page is where a filed
 * report gets triaged: see what was reported, jump to the content, take
 * an action on it, then resolve the report row itself. Scoped to Clicks/
 * comments for now since that's the only reportable content type with a
 * "Report" button wired up yet — report_content_type already covers
 * trip/review/user for whenever those get a Report button too.
 */
export function ReportsClient() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<ReportsFilter>({ status: "pending" });
  const [rows, setRows] = useState<AdminReportListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [actioning, setActioning] = useState<{ row: AdminReportListItem; kind: "hide" | "delete" | "removeComment" } | null>(null);
  const { announce, region } = useLiveAnnouncer();

  const load = useCallback(() => {
    setError(false);
    setRows(null);
    getReports(filter).then(setRows).catch(() => setError(true));
  }, [filter]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const canResolve = can(user, "report.resolve");
  const canHideClick = can(user, "click.hide");
  const canDeleteClick = can(user, "click.delete");
  const canRemoveComment = can(user, "clickComment.remove");

  async function handleDismiss(row: AdminReportListItem) {
    try {
      await resolveReport(row.id, "dismissed");
      announce("Report dismissed.");
      load();
    } catch (err) {
      announce(err instanceof Error ? err.message : "Couldn't dismiss the report.");
    }
  }

  async function handleReviewed(row: AdminReportListItem) {
    try {
      await resolveReport(row.id, "reviewed");
      announce("Marked as reviewed.");
      load();
    } catch (err) {
      announce(err instanceof Error ? err.message : "Couldn't update the report.");
    }
  }

  async function handleAction(reason: string) {
    if (!actioning) return;
    const { row, kind } = actioning;
    try {
      if (kind === "hide") await hideClick(row.content_id, reason);
      else if (kind === "delete") await deleteClick(row.content_id, reason);
      else await removeClickComment(row.content_id, reason);

      await resolveReport(row.id, "actioned", reason);
      announce(kind === "removeComment" ? "Comment removed." : "Click " + (kind === "hide" ? "hidden." : "deleted."));
      setActioning(null);
      load();
    } catch (err) {
      announce(err instanceof Error ? err.message : "Couldn't complete this action.");
      setActioning(null);
    }
  }

  if (error) return <ErrorRetry message="Couldn't load reports." onRetry={load} />;

  return (
    <div>
      {region}
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold">Reports</h1>
        <p className="text-[13px] text-[oklch(50%_0.01_255)]">User-filed reports on Clicks and comments</p>
      </div>

      <div className="mb-4 flex gap-2">
        {(["pending", "reviewed", "actioned", "dismissed", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter((f) => ({ ...f, status: s }))}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${
              (filter.status ?? "pending") === s
                ? "bg-[oklch(92%_0.05_255)] text-[oklch(35%_0.15_255)]"
                : "border border-[oklch(88%_0.005_255)] text-[oklch(40%_0.01_255)] hover:bg-[oklch(97%_0.003_255)]"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {!rows ? (
        <div className="h-[200px] animate-pulse rounded-2xl bg-[oklch(93%_0.003_255)]" />
      ) : rows.length === 0 ? (
        <EmptyState title="No reports" hint="Nothing matches this filter right now." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[oklch(92%_0.003_255)] bg-[oklch(98%_0.002_255)] text-left text-[11px] font-bold text-[oklch(50%_0.01_255)]">
                <th scope="col" className="px-4 py-3">Content</th>
                <th scope="col" className="px-4 py-3">Reason</th>
                <th scope="col" className="px-4 py-3">Reported by</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = contentHref(row);
                return (
                  <tr key={row.id} className="border-b border-[oklch(94%_0.003_255)] last:border-0 align-top">
                    <td className="max-w-[260px] px-4 py-3">
                      <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[oklch(55%_0.01_255)]">
                        {row.content_type === "click" ? "Click" : "Comment"}
                      </div>
                      {row.contentSummary ? (
                        href ? (
                          <Link href={href} target="_blank" className="text-primary hover:underline">
                            {row.contentSummary}
                          </Link>
                        ) : (
                          <span className="italic text-[oklch(40%_0.01_255)]">&ldquo;{row.contentSummary}&rdquo;</span>
                        )
                      ) : (
                        <span className="text-[oklch(55%_0.01_255)]">Content no longer available</span>
                      )}
                      {row.details && <div className="mt-1 text-[11px] text-[oklch(50%_0.01_255)]">"{row.details}"</div>}
                    </td>
                    <td className="px-4 py-3 text-[oklch(35%_0.01_255)]">{REASON_LABEL[row.reason] ?? row.reason}</td>
                    <td className="px-4 py-3 text-[oklch(40%_0.01_255)]">{row.reporterName}</td>
                    <td className="px-4 py-3">
                      <Pill tone={STATUS_TONE[row.status] ?? "pending"}>{row.status}</Pill>
                      {row.resolution_note && <div className="mt-1 max-w-[160px] text-[10.5px] text-[oklch(55%_0.01_255)]">{row.resolution_note}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status === "pending" || row.status === "reviewed" ? (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {row.status === "pending" && canResolve && (
                            <AdminButton variant="ghost" onClick={() => handleReviewed(row)}>
                              Mark reviewed
                            </AdminButton>
                          )}
                          {row.content_type === "click" && canHideClick && (
                            <AdminButton variant="danger" onClick={() => setActioning({ row, kind: "hide" })}>
                              Hide Click
                            </AdminButton>
                          )}
                          {row.content_type === "click" && canDeleteClick && (
                            <AdminButton variant="danger" onClick={() => setActioning({ row, kind: "delete" })}>
                              Delete Click
                            </AdminButton>
                          )}
                          {row.content_type === "click_comment" && canRemoveComment && (
                            <AdminButton variant="danger" onClick={() => setActioning({ row, kind: "removeComment" })}>
                              Remove comment
                            </AdminButton>
                          )}
                          {canResolve && (
                            <AdminButton variant="ghost" onClick={() => handleDismiss(row)}>
                              Dismiss
                            </AdminButton>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[oklch(55%_0.01_255)]">
                          {row.status === "actioned" ? "Actioned" : "Dismissed"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!actioning}
        title={
          actioning?.kind === "hide"
            ? "Hide this Click?"
            : actioning?.kind === "delete"
              ? "Delete this Click?"
              : "Remove this comment?"
        }
        consequence={
          actioning?.kind === "delete"
            ? "This permanently removes the Click from discovery. It can't be easily undone."
            : "This removes the content from public view. You can restore it later if needed."
        }
        confirmLabel={actioning?.kind === "delete" ? "Delete" : actioning?.kind === "hide" ? "Hide" : "Remove"}
        onConfirm={handleAction}
        onCancel={() => setActioning(null)}
      />
    </div>
  );
}

// Restore actions (unhide a Click / restore a removed comment) aren't
// exposed on this page yet — they read most naturally from the Click's
// own admin surface (a hidden Click shown in an admin trips-style list)
// once one exists; restoreClick/restoreClickComment are already wired in
// lib/admin/mutations.ts for that follow-up.
