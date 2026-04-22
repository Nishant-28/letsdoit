import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  paymentOrderStatus,
  paymentProductType,
  paymentProvider,
  planSlug,
} from "./schema";
import { maybeUser, requireAdmin } from "./helpers";

/**
 * `paymentOrders` is the durable ledger between the user pressing
 * "checkout" and a verified Cashfree webhook. Every mutation here is
 * designed to be idempotent so repeated webhook delivery does not create
 * duplicate entitlements.
 */

const PAYMENT_ORDER_VALIDATOR = v.object({
  _id: v.id("paymentOrders"),
  _creationTime: v.number(),
  userId: v.id("users"),
  productType: paymentProductType,
  planSlug: v.optional(planSlug),
  jobId: v.optional(v.id("jobs")),
  amountPaise: v.number(),
  currency: v.string(),
  provider: paymentProvider,
  providerOrderId: v.string(),
  paymentSessionId: v.optional(v.string()),
  status: paymentOrderStatus,
  createdAt: v.number(),
  paidAt: v.optional(v.number()),
  failedAt: v.optional(v.number()),
  failureReason: v.optional(v.string()),
  entitlementId: v.optional(v.id("entitlements")),
  lastWebhookEventType: v.optional(v.string()),
  lastWebhookAt: v.optional(v.number()),
  returnUrl: v.optional(v.string()),
});

export const getByProviderOrderId = internalQuery({
  args: { providerOrderId: v.string() },
  returns: v.union(v.null(), PAYMENT_ORDER_VALIDATOR),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("paymentOrders")
      .withIndex("by_providerOrderId", (q) =>
        q.eq("providerOrderId", args.providerOrderId),
      )
      .unique();
    return row ?? null;
  },
});

export const insertOrder = internalMutation({
  args: {
    userId: v.id("users"),
    productType: paymentProductType,
    planSlug: v.optional(planSlug),
    jobId: v.optional(v.id("jobs")),
    amountPaise: v.number(),
    currency: v.string(),
    providerOrderId: v.string(),
    returnUrl: v.optional(v.string()),
  },
  returns: v.id("paymentOrders"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("paymentOrders", {
      userId: args.userId,
      productType: args.productType,
      planSlug: args.planSlug,
      jobId: args.jobId,
      amountPaise: args.amountPaise,
      currency: args.currency,
      provider: "cashfree",
      providerOrderId: args.providerOrderId,
      status: "created",
      createdAt: Date.now(),
      returnUrl: args.returnUrl,
    });
  },
});

export const attachSession = internalMutation({
  args: {
    orderId: v.id("paymentOrders"),
    paymentSessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      paymentSessionId: args.paymentSessionId,
      status: "payment_pending",
    });
    return null;
  },
});

export const markCreationFailed = internalMutation({
  args: {
    orderId: v.id("paymentOrders"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      status: "failed",
      failedAt: Date.now(),
      failureReason: args.reason,
    });
    return null;
  },
});

