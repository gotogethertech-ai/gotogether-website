"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardStats, getRecentAuditActivity, type DashboardStats, type RecentAuditEntry } from "@/lib/admin/data";
import { StatCard, TableSkeleton, ErrorRetry } from "@/components/admin/ui";

const ACTION_LABELS: Record<string, string> = {
  verification_approved: "approved verification for",
  verification_rejected: "rejected verification for",
  trip_hidden: "hid trip",
  trip_unhidden: "unhid trip",
  trip_force_cancelled: "force-cancelled trip",
  trip_registrations_closed: "closed registrations for",
  user_warned: "warned",
  user_restricted: "restricted account for",
  user_restriction_lifted: "lifted restriction for",
  user_suspended: "restricted account for",
  user_reinstated: "reinstated",
  user_removed: "removed",
  review_hidden: "hid a review flagged as",
  review_removed: "removed a review flagged as",
  review_restored: "restored a review for",
  company_verified: "verified company",
  company_suspended: "suspended company",
  company_removed: "removed company",
  trip_member_removed: "removed a member from",
};

function describeAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentAuditEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setError(false);
        return Promise.all([getDashboardStats(), getRecentAuditActivity(4)]);
      })
      .then(([s, a]) => {
        if (cancelled) return;
        setStats(s);
        setActivity(a);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div>
      <h1 className="font-display text-[26px] font-bold">Dashboard</h1>
      <p className="mb-6 text-[13px] text-[oklch(50%_0.01_255)]">Operational overview</p>

      {error ? (
        <ErrorRetry message="Couldn't load dashboard data." onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !stats ? (
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[86px] flex-1 animate-pulse rounded-2xl bg-[oklch(93%_0.003_255)]" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-8 flex gap-4">
            <StatCard value={stats.totalUsers.toLocaleString()} label="Total users" />
            <StatCard value={stats.activeTrips.toLocaleString()} label="Active trips" />
            <StatCard value={stats.pendingVerifications} label="Pending verifications" tone={stats.pendingVerifications > 0 ? "warn" : "default"} />
            <StatCard value={stats.openReports} label="Open reports" tone={stats.openReports > 0 ? "danger" : "default"} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[oklch(90%_0.005_255)] bg-white p-5">
              <h2 className="mb-4 text-[15px] font-bold">Needs your attention</h2>
              <div className="flex flex-col gap-3">
                {stats.pendingVerifications > 0 && (
                  <AttentionRow
                    label={`${stats.pendingVerifications} verification${stats.pendingVerifications === 1 ? "" : "s"} awaiting review`}
                    hint={
                      stats.oldestPendingVerificationDaysAgo !== null
                        ? `Oldest submitted ${stats.oldestPendingVerificationDaysAgo} day${stats.oldestPendingVerificationDaysAgo === 1 ? "" : "s"} ago`
                        : undefined
                    }
                    cta="Review"
                    href="/admin/verification"
                  />
                )}
                {stats.pendingCompanyApplications > 0 && (
                  <AttentionRow
                    label={`${stats.pendingCompanyApplications} company application${stats.pendingCompanyApplications === 1 ? "" : "s"} pending`}
                    cta="Review"
                    href="/admin/companies"
                  />
                )}
                {stats.frozenTrustScoresAwaitingReview > 0 && (
                  <AttentionRow
                    label={`${stats.frozenTrustScoresAwaitingReview} Trust Score${stats.frozenTrustScoresAwaitingReview === 1 ? "" : "s"} frozen by anomaly check`}
                    hint="Awaiting manual review"
                    cta="Inspect"
                    href="/admin/users"
                  />
                )}
                {stats.pendingVerifications === 0 && stats.pendingCompanyApplications === 0 && stats.frozenTrustScoresAwaitingReview === 0 && (
                  <p className="text-[12.5px] text-[oklch(55%_0.01_255)]">Nothing needs your attention right now.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[oklch(90%_0.005_255)] bg-white p-5">
              <h2 className="mb-4 text-[15px] font-bold">Recent admin activity</h2>
              {!activity ? (
                <TableSkeleton rows={4} cols={1} />
              ) : activity.length === 0 ? (
                <p className="text-[12.5px] text-[oklch(55%_0.01_255)]">No moderator or admin actions yet.</p>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {activity.map((entry) => (
                    <div key={entry.id} className="text-[12.5px]">
                      <span className="font-bold">{entry.actorName}</span> {describeAction(entry.action)}{" "}
                      <span className="font-semibold">{entry.entity_type}</span>
                      <div className="text-[10.5px] text-[oklch(55%_0.01_255)]">{timeAgo(entry.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/admin/audit-log" className="mt-4 inline-block text-[12px] font-semibold text-[oklch(45%_0.14_255)] hover:underline">
                View full audit log →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AttentionRow({ label, hint, cta, href }: { label: string; hint?: string; cta: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[oklch(94%_0.003_255)] pb-3 last:border-0 last:pb-0">
      <div>
        <div className="text-[13px] font-bold">{label}</div>
        {hint && <div className="text-[11px] text-[oklch(55%_0.01_255)]">{hint}</div>}
      </div>
      <Link
        href={href}
        className="flex-none rounded-full border border-[oklch(85%_0.005_255)] px-3.5 py-1.5 text-[11.5px] font-semibold hover:bg-[oklch(97%_0.003_255)]"
      >
        {cta}
      </Link>
    </div>
  );
}
