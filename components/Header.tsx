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
  /** Public Supabase Storage URL for the user's uploaded profile photo, or
   * null until they set one — every avatar surface falls back to the
   * initials circle when this is null. */
  avatarUrl: string | null;
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
  const isDestinationsActive = activePath === "/destinations";
  const isClicksActive = activePath === "/clicks";
  const isSavedTripsActive = activePath === "/saved-trips";

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-border-soft bg-surface transition-[height,box-shadow] duration-200 ${
          scrolled ? "shadow-[0_4px_16px_-8px_oklch(20%_0.02_255/0.18)]" : ""
        }`}
        style={{ height: scrolled ? "var(--header-height-compressed)" : "var(--header-height-desktop)" }}
      >
        <div className="mx-auto flex h-full max-w-(--content-max-width) items-center justify-between gap-2 px-4 sm:px-6 lg:px-10">
          {/* Left zone (<900px): hamburger sits to the left of the logo
              here — per feedback, everything was too cramped with the
              hamburger on the right alongside search/messages/avatar, so
              the row is now split hamburger+logo (left) / CTA+icons+avatar
              (right) instead of logo (left) / everything (right). Desktop
              (>=900px) keeps the logo alone on the left, nav uses the
              hamburger-less full nav instead. */}
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-lg text-text-secondary min-[900px]:hidden"
            >
              <HamburgerIcon />
            </button>
            <Link href="/" aria-label="GoTogether home" className="min-w-0 flex-none">
              <Logo wordmarkClassName="hidden min-[380px]:inline text-[17px] min-[900px]:text-[20px]" />
            </Link>
          </div>

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
            <NavLink href="/destinations" active={isDestinationsActive}>
              Destinations
            </NavLink>
            {/* Clicks nav item uses its own coral accent (Clicks color
                theme brief), not the site's primary-blue NavLink style —
                scoped to this one entry only. */}
            <Link
              href="/clicks"
              className={`rounded-full px-3 py-1 text-sm font-medium font-sans transition-colors ${
                isClicksActive
                  ? "bg-clicks-primary font-semibold text-white"
                  : "bg-clicks-background text-clicks-primary hover:bg-clicks-highlight/40"
              }`}
            >
              Clicks
            </Link>
            {user && (
              <>
                <NavLink href="/my-trips" active={isMyTripsActive}>
                  My Trips
                </NavLink>
                <NavLink href="/saved-trips" active={isSavedTripsActive}>
                  Saved Trips
                </NavLink>
              </>
            )}
          </nav>

          {/* Right zone */}
          <div className="flex flex-none items-center gap-4">
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
                  href="/notifications"
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

            {/* Tablet-portrait hybrid (<900px): Create CTA inline, profile
                avatar (or Login) at the far right — mirrors the desktop
                layout's avatar-on-the-right placement. Hamburger already
                moved to the left zone (next to the logo); the search icon
                was dropped from this row entirely since Explore search is
                already one tap away via the hamburger menu and this row
                was too cramped for it, pushing the avatar off-screen. */}
            <div className="flex items-center gap-2.5 min-[900px]:hidden">
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
              {user ? (
                <AvatarMenu user={user} />
              ) : (
                <button
                  onClick={handleLogin}
                  aria-label="Login"
                  className="text-[12.5px] font-semibold text-text-secondary hover:text-primary font-sans"
                >
                  Login
                </button>
              )}
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
