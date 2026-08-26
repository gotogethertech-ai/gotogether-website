"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { getPendingVerifications } from "@/lib/admin/data";

/**
 * Admin panel shell — persistent sidebar + top identity, per the design
 * file's screens and Developer Spec §14 ("desktop-first and explicitly
 * so"). No responsive collapse logic is built for <1024px since the spec
 * says triage-only screens should "say so plainly rather than degrading
 * silently" — that's handled per-page, not by faking a mobile layout here.
 */

const NAV_ITEMS: { href: string; label: string; icon: string }[] = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/users", label: "Users", icon: "◔" },
  { href: "/admin/verification", label: "Verification", icon: "✓" },
  { href: "/admin/trips", label: "Trips", icon: "◎" },
  { href: "/admin/companies", label: "Companies", icon: "▤" },
  { href: "/admin/destinations", label: "Destinations", icon: "◈" },
  { href: "/admin/testimonials", label: "Testimonials", icon: "❝" },
  { href: "/admin/audit-log", label: "Audit Log", icon: "▥" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [pendingVerificationCount, setPendingVerificationCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPendingVerifications().then((rows) => {
      if (!cancelled) setPendingVerificationCount(rows.length);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const badges: Partial<Record<string, number>> = {
    "/admin/verification": pendingVerificationCount ?? 0,
  };

  return (
    <div className="flex min-h-screen bg-[oklch(97%_0.003_255)] font-sans text-[oklch(20%_0.01_255)]">
      <aside className="flex w-[220px] flex-none flex-col border-r border-[oklch(90%_0.005_255)] bg-white">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2 text-[17px] font-bold">
            <Image src="/brand/gotogether-logo-512.png" alt="" width={22} height={22} className="flex-none" />
            GoTogether
          </div>
          <div className="mt-0.5 text-[10.5px] font-bold tracking-wide text-[oklch(55%_0.01_255)]">ADMIN</div>
        </div>

        <nav className="flex-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
            const badge = badges?.[item.href];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center justify-between rounded-lg px-3 py-2.5 text-[13.5px] font-medium ${
                  active ? "bg-[oklch(92%_0.05_255)] text-[oklch(35%_0.15_255)]" : "text-[oklch(35%_0.01_255)] hover:bg-[oklch(96%_0.003_255)]"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="w-4 text-center">
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                {!!badge && (
                  <span className="rounded-full bg-[oklch(58%_0.2_25)] px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[oklch(90%_0.005_255)] px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[oklch(90%_0.02_255)] text-[11px] font-bold text-[oklch(40%_0.1_255)]">
              {user?.initials ?? "—"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-bold">{user?.name ?? "—"}</div>
              <div className="text-[10.5px] capitalize text-[oklch(55%_0.01_255)]">{user?.role ?? ""}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-10 py-8">{children}</main>
    </div>
  );
}
