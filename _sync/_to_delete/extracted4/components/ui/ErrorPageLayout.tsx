import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Shared full-page error/interstitial layout — 404 and Access Denied are
 * structurally identical (logo-only header, centered icon badge + heading
 * + body + two buttons), varying only icon, copy, and button destinations
 * per their design docs. Built once here rather than as two near-duplicate
 * pages.
 */
export function ErrorPageLayout({
  icon,
  iconTint = "bg-[oklch(93%_0.05_255)]",
  heading,
  body,
  primaryLabel,
  primaryHref,
  secondaryLabel = "Go to Homepage",
  secondaryHref = "/",
}: {
  icon: string;
  iconTint?: string;
  heading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-border-soft">
        <div className="mx-auto flex h-[72px] max-w-(--content-max-width) items-center px-8">
          <Link href="/" aria-label="GoTogether home">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div
          aria-hidden="true"
          className={`mb-5 flex h-18 w-18 items-center justify-center rounded-2xl text-3xl ${iconTint}`}
          style={{ width: 72, height: 72 }}
        >
          {icon}
        </div>
        <h1 className="mb-2.5 max-w-md font-display text-xl font-bold">{heading}</h1>
        <p className="mb-7 max-w-sm text-[13.5px] leading-relaxed text-text-tertiary">
          {body}
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={secondaryHref}
            className="rounded-full border border-border-input bg-surface px-6 py-3 text-sm font-semibold text-text-secondary hover:bg-surface-hover"
          >
            {secondaryLabel}
          </Link>
          <Link
            href={primaryHref}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            {primaryLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
