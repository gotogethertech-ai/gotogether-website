"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isAdminRole } from "@/lib/admin/guard";

/**
 * Route guard for every /admin/* page — per Developer Spec §1: "requiring
 * role IN ('moderator','admin')". This is the UI gate only; every RPC the
 * panel calls re-checks is_staff()/role server-side, so a signed-in but
 * unauthorized user can't reach real data even by calling the RPCs
 * directly — this component's job is just to keep them out of the UI.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, loading, requireAuth } = useAuth();
  const [authPrompted, setAuthPrompted] = useState(false);

  useEffect(() => {
    if (loading || isLoggedIn || authPrompted) return;
    Promise.resolve().then(() => {
      setAuthPrompted(true);
      requireAuth("access the admin panel", () => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isLoggedIn, authPrompted]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[oklch(97%_0.003_255)]" />;
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[oklch(97%_0.003_255)] px-6 text-center">
        <p className="text-[14px] font-semibold text-[oklch(30%_0.01_255)]">Sign in required</p>
        <p className="max-w-[360px] text-[12.5px] text-[oklch(50%_0.01_255)]">
          The admin panel requires a staff account. Sign in to continue.
        </p>
      </div>
    );
  }

  if (!isAdminRole(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[oklch(97%_0.003_255)] px-6 text-center">
        <p className="text-[14px] font-semibold text-[oklch(30%_0.01_255)]">Not authorized</p>
        <p className="max-w-[360px] text-[12.5px] text-[oklch(50%_0.01_255)]">
          This area is restricted to GoTogether staff. Your account doesn&apos;t have moderator or admin access.
        </p>
        <Link href="/" className="mt-2 text-[12.5px] font-semibold text-[oklch(45%_0.14_255)] hover:underline">
          Return to GoTogether →
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
