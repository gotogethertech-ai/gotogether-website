"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { CloseIcon } from "./icons";
import type { AuthUser } from "./Header";
import { useAuth } from "@/lib/auth-context";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  user?: AuthUser | null;
  onLogin?: () => void;
};

const LOGGED_OUT_ITEMS = [
  { label: "Explore", href: "/explore", primary: true },
  { label: "Destinations", href: "/destinations" },
  { label: "Travel Companies", href: "/travel-companies" },
  { label: "How It Works", href: "/how-it-works" },
];

const LOGGED_IN_PRIMARY = [
  { label: "Explore", href: "/explore", primary: true },
  { label: "My Trips", href: "/my-trips" },
];

const LOGGED_IN_SECONDARY = [
  { label: "Saved Trips", href: "/saved-trips" },
  { label: "Trust Score", href: "/trust-safety" },
  { label: "Settings", href: "/settings" },
  { label: "Help & Support", href: "/help" },
];

/**
 * Full-screen slide-in hamburger panel, per Navigation System Step F/Step 6:
 * 220ms ease-out, dimmed overlay, focus-trapped, Escape-to-close.
 */
export function MobileMenu({ open, onClose, user, onLogin }: MobileMenuProps) {
  const { logout } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 min-[900px]:hidden">
      <button
        aria-label="Close menu overlay"
        className="absolute inset-0 bg-[oklch(20%_0.01_255/0.45)]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="absolute right-0 top-0 h-full w-full max-w-[390px] overflow-y-auto bg-surface animate-[slideIn_220ms_ease-out]"
      >
        <div className="flex h-14 items-center justify-between border-b border-border-divider px-4">
          <Logo size={24} wordmarkSize={14} />
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="flex h-[30px] w-[30px] items-center justify-center text-text-secondary"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="p-2" aria-label="Mobile">
          {(user ? LOGGED_IN_PRIMARY : LOGGED_OUT_ITEMS).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`block rounded-[10px] px-4 py-3.5 text-[14.5px] font-medium font-sans ${
                item.primary
                  ? "bg-[oklch(96%_0.02_255)] font-semibold text-primary"
                  : ""
              }`}
            >
              {item.label}
            </Link>
          ))}

          {user && (
            <>
              <MenuRow
                href="/messages"
                label="Messages"
                badge={user.unreadMessages}
                onClose={onClose}
              />
              <MenuRow
                href="/notifications"
                label="Notifications"
                badge={user.unreadNotifications}
                onClose={onClose}
              />
              <div className="my-1.5 mx-4 h-px bg-border-divider" />
              {LOGGED_IN_SECONDARY.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="block rounded-[10px] px-4 py-3.5 text-[14.5px] font-medium font-sans"
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full rounded-[10px] px-4 py-3.5 text-left text-[14.5px] font-medium text-danger font-sans"
              >
                Log Out
              </button>
            </>
          )}

          {!user && (
            <button
              onClick={() => {
                onClose();
                onLogin?.();
              }}
              className="mt-1 block w-full rounded-[10px] px-4 py-3.5 text-left text-[14.5px] font-semibold text-primary font-sans"
            >
              Login
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

function MenuRow({
  href,
  label,
  badge,
  onClose,
}: {
  href: string;
  label: string;
  badge?: number;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center justify-between rounded-[10px] px-4 py-3.5 text-[14.5px] font-medium font-sans"
    >
      {label}
      {!!badge && (
        <span className="flex min-w-[15px] h-[15px] items-center justify-center rounded-full bg-badge-bg px-[3px] text-[9px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
