"use node";

/**
 * Thin server-side proxy around the WorkOS Node SDK.
 *
 * The browser never talks to WorkOS directly: the `WORKOS_API_KEY` must stay on
 * the server. Our React app (`src/lib/workosSession.ts`) calls these actions,
 * stashes the returned tokens in localStorage, and passes the access token to
 * Convex via `ConvexProviderWithAuth`.
 *
 * We deliberately avoid WorkOS's `authenticateWithEmailVerification` +
 * `pending_authentication_token` flow because some WorkOS tenants return a
 * `GenericServerException` (not an `OauthException`) when email ownership
 * must be verified, and no pending token is surfaced in that case. Instead
 * we run the explicit three-step dance:
 *   1. `createUser` → returns the new WorkOS `userId`
 *   2. `sendVerificationEmail` → WorkOS emails a 6-digit code
 *   3. `verifyEmailAndSignIn` → `verifyEmail` then `authenticateWithPassword`
 *
 * Step 3 requires the password, which the frontend keeps in React Router
 * state (in-memory, never persisted) across the Signup → VerifyEmail hop.
 */

import { v } from "convex/values";
import { WorkOS } from "@workos-inc/node";
import { action } from "./_generated/server";

const USER_SHAPE = v.object({
  id: v.string(),
  email: v.string(),
  emailVerified: v.boolean(),
  firstName: v.union(v.null(), v.string()),
  lastName: v.union(v.null(), v.string()),
  profilePictureUrl: v.union(v.null(), v.string()),
});

const SESSION_SHAPE = v.object({
  kind: v.literal("session"),
  user: USER_SHAPE,
  accessToken: v.string(),
  refreshToken: v.string(),
  expiresAt: v.number(),
});

const VERIFICATION_REQUIRED_SHAPE = v.object({
  kind: v.literal("email_verification_required"),
  email: v.string(),
  userId: v.string(),
});

type WorkOSUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
};

type WorkOSErrorLike = {
  name?: string;
  error?: string;
  errorDescription?: string;
  code?: string;
  rawData?: Record<string, unknown> | null;
  message?: string;
  status?: number;
};

/** Best-effort decode of a JWT's `exp` claim so we can cache until near-expiry. */
function expiryFromAccessToken(accessToken: string): number {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return Date.now() + 5 * 60 * 1000;
    const raw = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(padded, "base64").toString("utf8"),
    ) as { exp?: number };
    if (typeof payload.exp === "number") return payload.exp * 1000;
  } catch {
    // fall through
  }
  return Date.now() + 5 * 60 * 1000;
}

function getWorkOS(): WorkOS {
  const apiKey = process.env.WORKOS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "WORKOS_API_KEY is not configured on the Convex deployment.",
    );
  }
  return new WorkOS(apiKey);
}

function getClientId(): string {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "WORKOS_CLIENT_ID is not configured on the Convex deployment.",
    );
  }
  return clientId;
}

/** Convert a WorkOS SDK User into our wire shape. */
function shapeUser(raw: {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
}): WorkOSUser {
  return {
    id: raw.id,
    email: raw.email,
    emailVerified: raw.emailVerified,
    firstName: raw.firstName,
    lastName: raw.lastName,
    profilePictureUrl: raw.profilePictureUrl,
  };
}

/**
 * Detect the "email not verified" family of errors, which can come back from
 * WorkOS as either `OauthException(error=email_verification_required)` or a
 * bare `GenericServerException("Email ownership must be verified …")`.
 */
function isEmailVerificationRequired(err: unknown): boolean {
  const e = err as WorkOSErrorLike;
  if (!e) return false;
  if (e.error === "email_verification_required") return true;
  if (e.code === "email_verification_required") return true;
  const msg = (e.message ?? "").toLowerCase();
  if (msg.includes("email ownership must be verified")) return true;
  if (msg.includes("email verification is required")) return true;
  return false;
}

/**
 * Re-throw a WorkOS SDK error as a plain `Error` with a human message, while
 * preserving the machine-readable WorkOS error code in the message suffix
 * (`[code]`). The React client pattern-matches on this suffix to show inline
 * errors like "password too weak", "email already in use", etc.
 */
function surface(err: unknown): never {
  const e = err as WorkOSErrorLike;

  if (e?.name === "OauthException") {
    const code = e.error ?? "oauth_error";
    const msg = e.errorDescription ?? e.message ?? "Authentication failed.";
    throw new Error(`${msg} [${code}]`);
  }

  if (e?.name === "UnprocessableEntityException") {
    const code = e.code ?? "unprocessable_entity";
    const msg = e.message ?? "The request could not be processed.";
    throw new Error(`${msg} [${code}]`);
  }

  if (e?.name === "BadRequestException") {
    const code = e.code ?? "bad_request";
    const msg = e.message ?? "Invalid request.";
    throw new Error(`${msg} [${code}]`);
  }

  if (e?.name === "UnauthorizedException") {
    throw new Error("Invalid email or password. [invalid_credentials]");
  }

  if (e?.name === "NotFoundException") {
    throw new Error("We could not find that record. [not_found]");
  }

  if (e?.name === "GenericServerException") {
    const msg = e.message ?? "Something went wrong.";
    throw new Error(`${msg} [server_error]`);
  }

  if (e instanceof Error) throw e;
  throw new Error("Unexpected authentication error.");
}

