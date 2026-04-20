import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import {
  entitlementKind,
  entitlementSource,
  entitlementStatus,
  planSlug,
} from "./schema";
import { maybeUser, requireUser } from "./helpers";

export const myAccess = query({
  args: {},
  returns: v.object({
    subscriptionActive: v.boolean(),
    subscriptionExpiresAt: v.union(v.null(), v.number()),
    unlockedJobIds: v.array(v.id("jobs")),
  }),
  handler: async (ctx) => {
    const user = await maybeUser(ctx);
    if (!user) {
      return {
        subscriptionActive: false,
        subscriptionExpiresAt: null,
        unlockedJobIds: [],
      };
    }
    const ents = await ctx.db
      .query("entitlements")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .collect();

    let subscriptionActive = false;
    let subscriptionExpiresAt: number | null = null;
    const unlockedJobIds: import("./_generated/dataModel").Id<"jobs">[] = [];
    for (const e of ents) {
      if (e.kind === "subscription") {
        subscriptionActive = true;
        if (
          e.expiresAt &&
          (subscriptionExpiresAt === null || e.expiresAt > subscriptionExpiresAt)
        ) {
          subscriptionExpiresAt = e.expiresAt;
        }
      } else if (e.kind === "role" && e.jobId) {
        unlockedJobIds.push(e.jobId);
      }
    }
    return { subscriptionActive, subscriptionExpiresAt, unlockedJobIds };
  },
});

/**
 * Full list of the caller's entitlements (active + canceled + expired +
 * refunded) for the Account page history section.
 */
export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("entitlements"),
      kind: entitlementKind,
      planSlug: v.optional(planSlug),
      jobId: v.optional(v.id("jobs")),
      jobTitle: v.optional(v.string()),
      startsAt: v.number(),
      expiresAt: v.union(v.null(), v.number()),
      source: entitlementSource,
      status: entitlementStatus,
    }),
  ),
  handler: async (ctx) => {
    const user = await maybeUser(ctx);
    if (!user) return [];
    const all = await ctx.db
      .query("entitlements")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    all.sort((a, b) => b.startsAt - a.startsAt);
    const out = [];
    for (const e of all) {
      let jobTitle: string | undefined;
      if (e.jobId) {
        const job = await ctx.db.get(e.jobId);
        jobTitle = job?.title;
      }
      out.push({
        _id: e._id,
        kind: e.kind,
        planSlug: e.planSlug,
        jobId: e.jobId,
        jobTitle,
        startsAt: e.startsAt,
        expiresAt: e.expiresAt ?? null,
        source: e.source,
        status: e.status,
      });
    }
    return out;
  },
});

/**
 * Phase 1 mock: instantly grants per-role access. Phase 3 deletes this and
 * routes through `convex/payments.ts` + Cashfree webhook.
 */
export const mockUnlockJob = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.id("entitlements"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found.");

    const existing = await ctx.db
      .query("entitlements")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", user._id).eq("jobId", args.jobId),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (existing) return existing._id;

    const entId = await ctx.db.insert("entitlements", {
      userId: user._id,
      kind: "role",
      jobId: args.jobId,
      startsAt: Date.now(),
      source: "mock",
      status: "active",
    });
    await ctx.db.insert("jobEvents", {
      jobId: args.jobId,
      userId: user._id,
      kind: "unlock",
      at: Date.now(),
    });
    return entId;
  },
});

/**
 * Phase 1 mock: instantly grants a subscription. Phase 3 deletes this.
 */
export const mockSubscribe = mutation({
  args: { planSlug: planSlug },
  returns: v.id("entitlements"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_slug", (q) => q.eq("slug", args.planSlug))
      .unique();
    if (!plan) throw new Error(`Unknown plan: ${args.planSlug}`);

    const now = Date.now();
    const expiresAt = now + plan.periodDays * 24 * 60 * 60 * 1000;

    return await ctx.db.insert("entitlements", {
      userId: user._id,
      kind: "subscription",
      planSlug: args.planSlug,
      startsAt: now,
      expiresAt,
      source: "mock",
      status: "active",
    });
  },
});

/**
 * Marks the caller's most recent active subscription as canceled. Access
 * continues until `expiresAt`; the nightly cron will flip it to `expired`.
 */
export const cancelSubscription = mutation({
  args: {},
  returns: v.union(v.null(), v.id("entitlements")),
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const active = await ctx.db
      .query("entitlements")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active"),
      )
      .collect();
    const sub = active
      .filter((e) => e.kind === "subscription")
      .sort((a, b) => (b.expiresAt ?? 0) - (a.expiresAt ?? 0))[0];
    if (!sub) return null;
    await ctx.db.patch(sub._id, { status: "canceled" });
    return sub._id;
  },
});

/**
 * Internal, invoked by the nightly cron defined in `convex/crons.ts`.
 * Flips active/canceled entitlements whose `expiresAt < now` to `expired`.
 */
export const expireDue = internalMutation({
  args: {},
  returns: v.object({ expired: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    let expired = 0;
    for (const status of ["active", "canceled"] as const) {
      const rows = await ctx.db
        .query("entitlements")
        .withIndex("by_status_expiresAt", (q) => q.eq("status", status))
        .collect();
      for (const e of rows) {
        if (e.expiresAt && e.expiresAt < now) {
          await ctx.db.patch(e._id, { status: "expired" });
          expired++;
        }
      }
    }
    return { expired };
  },
});

export const listPlans = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("plans"),
      slug: planSlug,
      pricePaise: v.number(),
      periodDays: v.number(),
      label: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const plans = await ctx.db.query("plans").collect();
    const order: Record<string, number> = { weekly: 0, monthly: 1, yearly: 2 };
    return plans
      .map((p) => ({
        _id: p._id,
        slug: p.slug,
        pricePaise: p.pricePaise,
        periodDays: p.periodDays,
        label: p.label,
      }))
      .sort((a, b) => (order[a.slug] ?? 99) - (order[b.slug] ?? 99));
  },
});
