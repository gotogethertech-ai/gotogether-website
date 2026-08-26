"use client";

import { useEffect, useState } from "react";
import {
  getMyCompany,
  registerCompany,
  companyStatusLabel,
  type MyCompany,
} from "@/lib/real-company";

/**
 * "Register your travel company" — profile-page entry point for the
 * Partner-trip feature: any signed-in member can register a company from
 * their own account (no separate signup flow), it starts under_review,
 * and once an admin verifies it, Create Trip's Partner option opens up
 * for every member of that company. Placed right after the Verification
 * status row, following the same "label + status text + conditional
 * action" idiom used there.
 */
export function TravelCompanySection() {
  const [company, setCompany] = useState<MyCompany | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyCompany().then((c) => {
      if (!cancelled) setCompany(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleRegistered(c: MyCompany) {
    setCompany(c);
    setShowForm(false);
  }

  // Still loading — render nothing rather than a flash of "not registered".
  if (company === undefined) return null;

  return (
    <div className="rounded-2xl border border-border px-5 py-3.5">
      {!company ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold text-text-secondary">Travel company</div>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Run a travel business? Register it to publish Partner trips.
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex-none text-[11.5px] font-semibold text-primary hover:underline"
              >
                Register your travel company →
              </button>
            )}
          </div>
          {showForm && (
            <div className="mt-4">
              <RegisterCompanyForm onCancel={() => setShowForm(false)} onRegistered={handleRegistered} />
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12.5px] font-semibold text-text-secondary">Travel company</div>
            <div className="mt-0.5 text-[12.5px] font-bold">{company.name}</div>
          </div>
          <StatusPill status={company.status} />
        </div>
      )}
      {company?.status === "under_review" && (
        <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
          Our team is reviewing your company details. This usually takes 1–2 business days — Partner trips unlock
          automatically once you&apos;re verified.
        </p>
      )}
      {company?.status === "suspended" && (
        <p className="mt-2 text-[11px] leading-relaxed text-danger">
          Your company&apos;s Partner access has been suspended. Contact support if you think this is a mistake.
        </p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: MyCompany["status"] }) {
  const styles =
    status === "verified"
      ? "bg-trust-bg text-trust-fg"
      : status === "suspended"
        ? "bg-[oklch(95%_0.04_25)] text-danger"
        : "bg-surface-tint text-text-tertiary";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}>
      {companyStatusLabel(status)}
    </span>
  );
}

function RegisterCompanyForm({
  onCancel,
  onRegistered,
}: {
  onCancel: () => void;
  onRegistered: (c: MyCompany) => void;
}) {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerCompany({ name, contactEmail, registrationNumber, gstNumber });
      onRegistered({
        id: "",
        name: name.trim(),
        contactEmail: contactEmail.trim() || null,
        registrationNumber: registrationNumber.trim() || null,
        gstNumber: gstNumber.trim() || null,
        status: "under_review",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't register your company. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl bg-surface-tint p-4">
      <Field label="Company name" required>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Himalayan Trails Pvt. Ltd."
          className="w-full rounded-lg border border-border-input bg-white px-3 py-2 text-[12.5px] outline-none focus:border-primary"
        />
      </Field>
      <Field label="Contact email">
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="bookings@yourcompany.com"
          className="w-full rounded-lg border border-border-input bg-white px-3 py-2 text-[12.5px] outline-none focus:border-primary"
        />
      </Field>
      <Field label="Registration number">
        <input
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          placeholder="Company / business registration number"
          className="w-full rounded-lg border border-border-input bg-white px-3 py-2 text-[12.5px] outline-none focus:border-primary"
        />
      </Field>
      <Field label="GST number" optional>
        <input
          value={gstNumber}
          onChange={(e) => setGstNumber(e.target.value)}
          placeholder="Optional for now"
          className="w-full rounded-lg border border-border-input bg-white px-3 py-2 text-[12.5px] outline-none focus:border-primary"
        />
      </Field>

      <p className="text-[10.5px] leading-relaxed text-text-muted">
        GST and business-proof documents are optional while we&apos;re getting started — we&apos;ll require them
        once the platform has a larger company base. Your registration is reviewed by our team before Partner
        trips unlock.
      </p>

      {error && (
        <p role="alert" className="text-[11.5px] font-medium text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3.5 py-2 text-[12px] font-semibold text-text-secondary hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="rounded-full bg-primary px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-text-secondary">
        {label}
        {required && <span className="text-danger"> *</span>}
        {optional && <span className="text-text-muted font-normal"> (optional)</span>}
      </span>
      {children}
    </label>
  );
}
