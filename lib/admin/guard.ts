import type { SessionUser } from "@/lib/auth-context";

/**
 * Client-side capability model for the admin panel, per the Developer
 * Spec §3's table — implemented as a capability lookup (not scattered
 * `if (role === 'admin')` checks) so a third tier can be added later
 * without touching every call site. This is a UX gate only: every
 * mutating action is re-checked server-side by its RPC (is_staff() /
 * role = 'admin' inside the function body, per the spec's "the UI is
 * not the enforcement layer").
 */
export type AdminRole = "moderator" | "admin";

export type AdminCapability =
  | "view"
  | "verification.decide"
  | "user.warn"
  | "user.restrict"
  | "user.suspend"
  | "user.remove"
  | "trip.hide"
  | "trip.closeRegistrations"
  | "trip.forceCancel"
  | "review.hideRemove"
  | "company.recommend"
  | "company.decide"
  | "trustScore.freeze"
  | "testimonial.manage"
  | "destination.manage"
  | "auditLog.viewOwn"
  | "auditLog.viewAll"
  | "decision.reverse";

const MODERATOR_CAPABILITIES: AdminCapability[] = [
  "view",
  "verification.decide",
  "user.warn",
  "user.restrict",
  "trip.hide",
  "trip.closeRegistrations",
  "review.hideRemove",
  "company.recommend",
  "auditLog.viewOwn",
];

const ADMIN_CAPABILITIES: AdminCapability[] = [
  ...MODERATOR_CAPABILITIES,
  "user.suspend",
  "user.remove",
  "trip.forceCancel",
  "company.decide",
  "trustScore.freeze",
  "testimonial.manage",
  "destination.manage",
  "auditLog.viewAll",
  "decision.reverse",
];

export function isAdminRole(role: string): role is AdminRole {
  return role === "moderator" || role === "admin";
}

export function capabilitiesFor(role: AdminRole): AdminCapability[] {
  return role === "admin" ? ADMIN_CAPABILITIES : MODERATOR_CAPABILITIES;
}

export function can(user: SessionUser | null, capability: AdminCapability): boolean {
  if (!user || !isAdminRole(user.role)) return false;
  return capabilitiesFor(user.role).includes(capability);
}
