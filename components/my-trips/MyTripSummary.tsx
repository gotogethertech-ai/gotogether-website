import Image from "next/image";
import Link from "next/link";
import { StatusPill, type PillTone } from "./StatusPill";

type MyTripSummaryProps = {
  tripId: string;
  imgSrc: string;
  title: string;
  meta: string; // dates · countdown, or dates alone
  pill: { tone: PillTone; label: string };
  roleLabel?: string; // "You're going" / "You're hosting" — omitted when the tab already makes it obvious
  primaryAction: { label: string; href?: string; onClick?: () => void };
  secondaryInfo?: string; // e.g. "3 requests pending"
};

/**
 * MyTripSummary — a specialized wrapper around the public TripCard's visual
 * base, per the blueprint: "image thumbnail → status pill → title/dates →
 * role indicator → a single primary CTA specific to that state." Exactly
 * one primary action per card, never a second competing button.
 */
export function MyTripSummary({
  tripId,
  imgSrc,
  title,
  meta,
  pill,
  roleLabel,
  primaryAction,
  secondaryInfo,
}: MyTripSummaryProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative h-[120px] w-full bg-surface-hover">
        <Image src={imgSrc} alt="" fill sizes="(min-width: 900px) 33vw, 100vw" className="object-cover" />
      </div>
      <div className="p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          {roleLabel && (
            <span className="text-[9.5px] font-semibold text-text-muted">{roleLabel}</span>
          )}
        </div>
        <div className="mb-0.5 text-[10.5px] text-text-muted">{meta}</div>
        <Link href={`/trips/${tripId}`} className="mb-2 block text-[13.5px] font-bold text-text-primary line-clamp-2 hover:text-primary">
          {title}
        </Link>
        {secondaryInfo && (
          <div className="mb-2 text-[10.5px] font-semibold text-accent">{secondaryInfo}</div>
        )}
        {primaryAction.href ? (
          <Link
            href={primaryAction.href}
            className="block min-h-[38px] w-full rounded-full bg-primary px-3 py-2.5 text-center text-[11.5px] font-semibold text-white hover:opacity-90"
          >
            {primaryAction.label}
          </Link>
        ) : (
          <button
            onClick={primaryAction.onClick}
            className="block min-h-[38px] w-full rounded-full bg-primary px-3 py-2.5 text-center text-[11.5px] font-semibold text-white hover:opacity-90"
          >
            {primaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
