"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Homepage Trust Score section — Trust Score is GoTogether's core
 * differentiator, so it gets a dedicated, scrollable moment on the
 * homepage rather than being buried in a footer link. Three parts: what
 * it is, how it helps a traveller decide, and how it's actually
 * calculated.
 *
 * "use client" + IntersectionObserver: the section animates in the moment
 * it scrolls into view (ring fills, bars grow, cards lift on hover).
 *
 * The calculation copy is deliberately honest and matches
 * public.recompute_trust_score() exactly (see migration 003 /
 * 020_admin_profile_review_trust_overrides): a review-rating average
 * (weighted 70%), completed trips organized (weighted 30%, capped at 10),
 * minus organizer-cancelled trips (weighted 20%, capped at 5), clamped to
 * a 0–10 scale. It does NOT claim the 6 named sub-scores
 * (Behaviour/Punctuality/etc.) shown on profile pages — those are
 * UI-only display categories on mock profile data, not a real input to
 * the score, so repeating them here would overclaim.
 *
 * The score card's 9.2 / 14 trips / 24 reviews / 2.3 yrs are illustrative
 * example numbers for this marketing moment, not a real account's data —
 * same honesty stance as the rest of the homepage (see
 * getRealHomepageTrips's "no fabricated data" convention).
 */

const HOW_IT_HELPS = [
  {
    icon: <SearchGlassIcon />,
    tile: "bg-[oklch(94%_0.05_155)]",
    iconColor: "text-[oklch(45%_0.14_155)]",
    title: "Decide before you commit",
    body: "See a number, not a guess — every organizer and traveller's Trust Score is visible on their profile before you request to join or accept anyone into your trip.",
  },
  {
    icon: <PeopleIcon />,
    tile: "bg-[oklch(93%_0.05_300)]",
    iconColor: "text-[oklch(48%_0.16_300)]",
    title: "Built from real trips",
    body: "It's earned from actual completed trips and reviews left by real co-travellers — not a self-written bio or a follower count.",
  },
  {
    icon: <RefreshIcon />,
    tile: "bg-[oklch(93%_0.05_255)]",
    iconColor: "text-[oklch(48%_0.16_255)]",
    title: "Always current",
    body: "Your score updates automatically after every completed trip, so it reflects how you actually travel, not a one-time check.",
  },
];

const CALCULATION_FACTORS = [
  {
    weight: 70,
    label: "Review ratings",
    body: "Average rating from reviews by real co-travellers",
    tone: "positive" as const,
    icon: <StarIcon />,
  },
  {
    weight: 30,
    label: "Trips completed",
    body: "Trips you've organized or joined through to completion",
    tone: "positive" as const,
    icon: <BagIcon />,
  },
  {
    weight: 20,
    label: "Organizer cancellations",
    body: "Trips cancelled as the organizer",
    tone: "negative" as const,
    icon: <XIcon />,
  },
];

const FEATURE_PILLS = [
  { icon: <ShieldCheckIcon size={13} />, label: "Real trips" },
  { icon: <PeopleIcon size={13} />, label: "Real reviews" },
  { icon: <RefreshIcon size={13} />, label: "Always updated" },
];

const SCORE_VALUE = 9.2;
const SCORE_MAX = 10;
const EXAMPLE_STATS = [
  { icon: <BagIcon />, value: "14", label: "Trips completed" },
  { icon: <StarIcon />, value: "24", label: "Reviews received" },
  { icon: <CalendarIcon />, value: "2.3 yrs", label: "On GoTogether" },
];

export function TrustScoreSection() {
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
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="overflow-hidden bg-surface-alt">
      <div className="mx-auto max-w-(--section-max-width) px-8 py-16">
        <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          {/* LEFT — headline + dark hero score card */}
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-wide text-primary uppercase">
              The GoTogether difference
            </p>
            <h2 className="mb-4 font-display text-[28px] leading-tight font-bold tracking-tight">
              Know exactly who you&apos;re{" "}
              <span className="text-primary">travelling with</span>
            </h2>
            <p className="mb-5 max-w-[440px] text-[14.5px] leading-relaxed text-text-tertiary">
              Trust Score is the single number that sums up someone&apos;s real travel history on
              GoTogether — built from completed trips and honest reviews, not self-reported claims.
            </p>

            <div className="mb-6 flex flex-wrap gap-2">
              {FEATURE_PILLS.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11.5px] font-semibold text-text-secondary"
                >
                  <span className="text-primary">{p.icon}</span>
                  {p.label}
                </span>
              ))}
            </div>

            <ScoreHeroCard animate={inView} />

            <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-surface-tint px-4 py-3">
              <span className="flex-none text-primary">
                <ShieldCheckIcon size={17} />
              </span>
              <p className="text-[12px] text-text-secondary">
                Visible on every profile.{" "}
                <Link href="/trust-safety" className="font-semibold text-primary hover:underline">
                  Built for real safety.
                </Link>
              </p>
            </div>

            <Link
              href="/trust-safety"
              className="group mt-5 inline-flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-primary"
            >
              Read the full Trust &amp; Safety policy
              <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </Link>
          </div>

          {/* RIGHT — how it helps + how it's calculated */}
          <div className="flex flex-col gap-9">
            <div>
              <h3 className="mb-4 font-display text-base font-bold">How it helps you</h3>
              <div className="grid gap-5 sm:grid-cols-3">
                {HOW_IT_HELPS.map((item, i) => (
                  <div
                    key={item.title}
                    style={{ transitionDelay: inView ? `${i * 90}ms` : "0ms" }}
                    className={`group rounded-2xl bg-surface p-4.5 shadow-[0_1px_2px_oklch(20%_0.02_255/0.06)] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_12px_28px_-10px_oklch(20%_0.02_255/0.2)] ${
                      inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.tile} ${item.iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
                      style={{ width: 40, height: 40 }}
                    >
                      {item.icon}
                    </div>
                    <div className="mb-1 text-[13px] font-bold">{item.title}</div>
                    <p className="text-[12px] leading-relaxed text-text-tertiary">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5.5">
              <h3 className="mb-1 font-display text-base font-bold">How it&apos;s calculated</h3>
              <p className="mb-5 text-[12px] leading-relaxed text-text-tertiary">
                No mystery formula — every score is computed the same way, and updates as soon as a
                trip is completed.
              </p>
              <div className="flex flex-col gap-5">
                {CALCULATION_FACTORS.map((f, i) => (
                  <CalculationBar key={f.label} factor={f} animate={inView} delayMs={i * 120} />
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-border-divider pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-[11px] leading-relaxed text-text-muted">
                  <span className="mt-0.5 flex-none text-text-tertiary">
                    <ShieldCheckIcon size={14} />
                  </span>
                  Scores run from 0–10. A trust breakdown by review reviewer and trip is always
                  visible on every profile — nothing is hidden.
                </p>
                <Link
                  href="/trust-safety"
                  className="inline-flex flex-none items-center justify-center gap-1 rounded-full border border-border px-4 py-2 text-[12px] font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary"
                >
                  Learn more about Trust Score &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Dark hero score card — ring + count-up on scroll-into-view, an
 * "EXCELLENT" tier chip, a shield badge on the ring, and three example
 * stat pills below. Illustrative example data, not a real account's — see
 * file-level comment. */
function ScoreHeroCard({ animate }: { animate: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const fraction = animate ? SCORE_VALUE / SCORE_MAX : 0;
  const dashOffset = circumference * (1 - fraction);

  useEffect(() => {
    if (!animate) return;
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(eased * SCORE_VALUE);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  return (
    <div
      className="relative max-w-[440px] overflow-hidden rounded-[22px] p-6 shadow-[0_20px_48px_-16px_oklch(20%_0.02_255/0.35)]"
      style={{
        background:
          "radial-gradient(140% 100% at 0% 0%, oklch(32% 0.05 165) 0%, oklch(19% 0.03 195) 55%, oklch(15% 0.02 220) 100%)",
      }}
    >
      <div className="relative flex items-start gap-5">
        <div className="relative flex h-24 w-24 flex-none items-center justify-center" style={{ width: 96, height: 96 }}>
          <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
            <circle cx="48" cy="48" r={radius} fill="none" stroke="oklch(100% 0 0 / 0.12)" strokeWidth="7" />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="oklch(78% 0.19 150)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.33,1,0.68,1)" }}
            />
          </svg>
          <span className="absolute flex flex-col items-center font-display text-2xl font-bold text-white">
            {displayValue.toFixed(1)}
            <span className="text-[10px] font-semibold text-white/50">/10</span>
          </span>
          <span
            aria-hidden="true"
            className="absolute -bottom-1 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[oklch(70%_0.19_150)] text-white shadow-[0_2px_6px_oklch(0%_0_0/0.35)]"
            style={{ width: 24, height: 24 }}
          >
            <CheckIcon size={13} />
          </span>
        </div>

        <div className="pt-1">
          <span className="mb-2 inline-flex items-center rounded-full bg-[oklch(70%_0.19_150/0.18)] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[oklch(80%_0.19_150)] uppercase">
            Excellent
          </span>
          <div className="mb-1 font-display text-lg font-bold text-white">Trust Score</div>
          <div className="text-[12px] text-white/55">From completed trips &amp; real reviews</div>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        {EXAMPLE_STATS.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[oklch(70%_0.19_150/0.18)] text-[oklch(78%_0.19_150)]"
              style={{ width: 28, height: 28 }}
            >
              {s.icon}
            </span>
            <div>
              <div className="text-[13px] font-bold text-white">{s.value}</div>
              <div className="text-[9.5px] leading-tight text-white/50">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One calculation factor — icon, label, weight, and a fill bar that
 * animates from 0 to its weight on scroll-into-view. */
function CalculationBar({
  factor,
  animate,
  delayMs,
}: {
  factor: { weight: number; label: string; body: string; tone: "positive" | "negative"; icon: React.ReactNode };
  animate: boolean;
  delayMs: number;
}) {
  const isNegative = factor.tone === "negative";
  return (
    <div className="flex gap-3.5">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full ${
          isNegative ? "bg-[oklch(95%_0.04_25)] text-[oklch(50%_0.18_25)]" : "bg-trust-bg text-trust-fg"
        }`}
        style={{ width: 36, height: 36 }}
      >
        {factor.icon}
      </span>
      <div className="flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-3">
          <div className="text-[12.5px] font-bold">
            {factor.label}
            {isNegative && <span className="ml-1 font-normal text-text-muted">(reduces score)</span>}
          </div>
          <span
            className={`flex-none text-[13px] font-bold tabular-nums ${
              isNegative ? "text-[oklch(50%_0.18_25)]" : "text-trust-fg"
            }`}
          >
            {isNegative ? "−" : ""}
            {factor.weight}%
          </span>
        </div>
        <p className="mb-1.5 text-[11.5px] text-text-tertiary">{factor.body}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tint">
          <div
            className={`h-full rounded-full ${isNegative ? "bg-[oklch(65%_0.18_25)]" : "bg-trust-fg"}`}
            style={{
              width: animate ? `${factor.weight}%` : "0%",
              transition: `width 0.9s cubic-bezier(0.33,1,0.68,1) ${delayMs}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* --- Small inline icons, matching components/icons.tsx's stroke-path
   convention (24x24 viewBox, currentColor where sensible) — kept local
   since these are homepage-specific and not reused elsewhere yet. --- */

function iconProps(size: number) {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const, "aria-hidden": true as const };
}

function SearchGlassIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15.5 5.3a3.2 3.2 0 010 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 13.9c2.6.3 4.5 2.4 4.5 5.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path
        d="M4 12a8 8 0 0113.66-5.66M20 12a8 8 0 01-13.66 5.66"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M17.5 3.5v3.5H14M6.5 20.5V17H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)} fill="currentColor">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
    </svg>
  );
}

function BagIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="4" y="8" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldCheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg {...iconProps(size)} stroke="currentColor">
      <path d="M5 12.5l4.5 4.5L19 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
