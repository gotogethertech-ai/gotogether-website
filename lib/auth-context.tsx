"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, VerificationStatus } from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { getUnreadNotificationCount } from "@/lib/real-notifications";

/**
 * Client-side auth state + the "protected action" trigger mechanism, per
 * the Authentication Blueprint's approved direction: unauthenticated
 * browsing everywhere, an auth prompt appears only at the point of a
 * protected action (Create Trip / Request to Join / Save / Message).
 *
 * Auth method: Google OAuth only (product decision — phone OTP was
 * dropped to avoid standing up an SMS provider for the testing phase;
 * the DB schema still supports phone, so it can be re-added later without
 * a migration). Google sign-in produces a real Supabase session; this
 * context mirrors that session into a public.users row (auto-provisioned
 * by a DB trigger on first sign-in — see migrations 001/009) plus
 * trust_scores, shaped into the AuthUser type the rest of the app expects.
 *
 * Testing-phase verification (per product decision): a successful Google
 * sign-in is treated as sufficient to unlock Create Trip / Request to
 * Join (verification_status is set to phone_verified by the DB trigger
 * for any session with an identity, phone or OAuth). id_verified exists
 * in the schema but nothing writes to it yet.
 *
 * Known limitation: Google's OAuth flow is a full-page redirect away from
 * and back to the site, so the in-memory "resume this exact closure"
 * mechanism (pendingSuccessRef) does not survive it — the whole page
 * unloads and reloads. signInWithGoogle sends the user back to the same
 * page they started on (via the `next` param), but does not re-invoke the
 * specific action (e.g. re-open Create Trip) that triggered the prompt;
 * the user needs one more click after landing back, same as most
 * real-world "sign in with Google" flows.
 */

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type ProtectedActionLabel = string;

/** AuthUser plus the real Supabase id — kept separate from the shared
 * AuthUser type (Header.tsx et al.) since most call sites don't need it;
 * the profile pages do, to look up/link to the real user row. `role`
 * (member/moderator/admin) is here rather than on AuthUser for the same
 * reason — only the admin panel's route guard needs it. */
export type SessionUser = AuthUser & {
  id: string;
  role: "member" | "moderator" | "admin";
  /** ISO date string (YYYY-MM-DD), or null until the user fills in their
   * profile. Minimum-age (18+) enforcement reads this. */
  dateOfBirth: string | null;
  /** Free-form per the users table (`male`/`female`/etc.), or null until
   * set. Trip gender-preference matching reads this. */
  gender: string | null;
};

type AuthContextValue = {
  user: SessionUser | null;
  isLoggedIn: boolean;
  /** True until the initial session check resolves — pages that gate on
   * isLoggedIn should wait for this before deciding to show a logged-out
   * state, or a real session will briefly flash as logged-out on load. */
  loading: boolean;
  logout: () => void;
  /** Triggers Google sign-in directly if logged out (no modal — a single
   * OAuth provider doesn't need one), then calls onSuccess immediately if
   * already logged in. Since Google's redirect can't resume onSuccess
   * itself (see this file's top comment), onSuccess only fires on the
   * already-logged-in path; a fresh sign-in just lands the user back on
   * the same page. */
  requireAuth: (label: ProtectedActionLabel, onSuccess: () => void) => void;
  requireVerification: (onSuccess: () => void) => void;
  /** GoTogether requires DOB + gender on file (and 18+) before a user can
   * create or join a trip. Unlike requireAuth/requireVerification this
   * can't resume in-place — it navigates to Edit Profile, which is a full
   * page — so onSuccess only fires when the profile is already complete. */
  requireCompleteProfile: (onSuccess: () => void) => void;
  /** True while a Google redirect is in flight, for callers that want to
   * show a loading state on the button/control that triggered it. */
  signingIn: boolean;
  verificationModal: {
    open: boolean;
  };
  verificationActions: {
    close: () => void;
    startVerification: () => Promise<void>;
  };
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(row: UserRow, trustScore: number, unreadMessages: number, unreadNotifications: number): SessionUser {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials ?? initialsFrom(row.name),
    avatarUrl: row.avatar_url,
    trustScore,
    unreadMessages,
    unreadNotifications,
    verificationStatus: row.verification_status,
    accountStatus: row.account_status,
    role: row.role,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
  };
}

/** Minimum age to use GoTogether at all — must match the DB's
 * trips_min_age_at_least_18 constraint (migration 026) so client-side
 * validation and the database agree. */
export const MINIMUM_AGE = 18;

