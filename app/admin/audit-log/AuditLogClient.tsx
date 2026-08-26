"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuditLog, type RecentAuditEntry } from "@/lib/admin/data";
import { TableSkeleton, EmptyState, ErrorRetry } from "@/components/admin/ui";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin/guard";

const PAGE_SIZE = 40;

const ACTION_TYPES = [
  "verification_approved",
  "verification_rejected",
  "user_warned",
  "user_restricted",
  "user_restriction_lifted",
  "user_suspended",
  "user_reinstated",
  "user_removed",
  "trip_hidden",
  "trip_unhidden",
  "trip_registrations_closed",
  "trip_registrations_reopened",
  "trip_force_cancelled",
  "trip_member_removed",
  "review_hidden",
  "review_removed",
  "review_restored",
  "company_verified",
  "company_suspended",
  "company_removed",
];

function changeSummary(entry: RecentAuditEntry): string {
  const old = entry.old_value as Record<string, unknown> | null;
  const next = entry.new_value as Record<string, unknown> | null;
  if (old && next) {
    const key = Object.keys(next)[0];
    if (key && key in old) return `${String(old[key])} → ${String(next[key])}`;
  }
  if (entry.reason) return entry.reason;
  return "—";
}

export function AuditLogClient() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [actionType, setActionType] = useState("all");
  const [entries, setEntries] = useState<RecentAuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setError(false);
        return getAuditLog({ q: q || undefined, actionType }, PAGE_SIZE, offset);
      })
      .then(({ entries: rows, total: t }) => {
        if (cancelled) return;
        setEntries((prev) => (offset === 0 ? rows : [...(prev ?? []), ...rows]));
        setTotal(t);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [q, actionType, offset]);

  return (
    <div>
      <h1 className="font-display text-[26px] font-bold">Audit log</h1>
      <p className="mb-5 text-[13px] text-[oklch(50%_0.01_255)]">
        {can(user, "auditLog.viewAll") ? "Every moderator and admin action, immutable" : "Your own actions, immutable"}
      </p>

      <div className="mb-4 flex gap-2.5">
        <input
          placeholder="Search by actor or resource type"
          onChange={(e) => {
            setEntries(null);
            setOffset(0);
            setQ(e.target.value);
          }}
          className="w-[320px] rounded-lg border border-[oklch(85%_0.005_255)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[oklch(52%_0.18_255)]"
        />
        <select
          onChange={(e) => {
            setEntries(null);
            setOffset(0);
            setActionType(e.target.value);
          }}
          className="rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2.5 text-[13px]"
        >
          <option value="all">All action types</option>
          {ACTION_TYPES.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorRetry message="Couldn't load the audit log." onRetry={() => setOffset((o) => o)} />
      ) : !entries ? (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <TableSkeleton rows={8} cols={5} />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState title="No matching entries" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[oklch(92%_0.003_255)] bg-[oklch(98%_0.002_255)] text-left text-[11px] font-bold text-[oklch(50%_0.01_255)]">
                <th scope="col" className="px-4 py-3">When</th>
                <th scope="col" className="px-4 py-3">Actor</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">Resource</th>
                <th scope="col" className="px-4 py-3">Change</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[oklch(94%_0.003_255)] last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-[oklch(40%_0.01_255)]">
                    {new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 font-semibold">{e.actorName}</td>
                  <td className="px-4 py-3 capitalize">{e.action.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    {e.entity_id ? (
                      <Link href={`/admin/${entityPath(e.entity_type)}/${e.entity_id}`} className="text-[oklch(45%_0.14_255)] hover:underline">
                        {e.entity_type}
                      </Link>
                    ) : (
                      e.entity_type
                    )}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-[oklch(50%_0.01_255)]">{changeSummary(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries && entries.length > 0 && entries.length < total && (
        <div className="mt-4 text-center">
          <button onClick={() => setOffset((o) => o + PAGE_SIZE)} className="text-[12.5px] font-semibold text-[oklch(45%_0.14_255)] hover:underline">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

function entityPath(entityType: string): string {
  if (entityType === "user") return "users";
  if (entityType === "trip") return "trips";
  return entityType;
}
