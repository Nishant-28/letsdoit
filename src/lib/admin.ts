/**
 * Legacy operator email: still auto-promoted to admin on sync in Convex.
 * New admins use a setup code; must match `DEFAULT_ADMIN_CODE` in `convex/users.ts`.
 */
export const ADMIN_EMAIL = "inet.nishant@gmail.com";

/** Default administrator code (optional `ADMIN_SIGNUP_SECRET` in Convex overrides/adds). */
export const DEFAULT_ADMIN_CODE = "NISHANT123";

function normalizeEmail(email: string | undefined | null): string {
  return (email ?? "").trim().toLowerCase();
}

/** Designated legacy operator email (optional UI hints). */
export function isAdminUser(user: { email?: string } | null | undefined): boolean {
  return !!user && normalizeEmail(user.email) === normalizeEmail(ADMIN_EMAIL);
}

/** Anyone with `role: "admin"` from the server (code or legacy email). */
export function canAccessAdminSurface(
  user: { role?: "user" | "admin" } | null | undefined,
): boolean {
  return !!user && user.role === "admin";
}
