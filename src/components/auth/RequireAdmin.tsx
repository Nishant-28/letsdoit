import { useConvexAuth, useQuery } from "convex/react";
import { Navigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { canAccessAdminSurface } from "@/lib/admin";
import { FullPageLoader } from "./FullPageLoader";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  if (isLoading) {
    return <FullPageLoader label="Securing your session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?next=%2Fadmin" replace />;
  }

  if (me === undefined) {
    return <FullPageLoader label="Verifying access" />;
  }

  if (!me || !canAccessAdminSurface(me)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
