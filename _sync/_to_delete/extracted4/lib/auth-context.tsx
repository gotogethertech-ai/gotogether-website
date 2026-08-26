"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, VerificationStatus } from "@/components/Header";

/**
 * Client-side auth state + the "protected action" trigger mechanism, per
 * the Authentication Blueprint's approved direction: unauthenticated
 * browsing everywhere, a modal opens only at the point of a protected
 * action (Create Trip / Request to Join / Save / Message), captures the
 * intent, and — since there's no backend yet — "succeeds" locally and
 * re-invokes the original action handler (the blueprint's own
 * "auto-resume, not redirect" architecture, just without a server).
 *
 * No real OTP delivery exists in this frontend-only phase: any 6 digits
 * are accepted as valid, matching how other pages mock data rather than
 * silently faking a passing state machine.
 *
 * Two-gate model (Authentication Blueprint §1.6 / Onboarding Blueprint's
 * Progressive Completion): phone-OTP success only proves phone ownership.
 * A *new* account also needs a display name (Onboarding's one mandatory
 * step) before it's "complete." Create Trip / Request to Join additionally
 * require id_verified — a separate, later gate with its own chained
 * return_to, handled by requireVerification() below rather than folded
 * into requireAuth() so Save/Message (not ID-gated) don't trip it.
 */

const MOCK_USER: AuthUser = {
  name: "Riya Anand",
  initials: "RA",
  trustScore: 9.1,
  unreadMessages: 2,
  unreadNotifications: 5,
  // Logged-in mock user is fully set up by default so the rest of the
  // built-so-far app (Create Trip, My Trips, etc.) keeps working exactly
  // as before — the unverified/new-account paths are reachable via the
  // login flow itself (see verifyOtp).
  verificationStatus: "id_verified",
  accountStatus: "active",
};

export type ProtectedActionLabel = string;

type AuthContextValue = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  logout: () => void;
  /** Opens the auth modal if logged out, then calls onSuccess (immediately
   * if already logged in). Mirrors the blueprint's return_to mechanism —
   * the "context" is just the closure captured in onSuccess. Does NOT by
   * itself check ID verification — pair with requireVerification() for
   * actions that need it (Create Trip, Request to Join). */
  requireAuth: (label: ProtectedActionLabel, onSuccess: () => void) => void;
  /** Second, later gate — checks id_verified on an already-logged-in user
   * and opens the Verification Required Interstitial if not, chaining
   * onSuccess as its own return_to. Call from inside requireAuth's
   * onSuccess so login always resolves first. */
  requireVerification: (onSuccess: () => void) => void;
  modalState: {
    open: boolean;
    label: ProtectedActionLabel;
    step: "phone" | "otp" | "name";
    phone: string;
  };
  actions: {
    close: () => void;
    submitPhone: (phone: string) => void;
    editNumber: () => void;
    verifyOtp: () => Promise<boolean>;
    resend: () => void;
    submitName: (name: string) => void;
  };
  verificationModal: {
    open: boolean;
  };
  verificationActions: {
    close: () => void;
    /** Mock "Start Verification": in a frontend-only build there's no real
     * ID+selfie flow to launch, so this simulates the doc's own "not
     * instant" Pending state, then resolves to id_verified and resumes —
     * there's no notification system yet to deep-link back later, so the
     * resume happens in the same session instead. */
    startVerification: () => Promise<void>;
  };
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<ProtectedActionLabel>("");
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [verificationOpen, setVerificationOpen] = useState(false);
  const pendingSuccessRef = useRef<(() => void) | null>(null);
  const pendingVerificationSuccessRef = useRef<(() => void) | null>(null);

  const requireAuth = useCallback(
    (actionLabel: ProtectedActionLabel, onSuccess: () => void) => {
      if (user) {
        onSuccess();
        return;
      }
      pendingSuccessRef.current = onSuccess;
      setLabel(actionLabel);
      setStep("phone");
      setOpen(true);
    },
    [user]
  );

  const requireVerification = useCallback(
    (onSuccess: () => void) => {
      if (user && user.verificationStatus === "id_verified") {
        onSuccess();
        return;
      }
      pendingVerificationSuccessRef.current = onSuccess;
      setVerificationOpen(true);
    },
    [user]
  );

  const close = useCallback(() => {
    // Cancellation: modal closes, no error, no re-triggered action,
    // return_to context discarded — per the blueprint's Cancellation table.
    setOpen(false);
    pendingSuccessRef.current = null;
  }, []);

  const submitPhone = useCallback((value: string) => {
    setPhone(value);
    setStep("otp");
  }, []);

  const editNumber = useCallback(() => {
    setStep("phone");
  }, []);

  const verifyOtp = useCallback(async (): Promise<boolean> => {
    // Mock verification: any complete 6-digit code succeeds. Whether this
    // is a "new" account is itself mocked by phone number — a phone ending
    // in an odd digit simulates a brand-new account and continues to the
    // Name step in the same modal shell (Onboarding Blueprint Concept C);
    // an even-ending number simulates a returning user and skips it,
    // matching "the new-user check is based on whether display_name
    // already exists, not session recency."
    const lastDigit = Number(phone.replace(/\D/g, "").slice(-1));
    const isNewUser = Number.isFinite(lastDigit) && lastDigit % 2 === 1;

    if (isNewUser) {
      setStep("name");
      return true;
    }

    setUser(MOCK_USER);
    setOpen(false);
    const resume = pendingSuccessRef.current;
    pendingSuccessRef.current = null;
    if (resume) resume();
    return true;
  }, [phone]);

  const submitName = useCallback((name: string) => {
    // Per Onboarding: single-field atomic save, no separate "welcome"
    // screen — modal closes immediately and return_to resumes. A brand
    // new account starts unverified (phone_verified only), so a
    // subsequent Create Trip / Request to Join will hit the Verification
    // Required Interstitial via requireVerification(), exactly as the
    // Progressive Completion flow describes.
    setUser({
      ...MOCK_USER,
      name,
      initials: initialsFrom(name),
      verificationStatus: "phone_verified",
      trustScore: 0,
      unreadMessages: 0,
      unreadNotifications: 0,
    });
    setOpen(false);
    const resume = pendingSuccessRef.current;
    pendingSuccessRef.current = null;
    if (resume) resume();
  }, []);

  const resend = useCallback(() => {
    // No real send to resend in the mock — no-op, UI owns its own countdown.
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const closeVerification = useCallback(() => {
    setVerificationOpen(false);
    pendingVerificationSuccessRef.current = null;
  }, []);

  const startVerification = useCallback(async () => {
    // Simulate the doc's "not instant — enters Pending review" step, then
    // resolve id_verified and resume, since there's no notification system
    // in this frontend-only build to deep-link back later.
    setUser((prev) => (prev ? { ...prev, verificationStatus: "id_pending" } : prev));
    await new Promise((r) => setTimeout(r, 900));
    setUser((prev) => (prev ? { ...prev, verificationStatus: "id_verified" } : prev));
    setVerificationOpen(false);
    const resume = pendingVerificationSuccessRef.current;
    pendingVerificationSuccessRef.current = null;
    if (resume) resume();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: !!user,
      logout,
      requireAuth,
      requireVerification,
      modalState: { open, label, step, phone },
      actions: { close, submitPhone, editNumber, verifyOtp, resend, submitName },
      verificationModal: { open: verificationOpen },
      verificationActions: { close: closeVerification, startVerification },
    }),
    [
      user,
      logout,
      requireAuth,
      requireVerification,
      open,
      label,
      step,
      phone,
      close,
      submitPhone,
      editNumber,
      verifyOtp,
      resend,
      submitName,
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
