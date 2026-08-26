"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUsers, type AdminUserListItem, type UsersFilter } from "@/lib/admin/data";
import { createDirectUser } from "@/lib/admin/mutations";
import { Pill, TableSkeleton, EmptyState, ErrorRetry, AdminButton } from "@/components/admin/ui";
import { useAuth } from "@/lib/auth-context";

const PAGE_SIZE = 25;

export function UsersListClient() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<UsersFilter>({});
  const [users, setUsers] = useState<AdminUserListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setError(false);
        return getUsers(filter, PAGE_SIZE, offset);
      })
      .then(({ users: rows, total: t }) => {
        if (cancelled) return;
        setUsers((prev) => (offset === 0 ? rows : [...(prev ?? []), ...rows]));
        setTotal(t);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, offset, reloadKey]);

  function applyFilter(patch: Partial<UsersFilter>) {
    setUsers(null);
    setOffset(0);
    setFilter((f) => ({ ...f, ...patch }));
  }

  const restrictedOrSuspended = (users ?? []).filter((u) => u.account_status !== "active").length;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[26px] font-bold">Users</h1>
          <p className="text-[13px] text-[oklch(50%_0.01_255)]">
            {total.toLocaleString()} total{users ? ` · ${restrictedOrSuspended} restricted or suspended (this page)` : ""}
          </p>
        </div>
        <AdminButton variant="primary" onClick={() => setCreateOpen(true)}>
          + Create User
        </AdminButton>
      </div>

      <div className="mb-4 flex gap-2.5">
        <input
          placeholder="Search by name, phone, or email"
          onChange={(e) => applyFilter({ q: e.target.value || undefined })}
          className="w-[320px] rounded-lg border border-[oklch(85%_0.005_255)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[oklch(52%_0.18_255)]"
        />
        <select
          onChange={(e) => applyFilter({ status: (e.target.value || "all") as UsersFilter["status"] })}
          className="rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2.5 text-[13px]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="restricted">Restricted</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          onChange={(e) => applyFilter({ verification: (e.target.value || "all") as UsersFilter["verification"] })}
          className="rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2.5 text-[13px]"
        >
          <option value="all">All verification</option>
          <option value="id_verified">ID Verified</option>
          <option value="phone_verified">Phone only</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {error ? (
        <ErrorRetry
          message="Couldn't load users."
          onRetry={() => {
            setUsers(null);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : !users ? (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <TableSkeleton rows={8} cols={6} />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title={Object.values(filter).some(Boolean) ? "No users match your filters" : "No users yet"}
          hint={Object.values(filter).some(Boolean) ? "Try clearing a filter." : undefined}
          action={
            Object.values(filter).some(Boolean) ? (
              <button
                onClick={() => {
                  setUsers(null);
                  setOffset(0);
                  setFilter({});
                }}
                className="text-[12px] font-semibold text-[oklch(45%_0.14_255)] hover:underline"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[oklch(92%_0.003_255)] bg-[oklch(98%_0.002_255)] text-left text-[11px] font-bold text-[oklch(50%_0.01_255)]">
                <th scope="col" className="px-4 py-3">User</th>
                <th scope="col" className="px-4 py-3">Contact</th>
                <th scope="col" className="px-4 py-3">Verification</th>
                <th scope="col" className="px-4 py-3">Trust</th>
                <th scope="col" className="px-4 py-3">Trips</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[oklch(94%_0.003_255)] last:border-0 hover:bg-[oklch(98%_0.002_255)]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2.5 font-semibold text-[oklch(20%_0.01_255)] hover:text-[oklch(45%_0.14_255)]">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[oklch(90%_0.02_255)] text-[10.5px] font-bold text-[oklch(40%_0.1_255)]">
                        {u.initials ?? u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div>{u.name}</div>
                        <div className="text-[10.5px] font-normal text-[oklch(55%_0.01_255)]">Joined {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[oklch(40%_0.01_255)]">{u.phone ?? u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Pill tone={u.verification_status}>{verificationLabel(u.verification_status)}</Pill>
                  </td>
                  <td className="px-4 py-3 font-bold">{u.trustScore.toFixed(1)}</td>
                  <td className="px-4 py-3">{u.tripCount}</td>
                  <td className="px-4 py-3">
                    <Pill tone={u.account_status}>{u.account_status[0].toUpperCase() + u.account_status.slice(1)}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {users && users.length > 0 && users.length < total && (
        <div className="mt-4 text-center">
          <p className="mb-2 text-[12px] text-[oklch(55%_0.01_255)]">
            Showing {users.length} of {total.toLocaleString()}
          </p>
          <button onClick={() => setOffset((o) => o + PAGE_SIZE)} className="text-[12.5px] font-semibold text-[oklch(45%_0.14_255)] hover:underline">
            Load more
          </button>
        </div>
      )}

      {createOpen && user && (
        <CreateUserDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setUsers(null);
            setOffset(0);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function verificationLabel(status: string): string {
  if (status === "id_verified") return "ID Verified";
  if (status === "phone_verified") return "Phone only";
  return "Unverified";
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tempPassword: string; email: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required — this creates a real, immediately-usable account.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { tempPassword } = await createDirectUser({ name, email, phone: phone || undefined });
      setResult({ tempPassword, email });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-1 text-[16px] font-bold">Account created</h2>
          <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">
            Share these credentials with the person directly — they won&apos;t be shown again. They can sign in with this email and password now,
            or link Google to the same email later.
          </p>
          <div className="mb-4 rounded-lg border border-[oklch(85%_0.005_255)] bg-[oklch(97%_0.003_255)] p-3 text-[12.5px]">
            <div className="mb-1">
              <span className="font-semibold">Email:</span> {result.email}
            </div>
            <div className="font-mono">
              <span className="font-sans font-semibold">Temp password:</span> {result.tempPassword}
            </div>
          </div>
          <div className="flex justify-end">
            <AdminButton variant="primary" onClick={onClose}>
              Done
            </AdminButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-[16px] font-bold">Create user</h2>
        <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">
          Creates a real, immediately-usable account with a system-generated temporary password — not a pending registration. You&apos;ll need to
          relay the password to this person directly.
        </p>
        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-[11.5px] font-semibold">Phone (optional)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        {error && <p className="mb-3 text-[12px] text-[oklch(45%_0.16_25)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" loading={submitting}>
            Create
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
