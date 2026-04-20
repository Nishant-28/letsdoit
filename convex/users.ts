import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { maybeUser, requireAdmin, requireUser } from "./helpers";
import { userIntent, userRole } from "./schema";

const USER_RETURN = v.object({
  _id: v.id("users"),
  workosId: v.string(),
  email: v.string(),
  name: v.string(),
  role: userRole,
  intent: v.optional(userIntent),
  onboarded: v.boolean(),
});

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Called once on every sign-in from `src/lib/auth.tsx`. Upserts the Convex
 * `users` row keyed by the WorkOS user id and assigns `admin` role when the
 * email is present in `ADMIN_EMAILS` (Convex env var, comma-separated).
 *
 * Returns the resolved row including `onboarded` so the client knows whether
 * to route the user to /onboard on first arrival.
 */
export const syncFromWorkOS = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  returns: USER_RETURN,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated.");
    const workosId = identity.subject;

    const adminEmails = parseAdminEmails();
    const isAdminByEnv = adminEmails.includes(args.email.toLowerCase());

    const existing = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", workosId))
      .unique();

    if (existing) {
      const patch: Partial<{
        email: string;
        name: string;
        role: "user" | "admin";
      }> = {};
      if (existing.email !== args.email) patch.email = args.email;
      if (existing.name !== args.name && args.name) patch.name = args.name;
      if (isAdminByEnv && existing.role !== "admin") patch.role = "admin";
      if (Object.keys(patch).length) await ctx.db.patch(existing._id, patch);
      const updated = (await ctx.db.get(existing._id))!;
      return projectUser(updated);
    }

    const id = await ctx.db.insert("users", {
      workosId,
      email: args.email,
      name: args.name,
      role: isAdminByEnv ? "admin" : "user",
      createdAt: Date.now(),
    });
    const created = (await ctx.db.get(id))!;
    return projectUser(created);
  },
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

export const setIntent = mutation({
  args: {
    intent: userIntent,
    name: v.optional(v.string()),
  },
  returns: USER_RETURN,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patch: Partial<{
      intent: "candidate" | "recruiter";
      name: string;
      onboardedAt: number;
    }> = {
      intent: args.intent,
      onboardedAt: Date.now(),
    };
    if (args.name && args.name.trim() && args.name.trim() !== user.name) {
      patch.name = args.name.trim();
    }
    await ctx.db.patch(user._id, patch);
    const updated = (await ctx.db.get(user._id))!;
    return projectUser(updated);
  },
});

export const adminList = query({
  args: {},
  returns: v.array(USER_RETURN),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("users").collect();
    return all.map(projectUser);
  },
});

export const adminPromote = mutation({
  args: { targetUserId: v.id("users"), role: userRole },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.targetUserId, { role: args.role });
    return null;
  },
});

function projectUser(u: {
  _id: import("./_generated/dataModel").Id<"users">;
  workosId: string;
  email: string;
  name: string;
  role: "user" | "admin";
  intent?: "candidate" | "recruiter";
  onboardedAt?: number;
}) {
  return {
    _id: u._id,
    workosId: u.workosId,
    email: u.email,
    name: u.name,
    role: u.role,
    intent: u.intent,
    onboarded: u.onboardedAt !== undefined,
  };
}
