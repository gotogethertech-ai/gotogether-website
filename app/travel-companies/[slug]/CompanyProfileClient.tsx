"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VerifiedBadge } from "@/components/companies/VerifiedBadge";
import { ExploreTripCard } from "@/components/ui/ExploreTripCard";
import { formatRatingWithBasis, formatTripsRun, getRealCompanyTrips, type RealCompany } from "@/lib/real-companies";
import type { ExploreTrip } from "@/lib/mock-data";

const VISIBLE_CAP = 6;

/**
 * Company Profile, per the blueprint's Step 5: header (logo, name, badge
 * with tooltip, trust row, "Verified since") → Support contact → Company
 * Trips (reused ExploreTripCard, 6-visible cap, no Create Trip CTA on
 * empty — a visitor can't create a trip on a company's behalf).
 *
 * No "About"/cancellation-policy section — the real public.companies
 * table has no description or cancellation-policy column (see
 * lib/real-companies.ts's file comment), so this doesn't fabricate copy
 * that isn't backed by real data.
 */
export function CompanyProfileClient({ company }: { company: RealCompany }) {
  const [trips, setTrips] = useState<ExploreTrip[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRealCompanyTrips(company.id).then((rows) => {
      if (!cancelled) setTrips(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [company.id]);

  const visibleTrips = (trips ?? []).slice(0, VISIBLE_CAP);
  const hasMore = (trips ?? []).length > VISIBLE_CAP;

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
              {company.supportEmail && (
                <p className="text-[12.5px] text-text-secondary">
                  <strong>Support:</strong> {company.supportEmail}
                </p>
              )}
            </div>
          </div>

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

            {trips === null ? (
              <div className="grid grid-cols-1 gap-4.5 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[220px] animate-pulse rounded-2xl bg-surface-tint" />
                ))}
              </div>
            ) : visibleTrips.length > 0 ? (
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
