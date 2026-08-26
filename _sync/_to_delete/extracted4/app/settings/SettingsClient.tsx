"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth, verificationStatusLabel } from "@/lib/auth-context";

/**
 * Settings, per "GoTogether Settings Page.dc.html": Account / Notifications
 * / Privacy / Support groups, then a separate Log out / Delete account
 * card. No blueprint doc exists for this page (only the visual spec) — a
 * confirmation step is added for Delete account since none was specified,
 * matching how every other irreversible action site-wide requires one.
 */
export function SettingsClient() {
  const { user, isLoggedIn, requireAuth, requireVerification, logout } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(() => isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) return;
    requireAuth("view your settings", () => setAuthChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pushNotifications, setPushNotifications] = useState(true);
  const [tripReminders, setTripReminders] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!authChecked || !user) {
    return (
      <>
        <Header activePath="/" />
        <main className="flex-1 bg-surface" />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header activePath="/" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[700px] px-8 py-8 pb-20 max-[599px]:px-4">
          <h1 className="mb-6 font-display text-xl font-bold">Settings</h1>

          <SettingsGroup label="Account">
            <SettingsRow
              title="Phone number"
              subtitle="+91 98765 43210"
              action={<button className="text-[12px] font-semibold text-primary hover:underline">Change</button>}
            />
            <SettingsRow
              title="Verification status"
              action={
                <button
                  onClick={() => requireVerification(() => {})}
                  className="text-[12px] font-semibold text-primary hover:underline"
                >
                  {verificationStatusLabel(user.verificationStatus)} · View
                </button>
              }
            />
          </SettingsGroup>

          <SettingsGroup label="Notifications">
            <SettingsRow
              title="Push notifications"
              action={<Toggle checked={pushNotifications} onChange={setPushNotifications} label="Push notifications" />}
            />
            <SettingsRow
              title="Trip reminders"
              action={<Toggle checked={tripReminders} onChange={setTripReminders} label="Trip reminders" />}
            />
          </SettingsGroup>

          <SettingsGroup label="Privacy">
            <SettingsRow title="Profile visibility" subtitle="Your profile is visible to all GoTogether members" />
          </SettingsGroup>

          <SettingsGroup label="Support">
            <SettingsRow
              title="Help & Support"
              action={
                <Link href="/help" className="text-[12px] font-semibold text-primary hover:underline">
                  Open →
                </Link>
              }
            />
            <SettingsRow
              title="Trust & Safety"
              action={
                <Link href="/trust-safety" className="text-[12px] font-semibold text-primary hover:underline">
                  Open →
                </Link>
              }
            />
          </SettingsGroup>

          <div className="mt-8 overflow-hidden rounded-2xl border border-border">
            <SettingsRow
              title="Log out"
              action={
                <button
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="text-[12px] font-semibold text-text-secondary hover:text-primary"
                >
                  Log out
                </button>
              }
            />
            <SettingsRow
              title="Delete account"
              danger
              action={
                <button onClick={() => setConfirmDelete(true)} className="text-[12px] font-semibold text-danger hover:underline">
                  Delete
                </button>
              }
            />
          </div>
        </div>
      </main>
      <Footer />

      {confirmDelete && (
        <div className="fixed inset-0 z-[100]">
          <button
            aria-label="Close dialog"
            onClick={() => setConfirmDelete(false)}
            className="absolute inset-0 bg-[oklch(20%_0.01_255/0.45)]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-live="assertive"
            className="absolute inset-0 m-auto flex h-fit w-[92vw] max-w-[400px] flex-col rounded-[20px] bg-surface p-6 text-center shadow-[0_24px_60px_-12px_oklch(20%_0.02_255/0.35)]"
          >
            <h2 className="mb-2 font-display text-base font-bold">Delete your account?</h2>
            <p className="mb-5 text-[12.5px] leading-relaxed text-text-secondary">
              This permanently removes your profile, trips, and reviews. This can&apos;t be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-full px-4 py-2.5 text-[12.5px] font-semibold text-text-secondary hover:bg-surface-hover"
              >
                Keep account
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  logout();
                  router.push("/");
                }}
                className="rounded-full bg-danger px-5 py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-[11px] font-bold tracking-wide text-text-muted uppercase">{label}</div>
      <div className="overflow-hidden rounded-2xl border border-border">{children}</div>
    </div>
  );
}

function SettingsRow({
  title,
  subtitle,
  action,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b border-border-divider px-4 py-3.5 last:border-b-0 ${
        danger ? "bg-[oklch(97%_0.02_25)]" : ""
      }`}
    >
      <div>
        <div className={`text-[13px] font-semibold ${danger ? "text-danger" : ""}`}>{title}</div>
        {subtitle && <div className="text-[11px] text-text-muted">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-none rounded-full transition-colors ${checked ? "bg-primary" : "bg-[oklch(88%_0.01_255)]"}`}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}
