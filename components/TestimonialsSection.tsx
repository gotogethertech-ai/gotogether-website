import type { TestimonialRow } from "@/lib/testimonials-server";

/**
 * Homepage testimonials — quotes written and consent-gated in the admin
 * panel (app/admin/testimonials), never mixed with real trip reviews or
 * Trust Score (see that page's own banner). Placed directly above the
 * footer per its own section, so it reads as a closing "here's what real
 * travellers say" beat before the page ends. Renders nothing when there
 * are no published testimonials yet, rather than showing an empty section.
 */
export function TestimonialsSection({ testimonials }: { testimonials: TestimonialRow[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="bg-surface-alt">
      <div className="mx-auto max-w-(--section-max-width) px-8 py-14">
        <p className="mb-2 text-[11px] font-bold tracking-wide text-primary uppercase">
          What travellers say
        </p>
        <h2 className="mb-8 font-display text-[28px] font-bold tracking-tight">
          Real trips, real people
        </h2>
        <div className="grid grid-cols-1 gap-5 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.id} className="flex flex-col justify-between rounded-2xl bg-surface p-6 shadow-[0_1px_3px_oklch(20%_0.02_255/0.08)]">
              <blockquote className="mb-4 text-[13.5px] leading-relaxed text-text-secondary">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="text-[12.5px] font-semibold text-text-primary">
                {t.attributed_name}
                {t.attributed_location && (
                  <span className="font-normal text-text-muted"> · {t.attributed_location}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