export function ageFromDateOfBirth(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function hasCompleteProfile(user: SessionUser | null): boolean {
  if (!user) return false;
  if (!user.dateOfBirth || !user.gender) return false;
  return ageFromDateOfBirth(user.dateOfBirth) >= MINIMUM_AGE;
}

/**
 * Does a trip's gender/age preference admit this viewer? Used to power the
 * Explore "Matches me" filter — personalized (per the confirmed product
 * decision) rather than a raw unpersonalized chip: the viewer's own age
 * and gender decide what counts as a match, not a chip they pick values
 * for. Mixed trips always match on gender; a trip with no age range set
 * (min/max both null) always matches on age.
 */
export function tripMatchesViewer(
  trip: { minAge?: number | null; maxAge?: number | null; genderRestriction?: "any" | "women_only" | "men_only" },
  viewer: SessionUser
): boolean {
  if (viewer.dateOfBirth) {
    const age = ageFromDateOfBirth(viewer.dateOfBirth);
    if (trip.minAge != null && age < trip.minAge) return false;
    if (trip.maxAge != null && age > trip.maxAge) return false;
  }
  const restriction = trip.genderRestriction ?? "any";
  if (restriction === "any") return true;
  if (restriction === "women_only") return viewer.gender === "female";
  if (restriction === "men_only") return viewer.gender === "male";
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const pendingVerificationSuccessRef = useRef<(() => void) | null>(null);

  // Fetch the public.users + trust_scores rows for a signed-in session,
  // shaped into AuthUser.
  const loadProfile = useCallback(
    async (authUserId: string) => {
      const [{ data: profile, error: profileError }, { data: trust }] = await Promise.all([
        supabase.from("users").select("*").eq("id", authUserId).maybeSingle(),
        supabase.from("trust_scores").select("score").eq("user_id", authUserId).maybeSingle(),
      ]);

      if (profileError || !profile) {
        // The DB trigger that provisions public.users runs synchronously
        // on auth.users insert, but under load there can be a brief race
        // on a brand-new sign-up. One short retry covers it without a
        // spinner-forever failure mode.
        await new Promise((r) => setTimeout(r, 400));
        const retry = await supabase.from("users").select("*").eq("id", authUserId).maybeSingle();
        if (!retry.data) return null;
        const retryTrust = await supabase.from("trust_scores").select("score").eq("user_id", authUserId).maybeSingle();
        const retryUnreadNotifications = await getUnreadNotificationCount(retry.data.id);
        return toAuthUser(retry.data, Number(retryTrust.data?.score ?? 5), 0, retryUnreadNotifications);
      }

      // Unread messages: no per-room "last read" tracking exists yet (chat
      // itself is real — lib/real-chat.ts — but nothing marks a room read),
      // so 0 here is honest rather than a placeholder number. Unread
      // notifications ARE real now — public.notifications via
      // lib/real-notifications.ts — even though nothing writes to that
      // table yet, so this will correctly stay 0 until a write path exists
      // and then just start working.
      const unreadNotifications = await getUnreadNotificationCount(profile.id);
      return toAuthUser(profile, Number(trust?.score ?? 5), 0, unreadNotifications);
    },
    [supabase]
  );

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        if (!cancelled) setUser(profile);
      }
      if (!cancelled) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        return;
      }
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        setUser(profile);
        setSigningIn(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    const next = typeof window !== "undefined" ? window.location.pathname : "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // signInWithOAuth navigates the whole page away on success, so this
    // only runs on immediate failure (e.g. Google provider not yet
    // enabled in the Supabase dashboard) — otherwise the page unloads
    // before we'd ever see a resolved promise.
    if (error) setSigningIn(false);
  }, [supabase]);

  const requireAuth = useCallback(
    (_actionLabel: ProtectedActionLabel, onSuccess: () => void) => {
      if (user) {
        onSuccess();
        return;
      }
      signInWithGoogle();
    },
    [user, signInWithGoogle]
  );

  const requireVerification = useCallback(
    (onSuccess: () => void) => {
      // Testing-phase rule: any signed-in session is sufficient (Google
      // sign-in sets phone_verified via the DB trigger — see this file's
      // top comment). Only a genuinely unverified session (shouldn't
      // normally happen post-login) hits the interstitial.
      if (user && user.verificationStatus !== "unverified") {
        onSuccess();
        return;
      }
      pendingVerificationSuccessRef.current = onSuccess;
      setVerificationOpen(true);
    },
    [user]
  );

  const requireCompleteProfile = useCallback(
    (onSuccess: () => void) => {
      if (hasCompleteProfile(user)) {
        onSuccess();
        return;
      }
      if (typeof window !== "undefined") {
        const next = window.location.pathname;
        window.location.href = `/profile/edit?next=${encodeURIComponent(next)}&reason=complete-profile`;
      }
    },
    [user]
  );

  const logout = useCallback(() => {
    supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const closeVerification = useCallback(() => {
    setVerificationOpen(false);
    pendingVerificationSuccessRef.current = null;
  }, []);

  const startVerification = useCallback(async () => {
    // No real ID-review pipeline exists yet (verification is eased for
    // the testing phase — see public.verifications' dormant status).
    // Since requireVerification() above already treats any signed-in
    // session as sufficient, this interstitial should rarely if ever
    // actually fire in practice; kept as a real no-op-but-honest path
    // rather than deleted, so turning on real ID review later means
    // wiring this up to the verifications table, not resurrecting a
    // deleted flow.
    setVerificationOpen(false);
    const resume = pendingVerificationSuccessRef.current;
    pendingVerificationSuccessRef.current = null;
    if (resume) resume();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: !!user,
      loading,
      signingIn,
      logout,
      requireAuth,
      requireVerification,
      requireCompleteProfile,
      verificationModal: { open: verificationOpen },
      verificationActions: { close: closeVerification, startVerification },
    }),
    [
      user,
      loading,
      signingIn,
      logout,
      requireAuth,
      requireVerification,
      requireCompleteProfile,
      verificationOpen,
      closeVerification,
      startVerification,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function verificationStatusLabel(status: VerificationStatus): string {
  switch (status) {
    case "id_verified":
      return "ID Verified";
    case "id_pending":
      return "Verification pending";
    case "phone_verified":
      return "Not yet verified";
    case "unverified":
    default:
      return "Not verified";
  }
}
