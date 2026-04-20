import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import * as session from "./workosSession";
import type { WorkOSSession } from "./workosSession";

export type CurrentUser = {
  _id: Id<"users">;
  workosId: string;
  email: string;
  name: string;
  role: "user" | "admin";
  intent: "candidate" | "recruiter" | undefined;
  onboarded: boolean;
};

export type AuthPhase =
  | "anonymous"
  | "convex_authenticating"
  | "syncing"
  | "ready"
  | "error";

type Ctx = {
  user: CurrentUser | null;
  workosSession: WorkOSSession | null;
  phase: AuthPhase;
  authLoading: boolean;
  syncError: string | null;
  /** Sign out locally. Always resolves. */
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  workosSession: null,
  phase: "anonymous",
  authLoading: true,
  syncError: null,
  signOut: async () => {},
});

/** Flip to `true` via `localStorage.setItem("DEBUG_AUTH", "1")` for traces. */
const DEBUG =
  typeof window !== "undefined" &&
  window.localStorage?.getItem("DEBUG_AUTH") === "1";
function debug(...args: unknown[]) {
  if (DEBUG) console.log("[auth]", ...args);
}

/**
 * Orchestrates the three-stage auth dance after the user submits credentials:
 *   1. `signInWithPassword` stores the WorkOS session in localStorage
 *   2. Convex picks up the JWT via `ConvexProviderWithAuth`      (useConvexAuth)
 *   3. We upsert the `users` row via `users.syncFromWorkOS`      (synced)
 *
 * If any stage fails terminally we surface a `syncError` instead of
 * spinning on a loading indicator, so the UI can offer a sign-out escape
 * hatch instead of trapping the user.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<WorkOSSession | null>(() => session.getSession());

  useEffect(() => {
    const unsub = session.subscribe(setWs);
    return unsub;
  }, []);

  const { isAuthenticated: convexAuthed, isLoading: convexAuthLoading } =
    useConvexAuth();

  const me = useQuery(api.users.me, convexAuthed ? {} : "skip");
  const sync = useMutation(api.users.syncFromWorkOS);

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ws) {
      syncedForRef.current = null;
      setSyncing(false);
      setSyncError(null);
      return;
    }
    if (!convexAuthed) return;
    if (syncedForRef.current === ws.user.id) return;

    let cancelled = false;
    setSyncing(true);
    setSyncError(null);

    const displayName =
      [ws.user.firstName, ws.user.lastName].filter(Boolean).join(" ") ||
      ws.user.email;

    (async () => {
      const maxAttempts = 4;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          debug(`sync attempt ${attempt + 1}`, { email: ws.user.email });
          await sync({ email: ws.user.email, name: displayName });
          if (cancelled) return;
          debug("sync ok");
          syncedForRef.current = ws.user.id;
          setSyncing(false);
          return;
        } catch (err) {
          if (cancelled) return;
          debug(`sync attempt ${attempt + 1} failed`, err);
          if (attempt === maxAttempts - 1) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("users.syncFromWorkOS failed", err);
            setSyncError(msg);
            setSyncing(false);
            return;
          }
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ws, convexAuthed, sync]);

  const hasWorkos = ws != null;

  // Derive a single-flag phase describing where we are in the handshake.
  // `error` short-circuits any further loading UI so the user isn't trapped.
  let phase: AuthPhase;
  if (!hasWorkos) phase = "anonymous";
  else if (syncError) phase = "error";
  else if (convexAuthLoading || !convexAuthed) phase = "convex_authenticating";
  else if (syncing || me === undefined) phase = "syncing";
  else phase = "ready";

  const authLoading =
    phase === "convex_authenticating" || phase === "syncing";

  useEffect(() => {
    debug("phase", phase, {
      hasWorkos,
      convexAuthed,
      convexAuthLoading,
      me: me === undefined ? "undefined" : me === null ? "null" : "row",
      syncing,
      syncError,
    });
  }, [phase, hasWorkos, convexAuthed, convexAuthLoading, me, syncing, syncError]);

  const signOut = useCallback(async () => {
    debug("signOut");
    session.signOut();
    syncedForRef.current = null;
    setSyncError(null);
  }, []);

  const value: Ctx = {
    user: me ?? null,
    workosSession: ws,
    phase,
    authLoading,
    syncError,
    signOut,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): Ctx {
  return useContext(AuthCtx);
}

export function useCurrentUser(): CurrentUser | null {
  return useContext(AuthCtx).user;
}
