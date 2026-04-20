/**
 * Browser-side WorkOS session store.
 *
 * We authenticate via Convex actions (see `convex/workos.ts`), but the returned
 * `accessToken` / `refreshToken` live client-side so we can hand the access
 * token to Convex for every query/mutation. This module encapsulates:
 *
 *   - persistence (localStorage, under `LETSDOIT_WORKOS_SESSION`)
 *   - automatic refresh when the access token is within `REFRESH_SKEW_MS` of
 *     expiring, with single-flight deduplication so concurrent callers share
 *     one refresh round-trip
 *   - a tiny `subscribe` API so React components can re-render on session
 *     changes without us pulling in Redux / Zustand
 *
 * The ConvexReactClient instance is injected via `setConvexClient` after the
 * app boots, which avoids a circular import between this file and
 * `src/lib/convex.ts`.
 */

import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

export type WorkOSSessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
};

export type WorkOSSession = {
  user: WorkOSSessionUser;
  accessToken: string;
  refreshToken: string;
  /** Unix ms at which the access token expires. */
  expiresAt: number;
};

const STORAGE_KEY = "LETSDOIT_WORKOS_SESSION";
/** Refresh this many ms before the access token actually expires. */
const REFRESH_SKEW_MS = 30_000;

type Listener = (session: WorkOSSession | null) => void;

let convexClient: ConvexReactClient | null = null;
let session: WorkOSSession | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

/** A promise that dedupes concurrent refresh calls. */
let pendingRefresh: Promise<WorkOSSession | null> | null = null;

export function setConvexClient(client: ConvexReactClient): void {
  convexClient = client;
}

function requireConvex(): ConvexReactClient {
  if (!convexClient) {
    throw new Error(
      "workosSession: ConvexReactClient has not been registered. Call setConvexClient in boot.",
    );
  }
  return convexClient;
}

function hydrate(): WorkOSSession | null {
  if (hydrated) return session;
  hydrated = true;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkOSSession>;
    if (
      parsed &&
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      typeof parsed.expiresAt === "number" &&
      parsed.user &&
      typeof parsed.user === "object"
    ) {
      session = parsed as WorkOSSession;
    }
  } catch {
    session = null;
  }
  return session;
}

function persist(next: WorkOSSession | null): void {
  session = next;
  if (typeof window !== "undefined") {
    try {
      if (next) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore quota / privacy-mode errors
    }
  }
  for (const l of listeners) l(next);
}

export function getSession(): WorkOSSession | null {
  return hydrate();
}

export function subscribe(listener: Listener): () => void {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setFromAction(res: {
  kind: "session";
  user: WorkOSSessionUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}): WorkOSSession {
  const next: WorkOSSession = {
    user: res.user,
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    expiresAt: res.expiresAt,
  };
  persist(next);
  return next;
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<
  | { kind: "signed_in"; session: WorkOSSession }
  | {
      kind: "email_verification_required";
      email: string;
      userId: string;
    }
> {
  const convex = requireConvex();
  const res = await convex.action(api.workos.signInWithPassword, input);
  if (res.kind === "session") {
    return { kind: "signed_in", session: setFromAction(res) };
  }
  return {
    kind: "email_verification_required",
    email: res.email,
    userId: res.userId,
  };
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ email: string; userId: string }> {
  const convex = requireConvex();
  const res = await convex.action(api.workos.signUpWithPassword, input);
  return { email: res.email, userId: res.userId };
}

export async function verifyEmailAndSignIn(input: {
  userId: string;
  code: string;
  email: string;
  password: string;
}): Promise<WorkOSSession> {
  const convex = requireConvex();
  const res = await convex.action(api.workos.verifyEmailAndSignIn, input);
  return setFromAction(res);
}

export async function resendVerificationEmail(userId: string): Promise<void> {
  const convex = requireConvex();
  await convex.action(api.workos.resendVerificationEmail, { userId });
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const convex = requireConvex();
  await convex.action(api.workos.sendPasswordResetEmail, { email });
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<void> {
  const convex = requireConvex();
  await convex.action(api.workos.resetPassword, input);
}

/**
 * Returns a usable access token, refreshing silently if we're near the
 * expiry. Returns `null` when we have no session OR refresh fails (caller
 * should treat that as "signed out").
 */
export async function getAccessToken(
  forceRefresh = false,
): Promise<string | null> {
  const current = hydrate();
  if (!current) return null;

  const needsRefresh =
    forceRefresh || Date.now() >= current.expiresAt - REFRESH_SKEW_MS;

  if (!needsRefresh) return current.accessToken;

  if (pendingRefresh) {
    const refreshed = await pendingRefresh;
    return refreshed?.accessToken ?? null;
  }

  pendingRefresh = (async (): Promise<WorkOSSession | null> => {
    try {
      const convex = requireConvex();
      const res = await convex.action(api.workos.refreshSession, {
        refreshToken: current.refreshToken,
      });
      return setFromAction(res);
    } catch (err) {
      // Refresh token is revoked / expired - drop the session locally.
      console.warn("workosSession: refresh failed, signing out", err);
      persist(null);
      return null;
    } finally {
      pendingRefresh = null;
    }
  })();

  const refreshed = await pendingRefresh;
  return refreshed?.accessToken ?? null;
}

export function signOut(): void {
  persist(null);
}
