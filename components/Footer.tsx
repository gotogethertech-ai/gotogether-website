import Link from "next/link";
import { Logo } from "./Logo";

const FOOTER_GROUPS: {
  heading: string;
  ariaLabel: string;
  links: { label: string; href: string }[];
}[] = [
  {
    heading: "Discover",
    ariaLabel: "Discover",
    links: [
      { label: "Explore Trips", href: "/explore" },
      { label: "Clicks", href: "/clicks" },
      { label: "Destinations", href: "/destinations" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Travel Companies", href: "/travel-companies" },
    ],
  },
  {
    heading: "Trust & Safety",
    ariaLabel: "Trust and Safety",
    links: [
      { label: "Verification", href: "/trust-safety#verification" },
      { label: "Trust Score", href: "/trust-safety#trust-score" },
      { label: "Community Guidelines", href: "/trust-safety#guidelines" },
      { label: "Report a Concern", href: "/trust-safety#report" },
    ],
  },
  {
    heading: "Company",
    ariaLabel: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Support", href: "/help" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
    ],
  },
];

/**
 * Site footer — houses everything intentionally excluded from the header
 * (Navigation Blueprint Step 3): How It Works, Destinations, Travel
 * Companies, About, Trust & Safety, Support, Legal.
 */
export function Footer() {
  return (
    <footer className="border-t border-border-soft bg-surface-tint">
      <div className="mx-auto grid max-w-(--section-max-width) gap-8 px-8 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo size={32} wordmarkSize={18} className="mb-2.5" />
          <p className="max-w-[220px] text-xs leading-relaxed text-text-muted">
            A trust-first community for finding real travel companions.
            Currently available for trips starting from Delhi NCR.
          </p>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav key={group.heading} aria-label={group.ariaLabel}>
            <div className="mb-2.5 text-[11px] font-bold tracking-wide text-text-muted uppercase">
              {group.heading}
            </div>
            <div className="flex flex-col gap-2 text-[12.5px]">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-text-secondary hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        ))}
      </div>
      <div className="border-t border-border-soft px-8 py-4 text-center text-[11px] text-text-faint">
        &copy; {new Date().getFullYear()} GoTogether. All rights reserved.
      </div>
    </footer>
  );
}