/**
 * Look up a WorkOS user by email so we can send them a verification code
 * when sign-in is blocked on verification. Returns null if no match.
 */
async function lookupUserIdByEmail(
  workos: WorkOS,
  email: string,
): Promise<string | null> {
  try {
    const list = await workos.userManagement.listUsers({ email, limit: 1 });
    const first = list.data?.[0];
    return first ? first.id : null;
  } catch {
    return null;
  }
}

export const signInWithPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.union(SESSION_SHAPE, VERIFICATION_REQUIRED_SHAPE),
  handler: async (_ctx, args) => {
    const workos = getWorkOS();
    const clientId = getClientId();
    const email = args.email.trim().toLowerCase();

    try {
      const res = await workos.userManagement.authenticateWithPassword({
        clientId,
        email,
        password: args.password,
      });
      return {
        kind: "session" as const,
        user: shapeUser(res.user),
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        expiresAt: expiryFromAccessToken(res.accessToken),
      };
    } catch (err) {
      if (isEmailVerificationRequired(err)) {
        const userId = await lookupUserIdByEmail(workos, email);
        if (userId) {
          // Best-effort resend; don't let a failure here block the user from
          // the verify screen because WorkOS often already sent one.
          try {
            await workos.userManagement.sendVerificationEmail({ userId });
          } catch {
            // swallow
          }
          return {
            kind: "email_verification_required" as const,
            email,
            userId,
          };
        }
      }
      surface(err);
    }
  },
});

export const signUpWithPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: VERIFICATION_REQUIRED_SHAPE,
  handler: async (_ctx, args) => {
    const workos = getWorkOS();
    const email = args.email.trim().toLowerCase();

    let userId: string;
    try {
      const created = await workos.userManagement.createUser({
        email,
        password: args.password,
        firstName: args.firstName?.trim() || undefined,
        lastName: args.lastName?.trim() || undefined,
      });
      userId = created.id;
    } catch (err) {
      surface(err);
    }

    // Most WorkOS tenants auto-send the verification email on createUser; we
    // trigger one explicitly too so the flow works even when that setting is
    // off. A failure here is non-fatal — the user can hit "Resend" on the
    // verify screen.
    try {
      await workos.userManagement.sendVerificationEmail({ userId });
    } catch {
      // swallow
    }

    return {
      kind: "email_verification_required" as const,
      email,
      userId,
    };
  },
});

/**
 * Two-phase finalizer used by /verify-email:
 *   1. `verifyEmail({userId, code})` — marks the address verified.
 *   2. `authenticateWithPassword` — issues the access/refresh tokens we
 *      persist on the client.
 *
 * The password is re-sent here from React Router state; we never log or
 * store it server-side.
 */
export const verifyEmailAndSignIn = action({
  args: {
    userId: v.string(),
    code: v.string(),
    email: v.string(),
    password: v.string(),
  },
  returns: SESSION_SHAPE,
  handler: async (_ctx, args) => {
    const workos = getWorkOS();
    const clientId = getClientId();

    try {
      await workos.userManagement.verifyEmail({
        userId: args.userId,
        code: args.code.trim(),
      });
    } catch (err) {
      surface(err);
    }

    try {
      const res = await workos.userManagement.authenticateWithPassword({
        clientId,
        email: args.email.trim().toLowerCase(),
        password: args.password,
      });
      return {
        kind: "session" as const,
        user: shapeUser(res.user),
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        expiresAt: expiryFromAccessToken(res.accessToken),
      };
    } catch (err) {
      surface(err);
    }
  },
});

export const resendVerificationEmail = action({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const workos = getWorkOS();
    try {
      await workos.userManagement.sendVerificationEmail({ userId: args.userId });
      return null;
    } catch (err) {
      surface(err);
    }
  },
});

export const sendPasswordResetEmail = action({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const workos = getWorkOS();
    try {
      // createPasswordReset both creates + emails the reset link; we do not
      // expose the resulting PasswordReset object to avoid leaking whether an
      // account exists for the given email.
      await workos.userManagement.createPasswordReset({
        email: args.email.trim().toLowerCase(),
      });
      return null;
    } catch (err) {
      const e = err as WorkOSErrorLike;
      // Always report success to the caller — we don't want signup leaks.
      if (e?.name === "NotFoundException") return null;
      surface(err);
    }
  },
});

export const resetPassword = action({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const workos = getWorkOS();
    try {
      await workos.userManagement.resetPassword({
        token: args.token,
        newPassword: args.newPassword,
      });
      return null;
    } catch (err) {
      surface(err);
    }
  },
});

export const refreshSession = action({
  args: { refreshToken: v.string() },
  returns: SESSION_SHAPE,
  handler: async (_ctx, args) => {
    const workos = getWorkOS();
    const clientId = getClientId();

    try {
      const res = await workos.userManagement.authenticateWithRefreshToken({
        clientId,
        refreshToken: args.refreshToken,
      });
      return {
        kind: "session" as const,
        user: shapeUser(res.user),
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        expiresAt: expiryFromAccessToken(res.accessToken),
      };
    } catch (err) {
      surface(err);
    }
  },
});
