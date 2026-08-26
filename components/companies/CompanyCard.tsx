import Link from "next/link";
import { VerifiedBadge } from "./VerifiedBadge";
import { formatRatingWithBasis, type RealCompany } from "@/lib/real-companies";

/**
 * Company Card, per the blueprint's spec: logo → name+badge → trips-run +
 * rating-with-basis row. Whole card links to the profile. No promotional
 * variation between cards (Concept C). No one-line description shown —
 * the real companies table has no description column (see
 * lib/real-companies.ts's file comment), so this doesn't fabricate one.
 */
export function CompanyCard({ company }: { company: RealCompany }) {
  return (
    <Link
      href={`/travel-companies/${company.slug}`}
      className="block rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-[0_8px_24px_-8px_oklch(20%_0.02_255/0.15)]"
    >
      <div className="mb-2.5 flex items-center gap-2.5">
        <div
          aria-hidden="true"
          className="flex h-13 w-13 flex-none items-center justify-center rounded-xl bg-surface-avatar text-sm font-bold text-primary"
          style={{ width: 52, height: 52 }}
        >
          {company.logoInitial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-bold">{company.name}</div>
          <div className="mt-0.5">
            <VerifiedBadge size="small" showTooltip={false} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border-divider pt-2.5 text-[10.5px] text-text-muted">
        <span>{company.tripsRun} trips</span>
        <span className="font-semibold text-trust-fg">⭐ {formatRatingWithBasis(company)}</span>
      </div>
    </Link>
  );
}
