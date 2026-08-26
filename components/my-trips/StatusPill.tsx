/**
 * Consistent status pill vocabulary reused across every My Trips state, per
 * the MyTripSummary spec: "never color-only." Every pill pairs an icon-ish
 * dot with text.
 */
export type PillTone = "confirmed" | "pending" | "waitlist" | "rejected" | "cancelled" | "completed" | "draft" | "progress";

const TONE_STYLES: Record<PillTone, string> = {
  confirmed: "bg-[oklch(93%_0.03_185)] text-[oklch(35%_0.08_185)]",
  pending: "bg-[oklch(94%_0.04_255)] text-[oklch(40%_0.14_255)]",
  waitlist: "bg-[oklch(96%_0.04_60)] text-[oklch(42%_0.12_60)]",
  rejected: "bg-[oklch(95%_0.03_25)] text-danger",
  cancelled: "bg-[oklch(95%_0.03_25)] text-danger",
  completed: "bg-[oklch(94%_0.002_255)] text-text-tertiary",
  draft: "bg-[oklch(96%_0.05_60)] text-[oklch(42%_0.12_60)]",
  progress: "bg-[oklch(60%_0.18_145/0.9)] text-white",
};

export function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9.5px] font-bold whitespace-nowrap ${TONE_STYLES[tone]}`}>
      ● {children}
    </span>
  );
}
