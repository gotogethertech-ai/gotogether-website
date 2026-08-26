"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchIcon } from "@/components/icons";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { getRealCompanies, searchRealCompanies, type RealCompany } from "@/lib/real-companies";

/**
 * Travel Companies Discovery — Concept C from the approved blueprint:
 * heading + one-line explanation → name search → uniform Company Card
 * grid (no featured tier, no promotional variation). Search term is
 * URL-persisted, consistent with every other search surface site-wide.
 *
 * Real data: every company here is a real public.companies row with
 * status = 'verified' — either self-registered by a user from their
 * profile and later approved by an admin, or created directly by an
 * admin. See lib/real-companies.ts.
 */
export function TravelCompaniesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [companies, setCompanies] = useState<RealCompany[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRealCompanies().then((rows) => {
      if (!cancelled) setCompanies(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => searchRealCompanies(companies ?? [], query), [companies, query]);

  function syncUrl(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("q", next);
    else params.delete("q");
    router.replace(`/travel-companies${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  return (
    <>
      <Header activePath="/travel-companies" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-(--content-max-width) px-8 py-9 pb-20 max-[599px]:px-4">
          <h1 className="mb-1.5 font-display text-[28px] font-bold">Verified Travel Companies</h1>
          <p className="mb-7 max-w-[560px] text-[13px] text-text-tertiary">
            Trips organized by businesses GoTogether has verified for identity and registration.
          </p>

          <div className="mb-8 flex max-w-[320px] items-center gap-2 rounded-full border border-border-input bg-surface-tint px-4.5 py-2.5">
            <SearchIcon size={15} className="flex-none text-text-muted" />
            <label htmlFor="company-search" className="sr-only">
              Search companies
            </label>
            <input
              id="company-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                syncUrl(e.target.value);
              }}
              placeholder="Search companies"
              className="flex-1 border-none bg-transparent text-[12.5px] outline-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  syncUrl("");
                }}
                className="text-text-muted hover:text-text-secondary"
              >
                ×
              </button>
            )}
          </div>

          {companies === null ? (
            <div
              className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4"
              aria-hidden="true"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[140px] animate-pulse rounded-2xl bg-surface-tint" />
              ))}
            </div>
          ) : companies.length === 0 ? (
            <p className="py-16 text-center text-[13.5px] text-text-tertiary">
              Verified travel companies will appear here as they join GoTogether.
            </p>
          ) : results.length === 0 ? (
            <p className="py-16 text-center text-[13.5px] text-text-tertiary">
              No companies match &ldquo;{query}&rdquo;.{" "}
              <button
                onClick={() => {
                  setQuery("");
                  syncUrl("");
                }}
                className="font-semibold text-primary hover:underline"
              >
                View all companies
              </button>
            </p>
          ) : (
            <div
              className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4"
              aria-live="polite"
            >
              {results.map((c) => (
                <CompanyCard key={c.id} company={c} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
