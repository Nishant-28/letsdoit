import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  entitlementKind,
  entitlementSource,
  entitlementStatus,
  planSlug,
} from "./schema";
import { maybeUser, requireAdmin, requireUser } from "./helpers";

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
 *
 * Reconciles two sources of staleness:
 *   1. Subscription/expired-by-time: any active or canceled entitlement
 *      whose `expiresAt < now` flips to `expired`.
 *   2. Job-unlock-by-archive: any active role entitlement whose job is
 *      no longer published. Normally the `jobs.adminArchive` mutation
 *      expires matching unlocks inline; this is belt-and-suspenders for
 *      edge cases (direct patches, seeds, legacy rows).
 */
export const expireDue = internalMutation({
  args: {},
  returns: v.object({
    expiredByTime: v.number(),
    expiredByArchive: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    let expiredByTime = 0;
    let expiredByArchive = 0;

    for (const status of ["active", "canceled"] as const) {
      const rows = await ctx.db
        .query("entitlements")
        .withIndex("by_status_expiresAt", (q) => q.eq("status", status))
        .collect();
      for (const e of rows) {
        if (e.expiresAt && e.expiresAt < now) {
          await ctx.db.patch(e._id, { status: "expired" });
          expiredByTime++;
        }
      }
    }

    const activeRoles = await ctx.db
      .query("entitlements")
      .withIndex("by_status_expiresAt", (q) => q.eq("status", "active"))
      .collect();
    for (const e of activeRoles) {
      if (e.kind !== "role" || !e.jobId) continue;
      const job = await ctx.db.get(e.jobId);
      if (!job || job.status !== "published") {
        await ctx.db.patch(e._id, { status: "expired" });
        expiredByArchive++;
      }
    }

    return { expiredByTime, expiredByArchive };
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
    const order: Record<string, number> = {
      weekly: 0,
      monthly: 1,
      quarterly: 2,
      yearly: 3,
    };
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

/**
 * Internal query used by the Cashfree Node action to look up a plan's
 * price + duration in paise at order-creation time. The action computes
 * the payable amount from this value, never from client input.
 */
export const getPlanBySlug = internalQuery({
  args: { slug: planSlug },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("plans"),
      slug: planSlug,
      pricePaise: v.number(),
      periodDays: v.number(),
      label: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!plan) return null;
    return {
      _id: plan._id,
      slug: plan.slug,
      pricePaise: plan.pricePaise,
      periodDays: plan.periodDays,
      label: plan.label,
    };
  },
});

/**
 * Internal fulfillment mutation invoked by the Cashfree webhook after
 * signature verification. Idempotent: if the matching entitlement
 * already exists for this order, return the existing id without
 * inserting a second row.
 *
 * The entitlement shape depends on the order:
 *   - `subscription`: `kind: subscription`, `planSlug`, `expiresAt` =
 *     now + periodDays.
 *   - `job_unlock`: `kind: role`, `jobId`, no `expiresAt` — the unlock
 *     stays valid until the job itself is archived (see jobs.ts).
 */
export const fulfillOrderEntitlement = internalMutation({
  args: {
    orderId: v.id("paymentOrders"),
  },
  returns: v.union(v.null(), v.id("entitlements")),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    if (order.entitlementId) {
      return order.entitlementId;
    }

    const now = Date.now();

    if (order.productType === "subscription") {
      if (!order.planSlug) {
        throw new Error("Subscription order missing planSlug.");
      }
      const plan = await ctx.db
        .query("plans")
        .withIndex("by_slug", (q) => q.eq("slug", order.planSlug!))
        .unique();
      if (!plan) {
        throw new Error(`Unknown plan: ${order.planSlug}`);
      }
      const expiresAt = now + plan.periodDays * 24 * 60 * 60 * 1000;
      const entId = await ctx.db.insert("entitlements", {
        userId: order.userId,
        kind: "subscription",
        planSlug: order.planSlug,
        startsAt: now,
        expiresAt,
        source: "cashfree",
        status: "active",
      });
      return entId;
    }

    if (order.productType === "job_unlock") {
      if (!order.jobId) {
        throw new Error("Job unlock order missing jobId.");
      }
      const job = await ctx.db.get(order.jobId);
      if (!job) {
        throw new Error("Job not found for unlock.");
      }
      // Idempotency: if user already has an active unlock on this job,
      // reuse it rather than creating a duplicate entitlement row.
      const existingActive = await ctx.db
        .query("entitlements")
        .withIndex("by_user_job", (q) =>
          q.eq("userId", order.userId).eq("jobId", order.jobId!),
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();
      if (existingActive) {
        return existingActive._id;
      }
      const entId = await ctx.db.insert("entitlements", {
        userId: order.userId,
        kind: "role",
        jobId: order.jobId,
        startsAt: now,
        source: "cashfree",
        status: "active",
      });
      await ctx.db.insert("jobEvents", {
        jobId: order.jobId,
        userId: order.userId,
        kind: "unlock",
        at: now,
      });
      return entId;
    }

    return null;
  },
});

/**
 * Internal: mark every active per-job unlock for a given job as expired.
 * Called from `jobs.adminArchive` and `jobs.autoArchiveStale` so access
 * stops when the job itself is no longer live.
 */
export const expireUnlocksForJob = internalMutation({
  args: { jobId: v.id("jobs") },
  returns: v.object({ expired: v.number() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("entitlements")
      .filter((q) => q.eq(q.field("jobId"), args.jobId))
      .collect();
    let expired = 0;
    for (const r of rows) {
      if (r.kind === "role" && r.status === "active") {
        await ctx.db.patch(r._id, { status: "expired" });
        expired++;
      }
    }
    return { expired };
  },
});

/**
 * Admin-only manual grant. Used for support cases (e.g. recovering
 * access after a failed webhook, comps, promotions).
 */
export const adminGrant = mutation({
  args: {
    userId: v.id("users"),
    productType: v.union(
      v.literal("subscription"),
      v.literal("job_unlock"),
    ),
    planSlug: v.optional(planSlug),
    jobId: v.optional(v.id("jobs")),
  },
  returns: v.id("entitlements"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();

    if (args.productType === "subscription") {
      if (!args.planSlug) throw new Error("planSlug is required.");
      const plan = await ctx.db
        .query("plans")
        .withIndex("by_slug", (q) => q.eq("slug", args.planSlug!))
        .unique();
      if (!plan) throw new Error(`Unknown plan: ${args.planSlug}`);
      return await ctx.db.insert("entitlements", {
        userId: args.userId,
        kind: "subscription",
        planSlug: args.planSlug,
        startsAt: now,
        expiresAt: now + plan.periodDays * 24 * 60 * 60 * 1000,
        source: "admin",
        status: "active",
      });
    }

    if (!args.jobId) throw new Error("jobId is required.");
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found.");
    const existing = await ctx.db
      .query("entitlements")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", args.userId).eq("jobId", args.jobId!),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (existing) return existing._id;
    const entId: Id<"entitlements"> = await ctx.db.insert("entitlements", {
      userId: args.userId,
      kind: "role",
      jobId: args.jobId,
      startsAt: now,
      source: "admin",
      status: "active",
    });
    await ctx.db.insert("jobEvents", {
      jobId: args.jobId,
      userId: args.userId,
      kind: "unlock",
      at: now,
    });
    return entId;
  },
});
