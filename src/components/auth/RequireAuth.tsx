import { useConvexAuth } from "convex/react";
import { Navigate, useLocation } from "react-router";
import { FullPageLoader } from "./FullPageLoader";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoader label="Securing your session" />;
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}
