"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Homepage "Community vs Partner" section — GoTogether has two trip
 * types (trips.kind: 'community' | 'verified_partner', see migration
 * 029/030) and new visitors land here without knowing the difference or
 * which one fits them. This section explains both side by side and gives
 * a quick "choose this if…" checklist for each, so a visitor can decide
 * before they even open Explore or Create Trip.
 *
 * Visual/animation language matches TrustScoreSection.tsx: "use client" +
 * IntersectionObserver triggers a one-time staggered fade/slide-in the
 * moment the section scrolls into view, cards lift + icons nudge on
 * hover. Community uses the site's default primary/tile tokens; Partner
 * reuses the existing partner-bg/partner-fg/border-partner tokens already
 * used for Verified Partner trip cards elsewhere, so the two feel
 * visually distinct without inventing a new palette.
 */

type ChecklistItem = { icon: React.ReactNode; text: string };

const COMMUNITY_POINTS: ChecklistItem[] = [
  { icon: <WalletIcon />, text: "You're on a budget and want to split real costs with the group" },
  { icon: <SlidersIcon />, text: "You like flexibility — plans firm up together, in the trip chat" },
  { icon: <CompassIcon />, text: "You want to meet fellow travellers, not just book a seat" },
];

const PARTNER_POINTS: ChecklistItem[] = [
  { icon: <CalendarCheckIcon />, text: "You want a fixed departure date and a confirmed itinerary" },
  { icon: <TagIcon />, text: "You'd rather see the full price upfront, no group-cost guessing" },
  { icon: <BadgeIcon />, text: "You want the trip professionally run, start to finish" },
];

const COMMUNITY_FEATURES = ["Organized by a fellow traveller", "Estimated, shared costs", "Flexible plan"];
const PARTNER_FEATURES = ["Run by a verified travel company", "Fixed, upfront pricing", "Confirmed departure"];

