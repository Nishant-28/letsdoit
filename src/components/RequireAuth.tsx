import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/lib/auth";

/**
 * Gate used on routes that depend on a signed-in user. Four states:
 *
 *   - `authLoading`: render a spinner so the app doesn't flicker to /login
 *     and back while the WorkOS → Convex → `users.me` handshake runs.
 *   - `phase === "error"`: we have a WorkOS session but Convex refused to
 *     validate or the sync mutation keeps failing. Show an escape hatch
 *     instead of trapping the user on a "Loading…" screen.
 *   - Not signed in: redirect to /login with a `from` hint so we can bounce
 *     back after sign-in.
 *   - Signed in but not onboarded: redirect to /onboard so we capture the
 *     display name + intent before letting them into the app. This can be
 *     opted out of with `skipOnboardCheck` (used by /onboard so it doesn't
 *     loop on itself).
 */
export function RequireAuth({
  children,
  adminOnly,
  skipOnboardCheck,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  skipOnboardCheck?: boolean;
}) {
  const { user, authLoading, phase, syncError, signOut } = useAuth();
  const location = useLocation();

  if (phase === "error") {
    return (
      <div className="max-w-xl mx-auto py-24 text-center px-6">
        <h1 className="text-3xl font-headline font-bold text-on-surface">
          We couldn't finish signing you in
        </h1>
        <p className="mt-4 text-on-surface-variant">
          {syncError ??
            "Something went wrong talking to the backend. Please sign in again."}
        </p>
        <button
          type="button"
          onClick={() => {
            void signOut();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary text-on-primary px-5 py-2.5 font-label text-sm font-medium hover:bg-primary/90"
        >
          Return to sign in
        </button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-on-surface-variant">
        <span className="font-label text-sm uppercase tracking-widest">
          Loading…
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!user.onboarded && !skipOnboardCheck) {
    return <Navigate to="/onboard" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto py-24 text-center">
        <h1 className="text-3xl font-headline font-bold text-on-surface">
          Not authorized
        </h1>
        <p className="mt-4 text-on-surface-variant">
          This area is restricted to admins.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
