import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VerifiedBadge } from "@/components/companies/VerifiedBadge";
import { ExploreTripCard } from "@/components/ui/ExploreTripCard";
import {
  formatRatingWithBasis,
  formatTripsRun,
  getTripsForCompany,
  type CompanyData,
} from "@/lib/companies-data";

const VISIBLE_CAP = 6;

/**
 * Company Profile, per the blueprint's Step 5: header (logo, name, badge
 * with tooltip, description, trust row, "Verified since") → About (fuller
 * description, support contact, cancellation policy) → Company Trips
 * (reused TripCard, 6-visible cap, no Create Trip CTA on empty — a
 * visitor can't create a trip on a company's behalf).
 */
export function CompanyProfileClient({ company }: { company: CompanyData }) {
  const trips = getTripsForCompany(company.name);
  const visibleTrips = trips.slice(0, VISIBLE_CAP);
  const hasMore = trips.length > VISIBLE_CAP;

  return (
    <>
      <Header activePath="/travel-companies" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[1000px] px-8 pb-20 max-[599px]:px-4">
          <nav aria-label="Breadcrumb" className="pt-4 text-[11.5px] text-primary">
            <Link href="/travel-companies" className="font-medium hover:underline">
              Travel Companies
            </Link>
            <span className="text-text-muted"> › </span>
            <span className="text-text-tertiary">{company.name}</span>
          </nav>

          <div className="flex flex-col gap-4.5 py-6 min-[600px]:flex-row min-[600px]:items-start">
            <div
              aria-hidden="true"
              className="flex h-22 w-22 flex-none items-center justify-center rounded-2xl bg-surface-avatar text-xl font-bold text-primary"
              style={{ width: 88, height: 88 }}
            >
              {company.logoInitial}
            </div>
            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold">{company.name}</h1>
                <VerifiedBadge />
              </div>
              <div className="mb-2 text-[12px] text-text-muted">
                Verified since {company.verifiedSince} · {formatTripsRun(company)} ·{" "}
                <span className="font-semibold text-trust-fg">⭐ {formatRatingWithBasis(company)}</span>
              </div>
              <p className="max-w-[520px] text-[12.5px] leading-relaxed text-text-secondary">
                {company.description}
              </p>
            </div>
          </div>

          <section className="border-t border-border-divider py-5">
            <h2 className="mb-2.5 font-display text-base font-bold">About</h2>
            <p className="mb-3.5 max-w-[640px] text-[12.5px] leading-relaxed text-text-secondary">
              {company.aboutFull}
            </p>
            <div className="flex flex-wrap gap-8 text-[12px] text-text-secondary">
              <div>
                <strong>Support:</strong> {company.supportEmail}
              </div>
              {company.cancellationPolicy && (
                <div>
                  <strong>Cancellation policy:</strong> {company.cancellationPolicy}
                </div>
              )}
            </div>
          </section>

          <section className="border-t border-border-divider py-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">Trips by {company.name}</h2>
              {hasMore && (
                <Link
                  href={`/explore?company=${encodeURIComponent(company.name)}`}
                  className="text-[12.5px] font-semibold text-primary hover:underline"
                >
                  View all in Explore →
                </Link>
              )}
            </div>

            {visibleTrips.length > 0 ? (
              <div className="grid grid-cols-1 gap-4.5 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
                {visibleTrips.map((trip) => (
                  <ExploreTripCard key={trip.id} trip={trip} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-surface-tint px-6 py-10 text-center text-[13.5px] text-text-tertiary">
                This company hasn&apos;t published any trips yet.
              </p>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