export function TripTypesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="overflow-hidden bg-surface">
      <div className="mx-auto max-w-(--section-max-width) px-8 py-16">
        <div
          className={`mx-auto mb-11 max-w-[620px] text-center transition-all duration-700 ease-out ${
            inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <p className="mb-2 text-[11px] font-bold tracking-wide text-primary uppercase">
            Two ways to travel
          </p>
          <h2 className="mb-3 font-display text-[28px] leading-tight font-bold tracking-tight">
            Community trips or Partner trips —{" "}
            <span className="text-primary">which fits you?</span>
          </h2>
          <p className="text-[14.5px] leading-relaxed text-text-tertiary">
            Every trip on GoTogether is one of two kinds. Neither is &ldquo;better&rdquo; — they&apos;re
            built for different travellers. Here&apos;s the real difference.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TripTypeCard
            kind="community"
            eyebrow="Peer-organized"
            title="Community Trips"
            tagline="Planned by a fellow traveller, just like you"
            description="Anyone can host a Community trip. Costs are estimated and split within the group, and the plan comes together together — in the trip chat, as people join."
            features={COMMUNITY_FEATURES}
            points={COMMUNITY_POINTS}
            cta={{ href: "/explore", label: "Browse Community trips" }}
            inView={inView}
            delayMs={0}
          />
          <TripTypeCard
            kind="partner"
            eyebrow="Professionally run"
            title="Partner Trips"
            tagline="Run end-to-end by a verified travel company"
            description="Partner trips are published only by travel companies GoTogether has verified. Pricing, dates, and the itinerary are fixed and confirmed before you book."
            features={PARTNER_FEATURES}
            points={PARTNER_POINTS}
            cta={{ href: "/travel-companies", label: "Browse Partner trips" }}
            inView={inView}
            delayMs={110}
          />
        </div>

        <div
          className={`mt-8 flex flex-col items-center gap-2 text-center transition-all delay-300 duration-700 ease-out sm:flex-row sm:justify-center sm:gap-3 ${
            inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <p className="text-[12.5px] text-text-tertiary">
            Not sure yet? Every trip card on GoTogether is labelled Community or Partner, so you always
            know which one you&apos;re looking at.
          </p>
          <Link
            href="/how-it-works"
            className="inline-flex flex-none items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
          >
            How it works &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

function TripTypeCard({
  kind,
  eyebrow,
  title,
  tagline,
  description,
  features,
  points,
  cta,
  inView,
  delayMs,
}: {
  kind: "community" | "partner";
  eyebrow: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  points: ChecklistItem[];
  cta: { href: string; label: string };
  inView: boolean;
  delayMs: number;
}) {
  const isPartner = kind === "partner";

  return (
    <div
      style={{ transitionDelay: inView ? `${delayMs}ms` : "0ms" }}
      className={`group relative flex flex-col overflow-hidden rounded-[22px] border p-6 transition-all duration-600 ease-out hover:-translate-y-1.5 sm:p-7 ${
        isPartner
          ? "border-border-partner bg-surface shadow-[0_1px_2px_oklch(20%_0.02_255/0.06)] hover:shadow-[0_20px_44px_-16px_oklch(60%_0.14_45/0.35)]"
          : "border-border bg-surface shadow-[0_1px_2px_oklch(20%_0.02_255/0.06)] hover:shadow-[0_20px_44px_-16px_oklch(50%_0.16_255/0.3)]"
      } ${inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
    >
      {/* Ambient corner glow, revealed on hover — subtle, kind-tinted */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${
          isPartner ? "bg-[oklch(80%_0.1_45)]" : "bg-[oklch(78%_0.1_255)]"
        }`}
      />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
              isPartner ? "bg-partner-bg text-partner-fg" : "bg-[oklch(94%_0.05_255)] text-primary"
            }`}
          >
            {isPartner && <ShieldIcon size={11} />}
            {eyebrow}
          </span>
          <span
            className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${
              isPartner ? "bg-partner-bg text-partner-fg" : "bg-[oklch(94%_0.05_255)] text-primary"
            }`}
            aria-hidden="true"
          >
            {isPartner ? <BriefcaseIcon /> : <UsersIcon />}
          </span>
        </div>

        <h3 className="mb-1 font-display text-xl font-bold">{title}</h3>
        <p className={`mb-3 text-[12.5px] font-semibold ${isPartner ? "text-partner-fg" : "text-primary"}`}>
          {tagline}
        </p>
        <p className="mb-5 text-[13px] leading-relaxed text-text-tertiary">{description}</p>

        <div className="mb-5 flex flex-wrap gap-1.5">
          {features.map((f) => (
            <span
              key={f}
              className="inline-flex items-center rounded-full border border-border-divider bg-surface-tint px-2.5 py-1 text-[10.5px] font-semibold text-text-secondary"
            >
              {f}
            </span>
          ))}
        </div>

        <div
          className={`mb-5 rounded-2xl p-4.5 ${isPartner ? "bg-[oklch(97%_0.02_45)]" : "bg-surface-tint"}`}
        >
          <div className="mb-3 text-[11px] font-bold tracking-wide text-text-muted uppercase">
            Choose this if&hellip;
          </div>
          <div className="flex flex-col gap-3">
            {points.map((p) => (
              <div key={p.text} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full ${
                    isPartner ? "bg-partner-bg text-partner-fg" : "bg-trust-bg text-trust-fg"
                  }`}
                  aria-hidden="true"
                  style={{ width: 24, height: 24 }}
                >
                  {p.icon}
                </span>
                <p className="text-[12.5px] leading-snug text-text-secondary">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

        <Link
          href={cta.href}
          className={`group/cta mt-auto inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-colors ${
            isPartner
              ? "bg-[oklch(38%_0.12_45)] text-white hover:opacity-90"
              : "bg-primary text-white hover:opacity-90"
          }`}
        >
          {cta.label}
          <span className="transition-transform group-hover/cta:translate-x-0.5">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}

/* --- Small inline icons, matching TrustScoreSection.tsx's local-icon
   convention (24x24 viewBox stroke paths). --- */

function iconProps(size: number) {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const, "aria-hidden": true as const };
}

function UsersIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15.5 5.3a3.2 3.2 0 010 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 13.9c2.6.3 4.5 2.4 4.5 5.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BriefcaseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="3.5" y="7.5" width="17" height="11.5" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8.5 7.5V6a2.5 2.5 0 012.5-2.5h2A2.5 2.5 0 0115.5 6v1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3.5 12.5h17" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ShieldIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...iconProps(size)} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l7 3v6c0 5-3 8-7 9.5-4-1.5-7-4.5-7-9.5v-6z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg {...iconProps(14)} strokeWidth="2">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
      <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg {...iconProps(14)}>
      <path d="M4 6h9M17 6h3M4 12h3M9 12h11M4 18h13M21 18h-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12.5" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg {...iconProps(14)}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M15 9l-2 6-4-1.5 2-6z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg {...iconProps(14)}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 14.5l2 2 4-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg {...iconProps(14)}>
      <path d="M11.5 3.5H6A2.5 2.5 0 003.5 6v5.5a2 2 0 00.6 1.4l8 8a2 2 0 002.8 0l6.1-6.1a2 2 0 000-2.8l-8-8a2 2 0 00-1.5-.6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg {...iconProps(14)}>
      <circle cx="12" cy="9" r="5.5" stroke="currentColor" strokeWidth="2" />
      <path d="M9 13.5L7 21l5-2.5 5 2.5-2-7.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.5 9l1.7 1.7L14.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
