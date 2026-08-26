"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { NavLink, AccentButton } from "./ui/Button";
import { SearchIcon, MessageIcon, BellIcon, HamburgerIcon } from "./icons";
import { AvatarMenu } from "./AvatarMenu";
import { MobileMenu } from "./MobileMenu";
import { useAuth } from "@/lib/auth-context";

/**
 * Phone-OTP login (Auth Modal) only proves phone ownership — it does not
 * imply ID verification. Create Trip / Request to Join are gated on
 * "id_verified" separately (Authentication Blueprint §1.6, Onboarding
 * Blueprint's Progressive Completion). "id_pending" models a submitted-
 * but-not-yet-reviewed verification (not an instant transition).
 */
export type VerificationStatus =
  | "unverified"
  | "phone_verified"
  | "id_pending"
  | "id_verified";

/** "restricted"/"suspended" drive the Access Denied page and disabled
 * protected-action affordances (Navigation System §2.6). No moderation
 * backend exists yet, so this only ever reads "active" in the mock. */
export type AccountStatus = "active" | "restricted" | "suspended";

export type AuthUser = {
  name: string;
  initials: string;
  trustScore: number;
  unreadMessages: number;
  unreadNotifications: number;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
};

type HeaderProps = {
  /** Defaults to the real auth session (useAuth()) when omitted. Only pass
   * explicitly to preview a specific state (e.g. a design-review screenshot). */
  user?: AuthUser | null;
  activePath?: string;
  onCreateTrip?: () => void;
  onLogin?: () => void;
};

/**
 * Responsive header per "GoTogether Website Navigation System" (Concept C,
 * approved) and "Website Navigation UI" visual spec.
 *
 * Breakpoints implemented (Step 7):
 *  - >=1280px large desktop: full inline nav, max-width 1280px container
 *  - 1024-1279px laptop: container shrinks with viewport (fluid, no special case)
 *  - 900-1023px tablet landscape: same as desktop, tighter spacing
 *  - 600-899px tablet portrait: hybrid — search icon + CTA inline, rest in hamburger
 *  - <600px mobile: 56px header, hamburger, persistent Create Trip CTA bar
 */
