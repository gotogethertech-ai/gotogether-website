"use client";

import { useEffect, useState, useCallback } from "react";
import { getCompanies, type AdminCompanyListItem } from "@/lib/admin/data";
import { verifyCompany, suspendCompany, removeCompany, createCompany } from "@/lib/admin/mutations";
import { Pill, TableSkeleton, EmptyState, ErrorRetry, ConfirmDialog, AdminButton, useLiveAnnouncer } from "@/components/admin/ui";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin/guard";

type Action = "verify" | "suspend" | "remove";

export function CompaniesClient() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<AdminCompanyListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [target, setTarget] = useState<{ id: string; name: string; action: Action } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { announce, region } = useLiveAnnouncer();

  const load = useCallback(() => {
    setError(false);
    getCompanies().then(setCompanies).catch(() => setError(true));
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const verified = (companies ?? []).filter((c) => c.status === "verified").length;
  const pending = (companies ?? []).filter((c) => c.status === "under_review").length;

  async function runAction(reason: string) {
    if (!target) return;
    try {
      if (target.action === "verify") await verifyCompany(target.id, reason || undefined);
      if (target.action === "suspend") await suspendCompany(target.id, reason);
      if (target.action === "remove") await removeCompany(target.id, reason);
      announce("Action completed.");
      setTarget(null);
      load();
    } catch (err) {
      announce(err instanceof Error ? err.message : "Action failed.");
      setTarget(null);
    }
  }

  if (error) return <ErrorRetry message="Couldn't load companies." onRetry={load} />;

  return (
    <div>
      {region}
      <div className="mb-1 flex items-start justify-between">
        <h1 className="font-display text-[26px] font-bold">Travel companies</h1>
        {can(user, "company.decide") && (
          <AdminButton variant="primary" onClick={() => setCreateOpen(true)}>
            + Create Company
          </AdminButton>
        )}
      </div>
      <p className="mb-6 text-[13px] text-[oklch(50%_0.01_255)]">
        {companies ? `${verified} verified · ${pending} pending application` : "Loading…"}
      </p>

      {!companies ? (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <TableSkeleton rows={5} cols={5} />
        </div>
      ) : companies.length === 0 ? (
        <EmptyState title="No companies yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[oklch(92%_0.003_255)] bg-[oklch(98%_0.002_255)] text-left text-[11px] font-bold text-[oklch(50%_0.01_255)]">
                <th scope="col" className="px-4 py-3">Company</th>
                <th scope="col" className="px-4 py-3">Contact</th>
                <th scope="col" className="px-4 py-3">Trips run</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-[oklch(94%_0.003_255)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-[10.5px] text-[oklch(55%_0.01_255)]">{c.registration_number ?? "No registration on file"}</div>
                  </td>
                  <td className="px-4 py-3 text-[oklch(40%_0.01_255)]">{c.contact_email ?? "—"}</td>
                  <td className="px-4 py-3">{c.tripsRun}</td>
                  <td className="px-4 py-3">
                    <Pill tone={c.status === "verified" ? "verified" : c.status === "under_review" ? "under_review" : "suspended"}>
                      {c.status.replace("_", " ")}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {c.status !== "verified" && can(user, "company.decide") && (
                        <AdminButton onClick={() => setTarget({ id: c.id, name: c.name, action: "verify" })}>Verify</AdminButton>
                      )}
                      {c.status !== "suspended" && can(user, "company.decide") && (
                        <AdminButton variant="danger" onClick={() => setTarget({ id: c.id, name: c.name, action: "suspend" })}>
                          Suspend
                        </AdminButton>
                      )}
                      {can(user, "company.decide") && (
                        <AdminButton variant="danger" onClick={() => setTarget({ id: c.id, name: c.name, action: "remove" })}>
                          Remove
                        </AdminButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-[oklch(88%_0.03_60)] bg-[oklch(98%_0.02_60)] px-4 py-3 text-[12px] text-[oklch(42%_0.12_60)]">
        Suspending a company hides all its listings from discovery but does not auto-cancel trips with already-accepted travellers — a resolvable
        compliance issue shouldn&apos;t strand people mid-booking. Removing a company force-cancels its active trips and notifies members.
      </div>

      <ConfirmDialog
        open={target?.action === "verify"}
        title="Verify company"
        consequence={`Marks ${target?.name} as verified. Its trips become eligible for Verified Partner placement.`}
        requireReason={false}
        danger={false}
        onConfirm={runAction}
        onCancel={() => setTarget(null)}
      />
      <ConfirmDialog
        open={target?.action === "suspend"}
        title="Suspend company"
        consequence={`Hides ${target?.name}'s listings from discovery. Existing trips with accepted travellers are not cancelled.`}
        onConfirm={runAction}
        onCancel={() => setTarget(null)}
      />
      <ConfirmDialog
        open={target?.action === "remove"}
        title="Remove company"
        consequence={`Force-cancels ${target?.name}'s active trips and notifies every accepted member. This cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={runAction}
        onCancel={() => setTarget(null)}
      />

      {createOpen && (
        <CreateCompanyDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            announce("Company created.");
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateCompanyDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createCompany({
        name,
        contactEmail: contactEmail || undefined,
        registrationNumber: registrationNumber || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-[16px] font-bold">Create company</h2>
        <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">
          Adds a new travel company, starting in &quot;under review&quot; status. Verify it separately once its documentation checks out.
        </p>
        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Company name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Contact email</label>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-[11.5px] font-semibold">Registration number</label>
          <input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
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
