"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shared admin panel primitives — status pills, confirmation dialogs,
 * table states — built to the Developer Spec's §13 (states) and §15
 * (accessibility) requirements: real <table> semantics elsewhere (not
 * here), color+text pills, focus-trapping modal dialogs that return
 * focus, aria-describedby on destructive actions, aria-live announcement
 * of async results.
 */

const PILL_STYLES: Record<string, string> = {
  active: "bg-[oklch(93%_0.05_150)] text-[oklch(35%_0.12_150)]",
  restricted: "bg-[oklch(95%_0.05_60)] text-[oklch(42%_0.12_60)]",
  suspended: "bg-[oklch(95%_0.04_25)] text-[oklch(45%_0.16_25)]",
  id_verified: "bg-[oklch(93%_0.05_150)] text-[oklch(35%_0.12_150)]",
  phone_verified: "bg-[oklch(94%_0.02_255)] text-[oklch(45%_0.08_255)]",
  unverified: "bg-[oklch(93%_0.005_255)] text-[oklch(45%_0.005_255)]",
  pending: "bg-[oklch(95%_0.05_60)] text-[oklch(42%_0.12_60)]",
  approved: "bg-[oklch(93%_0.05_150)] text-[oklch(35%_0.12_150)]",
  rejected: "bg-[oklch(95%_0.04_25)] text-[oklch(45%_0.16_25)]",
  live: "bg-[oklch(93%_0.05_150)] text-[oklch(35%_0.12_150)]",
  in_progress: "bg-[oklch(94%_0.05_230)] text-[oklch(42%_0.12_230)]",
  draft: "bg-[oklch(93%_0.005_255)] text-[oklch(45%_0.005_255)]",
  hidden: "bg-[oklch(95%_0.05_60)] text-[oklch(42%_0.12_60)]",
  completed: "bg-[oklch(93%_0.005_255)] text-[oklch(45%_0.005_255)]",
  cancelled: "bg-[oklch(95%_0.04_25)] text-[oklch(45%_0.16_25)]",
  full: "bg-[oklch(93%_0.05_150)] text-[oklch(35%_0.12_150)]",
  under_review: "bg-[oklch(95%_0.05_60)] text-[oklch(42%_0.12_60)]",
  verified: "bg-[oklch(93%_0.05_150)] text-[oklch(35%_0.12_150)]",
  published: "bg-[oklch(93%_0.05_150)] text-[oklch(35%_0.12_150)]",
  removed: "bg-[oklch(95%_0.04_25)] text-[oklch(45%_0.16_25)]",
};

export function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  const style = PILL_STYLES[tone] ?? "bg-[oklch(93%_0.005_255)] text-[oklch(45%_0.005_255)]";
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${style}`}>{children}</span>;
}

export function StatCard({ value, label, tone }: { value: string | number; label: string; tone?: "default" | "warn" | "danger" }) {
  const border = tone === "warn" ? "border-[oklch(80%_0.1_60)]" : tone === "danger" ? "border-[oklch(75%_0.1_25)]" : "border-[oklch(90%_0.005_255)]";
  const valueColor = tone === "warn" ? "text-[oklch(50%_0.15_60)]" : tone === "danger" ? "text-[oklch(50%_0.18_25)]" : "text-[oklch(20%_0.01_255)]";
  return (
    <div className={`flex-1 rounded-2xl border bg-white px-5 py-4 ${border}`}>
      <div className={`text-[26px] font-bold ${valueColor}`}>{value}</div>
      <div className="text-[12.5px] text-[oklch(50%_0.01_255)]">{label}</div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-[oklch(93%_0.003_255)] px-4 py-3.5">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3.5 flex-1 rounded bg-[oklch(93%_0.003_255)]" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[oklch(88%_0.005_255)] px-6 py-16 text-center">
      <p className="text-[13.5px] font-semibold text-[oklch(35%_0.01_255)]">{title}</p>
      {hint && <p className="max-w-[380px] text-[12px] text-[oklch(55%_0.01_255)]">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[oklch(88%_0.02_25)] bg-[oklch(98%_0.01_25)] px-6 py-10 text-center">
      <p className="text-[12.5px] text-[oklch(45%_0.14_25)]">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-full border border-[oklch(80%_0.02_25)] px-4 py-2 text-[12px] font-semibold text-[oklch(40%_0.12_25)] hover:bg-white"
      >
        Retry
      </button>
    </div>
  );
}

export function AdminButton({
  children,
  onClick,
  variant = "default",
  disabled,
  loading,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
}) {
  const styles: Record<string, string> = {
    default: "border border-[oklch(85%_0.005_255)] bg-white text-[oklch(30%_0.01_255)] hover:bg-[oklch(97%_0.003_255)]",
    primary: "bg-[oklch(52%_0.18_255)] text-white hover:opacity-90",
    danger: "border border-[oklch(80%_0.05_25)] text-[oklch(45%_0.16_25)] hover:bg-[oklch(98%_0.02_25)]",
    ghost: "text-[oklch(45%_0.01_255)] hover:bg-[oklch(96%_0.003_255)]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-opacity disabled:opacity-50 ${styles[variant]}`}
    >
      {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}

/**
 * Destructive-confirmation dialog per §13/§15: names the consequence,
 * requires a reason before the confirm button enables, traps focus,
 * closes on Escape, returns focus to the trigger.
 */
export function ConfirmDialog({
  open,
  title,
  consequence,
  requireReason = true,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  consequence: string;
  requireReason?: boolean;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      triggerFocusRef.current = document.activeElement as HTMLElement;
      Promise.resolve().then(() => {
        setReason("");
        setSubmitting(false);
        const first = dialogRef.current?.querySelector<HTMLElement>("textarea, button");
        first?.focus();
      });
    } else {
      triggerFocusRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button, textarea, input");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const canConfirm = !requireReason || reason.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-consequence"
        className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="confirm-dialog-title" className="mb-2 text-[16px] font-bold">
          {title}
        </h2>
        <p id="confirm-dialog-consequence" className="mb-4 text-[13px] text-[oklch(45%_0.01_255)]">
          {consequence}
        </p>
        {requireReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required, max 500 characters)"
            maxLength={500}
            rows={3}
            className="mb-4 w-full resize-none rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[12.5px] outline-none focus:border-[oklch(52%_0.18_255)]"
          />
        )}
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton
            variant={danger ? "danger" : "primary"}
            disabled={!canConfirm}
            loading={submitting}
            onClick={() => {
              setSubmitting(true);
              onConfirm(reason.trim());
            }}
          >
            {confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

/** aria-live region for async action results (approve succeeded, action
 * failed) per §15. Render once near the page root and call announce(). */
export function useLiveAnnouncer() {
  const [message, setMessage] = useState("");
  const announce = (msg: string) => setMessage(msg);
  const region = (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
  return { announce, region };
}