export function Header({
  user: userOverride,
  activePath = "/",
  onCreateTrip,
  onLogin,
}: HeaderProps) {
  const auth = useAuth();
  const router = useRouter();
  const user = userOverride !== undefined ? userOverride : auth.user;
  const handleCreateTrip =
    onCreateTrip ??
    (() => auth.requireAuth("start planning your trip", () => router.push("/create-trip")));
  const handleLogin =
    onLogin ?? (() => auth.requireAuth("continue", () => {}));

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isExploreActive = activePath === "/explore";
  const isMyTripsActive = activePath === "/my-trips";

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-border-soft bg-surface transition-[height,box-shadow] duration-200 ${
          scrolled ? "shadow-[0_4px_16px_-8px_oklch(20%_0.02_255/0.18)]" : ""
        }`}
        style={{ height: scrolled ? "var(--header-height-compressed)" : "var(--header-height-desktop)" }}
      >
        <div className="mx-auto flex h-full max-w-(--content-max-width) items-center justify-between px-8 lg:px-10">
          {/* Logo — always visible */}
          <Link href="/" aria-label="GoTogether home">
            <Logo />
          </Link>

          {/* Desktop/laptop/tablet-landscape primary nav (>=900px) */}
          <nav
            className="hidden items-center gap-8 min-[900px]:flex"
            aria-label="Primary"
          >
            <span
              className={`flex items-center gap-1.5 pb-1 text-sm font-medium font-sans ${
                isExploreActive
                  ? "border-b-2 border-primary font-semibold text-primary"
                  : "text-text-secondary hover:text-primary"
              }`}
            >
              <SearchIcon />
              <Link href="/explore">Explore</Link>
            </span>
            {user && (
              <NavLink href="/my-trips" active={isMyTripsActive}>
                My Trips
              </NavLink>
            )}
          </nav>

          {/* Right zone */}
          <div className="flex items-center gap-4">
            {/* CTA: full label >=1024px, "Create" 900-1023px per laptop collapse rule */}
            <span className="hidden min-[900px]:inline-flex">
              <AccentButton onClick={handleCreateTrip}>
                <span className="hidden min-[1024px]:inline">Create Trip</span>
                <span className="inline min-[1024px]:hidden">Create</span>
              </AccentButton>
            </span>

            {user ? (
              <div className="hidden items-center gap-3.5 min-[900px]:flex">
                <IconButton
                  href="/messages"
                  label={`Messages${user.unreadMessages ? `, ${user.unreadMessages} unread` : ""}`}
                  badge={user.unreadMessages}
                >
                  <MessageIcon />
                </IconButton>
                <IconButton
                  label={`Notifications${user.unreadNotifications ? `, ${user.unreadNotifications} unread` : ""}`}
                  badge={user.unreadNotifications}
                >
                  <BellIcon />
                </IconButton>
                <AvatarMenu user={user} />
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="hidden text-sm font-semibold text-text-secondary hover:text-primary min-[900px]:inline-block font-sans"
              >
                Login
              </button>
            )}

            {/* Tablet-portrait hybrid (600-899px): search icon + Create CTA inline, hamburger for rest */}
            <div className="flex items-center gap-2.5 min-[900px]:hidden">
              <button
                aria-label="Search"
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-text-tertiary hover:bg-surface-hover"
              >
                <SearchIcon size={18} />
              </button>
              <span className="hidden min-[600px]:inline-flex">
                <AccentButton size="sm" onClick={handleCreateTrip}>
                  Create
                </AccentButton>
              </span>
              {user && (
                <>
                  <span className="sm:hidden">
                    <IconButton
                      href="/messages"
                      label={`Messages${user.unreadMessages ? `, ${user.unreadMessages} unread` : ""}`}
                      badge={user.unreadMessages}
                      compact
                    >
                      <MessageIcon size={16} />
                    </IconButton>
                  </span>
                  <span className="sm:hidden">
                    <IconButton
                      label={`Notifications${user.unreadNotifications ? `, ${user.unreadNotifications} unread` : ""}`}
                      badge={user.unreadNotifications}
                      compact
                    >
                      <BellIcon size={16} />
                    </IconButton>
                  </span>
                </>
              )}
              <button
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-lg text-text-secondary"
              >
                <HamburgerIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile persistent Create Trip CTA bar (<600px), on browsing pages */}
      <div className="border-b border-border-divider bg-surface-tint px-4 py-2.5 min-[600px]:hidden">
        <AccentButton className="w-full" size="md" onClick={handleCreateTrip}>
          + Create a Trip
        </AccentButton>
      </div>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        onLogin={handleLogin}
      />
    </>
  );
}

function IconButton({
  children,
  label,
  badge,
  compact = false,
  href,
}: {
  children: React.ReactNode;
  label: string;
  badge?: number;
  compact?: boolean;
  href?: string;
}) {
  const size = compact ? 32 : 38;
  const className = "relative flex items-center justify-center rounded-full text-[oklch(35%_0.01_255)] hover:bg-surface-hover";
  const style = { width: size, height: size };

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className} style={style}>
        {children}
        {!!badge && (
          <span
            className="absolute top-0.5 right-0.5 flex min-w-[15px] h-[15px] items-center justify-center rounded-full bg-badge-bg px-[3px] text-[9px] font-bold text-white"
            aria-hidden="true"
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
        <span className="sr-only" aria-live="polite">
          {badge ? label : ""}
        </span>
      </Link>
    );
  }

  return (
    <button
      aria-label={label}
      className={className}
      style={style}
    >
      {children}
      {!!badge && (
        <span
          className="absolute top-0.5 right-0.5 flex min-w-[15px] h-[15px] items-center justify-center rounded-full bg-badge-bg px-[3px] text-[9px] font-bold text-white"
          aria-hidden="true"
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {badge ? label : ""}
      </span>
    </button>
  );
}
