import { useEffect } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/lib/auth";

/**
 * Fire-and-forget sign-out. We clear the local WorkOS session, then redirect
 * home. The `user` check re-triggers once Convex's `me` query flips to null,
 * at which point we render the redirect.
 */
export function Logout() {
  const { signOut, user, workosSession } = useAuth();

  useEffect(() => {
    void signOut();
  }, [signOut]);

  if (!user && !workosSession) return <Navigate to="/" replace />;

  return (
    <div className="flex items-center justify-center py-24 text-on-surface-variant">
      <span className="font-label text-sm uppercase tracking-widest">
        Signing out…
      </span>
    </div>
  );
}
