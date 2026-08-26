"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AuthUser } from "./Header";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "./Avatar";

const MENU_ITEMS = [
  { label: "View Profile", href: "/profile" },
  { label: "My Trips", href: "/my-trips" },
  { label: "Saved Trips", href: "/saved-trips" },
  { label: "Trust Score", href: "/trust-safety" },
  { label: "Verification Status", href: "/settings#verification" },
  { label: "Settings", href: "/settings" },
  { label: "Help & Support", href: "/help" },
];

/**
 * Avatar dropdown, per Navigation UI "Desktop · Avatar Menu Open" spec:
 * name + Trust Score header, menu items, divider, Log Out in danger color.
 */
export function AvatarMenu({ user }: { user: AuthUser }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        className="flex h-9 w-9 items-center justify-center rounded-full font-sans cursor-pointer"
      >
        <Avatar avatarUrl={user.avatarUrl} initials={user.initials} size={36} className="text-[13px] font-semibold" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-[220px] rounded-2xl border border-border bg-surface p-2 shadow-[0_12px_32px_-8px_oklch(20%_0.02_255/0.18)]"
        >
          <div className="mb-1 border-b border-border-divider px-3 py-2.5">
            <div className="text-[13px] font-semibold font-sans">{user.name}</div>
            <div className="text-[10.5px] text-trust-fg">
              ⭐ {user.trustScore.toFixed(1)} Trust Score
            </div>
          </div>
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-[12.5px] hover:bg-surface-hover"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-border-divider" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-[12.5px] text-danger hover:bg-surface-hover"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
