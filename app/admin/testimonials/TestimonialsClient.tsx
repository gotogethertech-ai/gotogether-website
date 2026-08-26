"use client";

import { useEffect, useState, useCallback } from "react";
import { getTestimonials, type AdminTestimonialRow } from "@/lib/admin/data";
import { createTestimonial, updateTestimonial, deleteTestimonial } from "@/lib/admin/mutations";
import { Pill, EmptyState, ErrorRetry, AdminButton, useLiveAnnouncer } from "@/components/admin/ui";

export function TestimonialsClient() {
  const [rows, setRows] = useState<AdminTestimonialRow[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<AdminTestimonialRow | "new" | null>(null);
  const { announce, region } = useLiveAnnouncer();

  const load = useCallback(() => {
    setError(false);
    getTestimonials().then(setRows).catch(() => setError(true));
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  if (error) return <ErrorRetry message="Couldn't load testimonials." onRetry={load} />;

  return (
    <div>
      {region}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[26px] font-bold">Website testimonials</h1>
          <p className="text-[13px] text-[oklch(50%_0.01_255)]">Marketing content for the public site — separate from trip reviews</p>
        </div>
        <AdminButton variant="primary" onClick={() => setEditing("new")}>
          + New Testimonial
        </AdminButton>
      </div>

      <div className="mb-5 rounded-xl border border-[oklch(88%_0.03_60)] bg-[oklch(98%_0.02_60)] px-4 py-3 text-[12px] text-[oklch(42%_0.12_60)]">
        Testimonials are marketing quotes published with the person&apos;s consent and are never mixed into Trust Score or a user&apos;s review
        list. Trip reviews are peer-written evidence and can only be hidden or removed elsewhere — never authored by an admin.
      </div>

      {!rows ? (
        <div className="h-[200px] animate-pulse rounded-2xl bg-[oklch(93%_0.003_255)]" />
      ) : rows.length === 0 ? (
        <EmptyState title="No testimonials yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[oklch(92%_0.003_255)] bg-[oklch(98%_0.002_255)] text-left text-[11px] font-bold text-[oklch(50%_0.01_255)]">
                <th scope="col" className="px-4 py-3">Quote</th>
                <th scope="col" className="px-4 py-3">Attributed to</th>
                <th scope="col" className="px-4 py-3">Consent</th>
                <th scope="col" className="px-4 py-3">Visibility</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-[oklch(94%_0.003_255)] last:border-0">
                  <td className="max-w-[320px] px-4 py-3 italic text-[oklch(30%_0.01_255)]">&ldquo;{t.quote}&rdquo;</td>
                  <td className="px-4 py-3 text-[oklch(40%_0.01_255)]">
                    {t.attributed_name}
                    {t.attributed_location ? `, ${t.attributed_location}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={t.consent_recorded_at ? "verified" : "rejected"}>{t.consent_recorded_at ? "On file" : "Missing"}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={t.is_published ? "active" : "hidden"}>{t.is_published ? "Live" : "Hidden"}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdminButton onClick={() => setEditing(t)}>Edit</AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <TestimonialDialog
          testimonial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            announce("Testimonial saved.");
          }}
          onDeleted={() => {
            setEditing(null);
            load();
            announce("Testimonial deleted.");
          }}
        />
      )}
    </div>
  );
}

function TestimonialDialog({
  testimonial,
  onClose,
  onSaved,
  onDeleted,
}: {
  testimonial: AdminTestimonialRow | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [quote, setQuote] = useState(testimonial?.quote ?? "");
  const [attributedName, setAttributedName] = useState(testimonial?.attributed_name ?? "");
  const [attributedLocation, setAttributedLocation] = useState(testimonial?.attributed_location ?? "");
  const [consent, setConsent] = useState(!!testimonial?.consent_recorded_at);
  const [published, setPublished] = useState(testimonial?.is_published ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote.trim() || !attributedName.trim()) {
      setError("Quote and attributed name are required.");
      return;
    }
    if (published && !consent) {
      setError("Consent must be on file before this can be published.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (testimonial) {
        await updateTestimonial(testimonial.id, {
          quote,
          attributedName,
          attributedLocation: attributedLocation || null,
          consentRecorded: consent,
          isPublished: published,
        });
      } else {
        await createTestimonial({
          quote,
          attributedName,
          attributedLocation: attributedLocation || undefined,
          consentRecorded: consent,
          publish: published,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!testimonial) return;
    setSubmitting(true);
    try {
      await deleteTestimonial(testimonial.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-[16px] font-bold">{testimonial ? "Edit testimonial" : "New testimonial"}</h2>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Quote</label>
          <textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Attributed name</label>
            <input value={attributedName} onChange={(e) => setAttributedName(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Location</label>
            <input value={attributedLocation} onChange={(e) => setAttributedLocation(e.target.value)} className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]" />
          </div>
        </div>
        <label className="mb-2 flex items-center gap-2 text-[12.5px]">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Consent recorded — this person agreed to have their quote published
        </label>
        <label className="mb-4 flex items-center gap-2 text-[12.5px]">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} disabled={!consent} />
          Published (live on the public site){!consent && <span className="text-[11px] text-[oklch(55%_0.01_255)]"> — requires consent</span>}
        </label>

        {error && <p className="mb-3 text-[12px] text-[oklch(45%_0.16_25)]">{error}</p>}

        <div className="flex items-center justify-between">
          {testimonial ? (
            <button type="button" onClick={remove} disabled={submitting} className="text-[12px] font-semibold text-[oklch(45%_0.16_25)] hover:underline">
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <AdminButton variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" type="submit" loading={submitting}>
              Save
            </AdminButton>
          </div>
        </div>
      </form>
    </div>
  );
}
