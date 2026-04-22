import { v } from "convex/values";
import { internalQuery, query, mutation } from "./_generated/server";
import { isOperatorEmail, maybeUser, requireUser } from "./helpers";
import { userIntent, userRole } from "./schema";

const USER_RETURN = v.object({
  _id: v.id("users"),
  workosId: v.string(),
  email: v.string(),
  name: v.string(),
  role: userRole,
  intent: v.optional(userIntent),
  phoneE164: v.optional(v.string()),
  onboarded: v.boolean(),
});

export const me = query({
  args: {},
  returns: v.union(v.null(), USER_RETURN),
  handler: async (ctx) => {
    const user = await maybeUser(ctx);
    if (!user) return null;
    return projectUser(user);
  },
});

/**
 * Internal lookup used by Node actions (e.g. Cashfree `createOrder`) to
 * resolve the calling user's DB row. Node actions must go through
 * `ctx.runQuery` to read the database, so this exposes the same
 * `maybeUser` helper behind an internal boundary.
 */
export const internalGetMe = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      email: v.string(),
      name: v.string(),
      phoneE164: v.optional(v.string()),
      role: userRole,
    }),
  ),
  handler: async (ctx) => {
    const user = await maybeUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      phoneE164: user.phoneE164,
      role: user.role,
    };
  },
});

/**
 * Default dev code — works even when `ADMIN_SIGNUP_SECRET` is unset.
 * Keep in sync with `DEFAULT_ADMIN_CODE` in `src/lib/admin.ts`.
 * Optional: `ADMIN_SIGNUP_SECRET` in Convex is also accepted.
 */
const DEFAULT_ADMIN_CODE = "NISHANT123";

function assertValidAdminSignupCode(provided: string | undefined) {
  const code = (provided ?? "").trim();
  const envSecret = process.env.ADMIN_SIGNUP_SECRET?.trim();

  if (code === DEFAULT_ADMIN_CODE) {
    return;
  }
  if (envSecret && code === envSecret) {
    return;
  }

  throw new Error(
    envSecret
      ? "Invalid administrator setup code."
      : `Invalid code. Use "${DEFAULT_ADMIN_CODE}" or set ADMIN_SIGNUP_SECRET in Convex.`,
  );
}

function projectUser(u: {
  _id: import("./_generated/dataModel").Id<"users">;
  workosId: string;
  email: string;
  name: string;
  role: "user" | "admin";
  intent?: "candidate" | "recruiter";
  phoneE164?: string;
  onboardedAt?: number;
}) {
  return {
    _id: u._id,
    workosId: u.workosId,
    email: u.email,
    name: u.name,
    role: u.role,
    intent: u.intent,
    phoneE164: u.phoneE164,
    onboarded: u.onboardedAt !== undefined,
  };
}

/**
 * Sync or create user from WorkOS identity.
 * Called after successful WorkOS authentication.
 */
export const syncFromWorkOS = mutation({
  args: {},
  returns: USER_RETURN,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const workosId = identity.subject;
    const incomingEmail = identity.email?.trim() ?? "";
    const incomingName = identity.name?.trim() ?? "";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", workosId))
      .unique();

    // If the JWT omits email (or sends empty), keep the stored address so we
    // don't wipe it and accidentally demote the operator on the next sync.
    const email = incomingEmail || existing?.email || "";
    const name =
      incomingName ||
      (incomingEmail ? incomingEmail.split("@")[0] : undefined) ||
      existing?.name ||
      email ||
      "User";

    // Legacy: designated operator email is always admin. Otherwise preserve
    // an existing admin row (granted via onboarding code) so the next login
    // does not demote platform administrators.
    let role: "user" | "admin";
    if (isOperatorEmail(email)) {
      role = "admin";
    } else if (existing?.role === "admin") {
      role = "admin";
    } else {
      role = "user";
    }

    if (existing) {
      await ctx.db.patch(existing._id, { email, name, role });
      const refreshed = await ctx.db.get(existing._id);
      if (!refreshed) throw new Error("Failed to refresh user");
      return projectUser(refreshed);
    }

    const userId = await ctx.db.insert("users", {
      workosId,
      email,
      name,
      role: isOperatorEmail(email) ? "admin" : "user",
      createdAt: Date.now(),
    });

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Failed to create user");
    return projectUser(user);
  },
});

/**
 * Complete onboarding with required profile data.
 */
export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    intent: userIntent,
    phoneE164: v.string(),
    /** When true, `adminSignupCode` must match `ADMIN_SIGNUP_SECRET` in Convex. */
    requestAdmin: v.optional(v.boolean()),
    adminSignupCode: v.optional(v.string()),
  },
  returns: USER_RETURN,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Validate phone format: must be +91 followed by 10 digits
    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(args.phoneE164)) {
      throw new Error(
        "Invalid phone number. Must be +91 followed by 10 digits.",
      );
    }

    // Check phone uniqueness
    const existingPhone = await ctx.db
      .query("users")
      .withIndex("by_phoneE164", (q) => q.eq("phoneE164", args.phoneE164))
      .unique();

    if (existingPhone && existingPhone._id !== user._id) {
      throw new Error("This phone number is already registered.");
    }

    if (args.requestAdmin) {
      assertValidAdminSignupCode(args.adminSignupCode);
    }

    const patch: {
      name: string;
      intent: "candidate" | "recruiter";
      phoneE164: string;
      onboardedAt: number;
      role?: "user" | "admin";
    } = {
      name: args.name,
      intent: args.intent,
      phoneE164: args.phoneE164,
      onboardedAt: Date.now(),
    };
    if (args.requestAdmin) {
      patch.role = "admin";
    }

    await ctx.db.patch(user._id, patch);

    const updated = await ctx.db.get(user._id);
    if (!updated) throw new Error("Failed to update user");
    return projectUser(updated);
  },
});

/**
 * For users who already finished onboarding without admin — enter the same
 * `ADMIN_SIGNUP_SECRET` used at signup to promote the account.
 */
export const claimAdminWithCode = mutation({
  args: { adminSignupCode: v.string() },
  returns: USER_RETURN,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role === "admin") {
      return projectUser(user);
    }
    assertValidAdminSignupCode(args.adminSignupCode);
    await ctx.db.patch(user._id, { role: "admin" });
    const updated = await ctx.db.get(user._id);
    if (!updated) throw new Error("Failed to update user");
    return projectUser(updated);
  },
});

/**
 * Update user profile (name, intent, phone).
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    intent: v.optional(userIntent),
    phoneE164: v.optional(v.string()),
  },
  returns: USER_RETURN,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Validate phone if provided
    if (args.phoneE164) {
      const phoneRegex = /^\+91\d{10}$/;
      if (!phoneRegex.test(args.phoneE164)) {
        throw new Error(
          "Invalid phone number. Must be +91 followed by 10 digits.",
        );
      }

      // Check phone uniqueness
      const existingPhone = await ctx.db
        .query("users")
        .withIndex("by_phoneE164", (q) => q.eq("phoneE164", args.phoneE164))
        .unique();

      if (existingPhone && existingPhone._id !== user._id) {
        throw new Error("This phone number is already registered.");
      }
    }

    // Build update object
    const updates: {
      name?: string;
      intent?: "candidate" | "recruiter";
      phoneE164?: string;
    } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.intent !== undefined) updates.intent = args.intent;
    if (args.phoneE164 !== undefined) updates.phoneE164 = args.phoneE164;

    await ctx.db.patch(user._id, updates);

    const updated = await ctx.db.get(user._id);
    if (!updated) throw new Error("Failed to update user");
    return projectUser(updated);
  },
});