export const markPaid = internalMutation({
  args: {
    orderId: v.id("paymentOrders"),
    entitlementId: v.id("entitlements"),
    eventType: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    await ctx.db.patch(args.orderId, {
      status: "paid",
      paidAt: order.paidAt ?? Date.now(),
      entitlementId: args.entitlementId,
      lastWebhookEventType: args.eventType,
      lastWebhookAt: Date.now(),
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: {
    orderId: v.id("paymentOrders"),
    reason: v.string(),
    eventType: v.string(),
    status: paymentOrderStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      status: args.status,
      failedAt: Date.now(),
      failureReason: args.reason,
      lastWebhookEventType: args.eventType,
      lastWebhookAt: Date.now(),
    });
    return null;
  },
});

/**
 * Core fulfillment step — idempotent. Called by the Cashfree webhook
 * after signature verification, and also by the admin-reconcile action
 * when a webhook was missed. Safe to call more than once per order.
 */
export const fulfillPaid = internalMutation({
  args: {
    providerOrderId: v.string(),
    eventType: v.string(),
  },
  returns: v.object({
    orderId: v.id("paymentOrders"),
    entitlementId: v.union(v.null(), v.id("entitlements")),
    alreadyPaid: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("paymentOrders")
      .withIndex("by_providerOrderId", (q) =>
        q.eq("providerOrderId", args.providerOrderId),
      )
      .unique();
    if (!order) {
      throw new Error(`paymentOrders row not found for ${args.providerOrderId}`);
    }
    if (order.status === "paid" && order.entitlementId) {
      return {
        orderId: order._id,
        entitlementId: order.entitlementId,
        alreadyPaid: true,
      };
    }

    const entitlementId: Id<"entitlements"> | null = await ctx.runMutation(
      internal.entitlements.fulfillOrderEntitlement,
      { orderId: order._id },
    );
    if (!entitlementId) {
      throw new Error("Failed to create entitlement for paid order.");
    }

    await ctx.db.patch(order._id, {
      status: "paid",
      paidAt: order.paidAt ?? Date.now(),
      entitlementId,
      lastWebhookEventType: args.eventType,
      lastWebhookAt: Date.now(),
    });

    return {
      orderId: order._id,
      entitlementId,
      alreadyPaid: false,
    };
  },
});

export const markRefunded = internalMutation({
  args: {
    orderId: v.id("paymentOrders"),
    eventType: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    await ctx.db.patch(args.orderId, {
      status: "refunded",
      lastWebhookEventType: args.eventType,
      lastWebhookAt: Date.now(),
    });
    if (order.entitlementId) {
      const ent = await ctx.db.get(order.entitlementId);
      if (ent && ent.status !== "refunded") {
        await ctx.db.patch(order.entitlementId, { status: "refunded" });
      }
    }
    return null;
  },
});

/**
 * Public view of a single order for the current caller. Powers the
 * post-checkout return page which polls until the webhook settles the
 * order, so the caller is always the buyer.
 */
export const myOrder = query({
  args: { providerOrderId: v.string() },
  returns: v.union(v.null(), PAYMENT_ORDER_VALIDATOR),
  handler: async (ctx, args) => {
    const user = await maybeUser(ctx);
    if (!user) return null;
    const order = await ctx.db
      .query("paymentOrders")
      .withIndex("by_providerOrderId", (q) =>
        q.eq("providerOrderId", args.providerOrderId),
      )
      .unique();
    if (!order) return null;
    if (order.userId !== user._id) return null;
    return order;
  },
});

/**
 * Billing history for the current caller. Orders are returned in
 * reverse chronological order (newest first).
 */
export const myOrders = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("paymentOrders"),
      _creationTime: v.number(),
      productType: paymentProductType,
      planSlug: v.optional(planSlug),
      jobId: v.optional(v.id("jobs")),
      jobTitle: v.optional(v.string()),
      amountPaise: v.number(),
      currency: v.string(),
      status: paymentOrderStatus,
      providerOrderId: v.string(),
      createdAt: v.number(),
      paidAt: v.optional(v.number()),
      failureReason: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await maybeUser(ctx);
    if (!user) return [];
    const limit = Math.min(args.limit ?? 50, 100);
    const rows = await ctx.db
      .query("paymentOrders")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
    const out: Array<{
      _id: Id<"paymentOrders">;
      _creationTime: number;
      productType: "subscription" | "job_unlock";
      planSlug?: "weekly" | "monthly" | "quarterly" | "yearly";
      jobId?: Id<"jobs">;
      jobTitle?: string;
      amountPaise: number;
      currency: string;
      status:
        | "created"
        | "payment_pending"
        | "paid"
        | "failed"
        | "canceled"
        | "refunded";
      providerOrderId: string;
      createdAt: number;
      paidAt?: number;
      failureReason?: string;
    }> = [];
    for (const r of rows) {
      let jobTitle: string | undefined;
      if (r.jobId) {
        const job = await ctx.db.get(r.jobId);
        jobTitle = job?.title;
      }
      out.push({
        _id: r._id,
        _creationTime: r._creationTime,
        productType: r.productType,
        planSlug: r.planSlug,
        jobId: r.jobId,
        jobTitle,
        amountPaise: r.amountPaise,
        currency: r.currency,
        status: r.status,
        providerOrderId: r.providerOrderId,
        createdAt: r.createdAt,
        paidAt: r.paidAt,
        failureReason: r.failureReason,
      });
    }
    return out;
  },
});

/**
 * Admin-only: list the most recent payment orders across all users.
 * Used by the operator console for reconciliation and support triage.
 */
export const adminList = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("paymentOrders"),
      _creationTime: v.number(),
      userId: v.id("users"),
      userEmail: v.optional(v.string()),
      userName: v.optional(v.string()),
      productType: paymentProductType,
      planSlug: v.optional(planSlug),
      jobId: v.optional(v.id("jobs")),
      jobTitle: v.optional(v.string()),
      amountPaise: v.number(),
      currency: v.string(),
      status: paymentOrderStatus,
      providerOrderId: v.string(),
      paymentSessionId: v.optional(v.string()),
      createdAt: v.number(),
      paidAt: v.optional(v.number()),
      failedAt: v.optional(v.number()),
      failureReason: v.optional(v.string()),
      lastWebhookEventType: v.optional(v.string()),
      lastWebhookAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 100, 500);
    const rows = await ctx.db.query("paymentOrders").order("desc").take(limit);
    const out = [];
    for (const r of rows) {
      const user = await ctx.db.get(r.userId);
      let jobTitle: string | undefined;
      if (r.jobId) {
        const job = await ctx.db.get(r.jobId);
        jobTitle = job?.title;
      }
      out.push({
        _id: r._id,
        _creationTime: r._creationTime,
        userId: r.userId,
        userEmail: user?.email,
        userName: user?.name,
        productType: r.productType,
        planSlug: r.planSlug,
        jobId: r.jobId,
        jobTitle,
        amountPaise: r.amountPaise,
        currency: r.currency,
        status: r.status,
        providerOrderId: r.providerOrderId,
        paymentSessionId: r.paymentSessionId,
        createdAt: r.createdAt,
        paidAt: r.paidAt,
        failedAt: r.failedAt,
        failureReason: r.failureReason,
        lastWebhookEventType: r.lastWebhookEventType,
        lastWebhookAt: r.lastWebhookAt,
      });
    }
    return out;
  },
});
