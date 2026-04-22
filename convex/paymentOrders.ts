import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  paymentOrderStatus,
  paymentProductType,
  paymentProvider,
  planSlug,
} from "./schema";
import { maybeUser, requireAdmin } from "./helpers";

/**
 * `paymentOrders` is the durable ledger between the user pressing
 * "checkout" and a verified PayU settlement. Every mutation here is
 * designed to be idempotent so repeated callbacks or reconcile attempts
 * do not create duplicate entitlements.
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
  providerPaymentId: v.optional(v.string()),
  providerStatus: v.optional(v.string()),
  providerUnmappedStatus: v.optional(v.string()),
  payuKey: v.optional(v.string()),
  payuAmount: v.optional(v.string()),
  payuProductInfo: v.optional(v.string()),
  payuFirstname: v.optional(v.string()),
  payuEmail: v.optional(v.string()),
  payuPhone: v.optional(v.string()),
  payuUdf1: v.optional(v.string()),
  payuUdf2: v.optional(v.string()),
  payuUdf3: v.optional(v.string()),
  payuUdf4: v.optional(v.string()),
  payuUdf5: v.optional(v.string()),
  status: paymentOrderStatus,
  createdAt: v.number(),
  paidAt: v.optional(v.number()),
  failedAt: v.optional(v.number()),
  failureReason: v.optional(v.string()),
  entitlementId: v.optional(v.id("entitlements")),
  lastProviderEvent: v.optional(v.string()),
  lastProviderAt: v.optional(v.number()),
  returnUrl: v.optional(v.string()),
});

const PAYMENT_ORDER_PUBLIC_VALIDATOR = v.object({
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
  providerPaymentId: v.optional(v.string()),
  providerStatus: v.optional(v.string()),
  providerUnmappedStatus: v.optional(v.string()),
  status: paymentOrderStatus,
  createdAt: v.number(),
  paidAt: v.optional(v.number()),
  failedAt: v.optional(v.number()),
  failureReason: v.optional(v.string()),
  entitlementId: v.optional(v.id("entitlements")),
  lastProviderEvent: v.optional(v.string()),
  lastProviderAt: v.optional(v.number()),
  returnUrl: v.optional(v.string()),
});

function projectPublicOrder(order: Doc<"paymentOrders">) {
  return {
    _id: order._id,
    _creationTime: order._creationTime,
    userId: order.userId,
    productType: order.productType,
    planSlug: order.planSlug,
    jobId: order.jobId,
    amountPaise: order.amountPaise,
    currency: order.currency,
    provider: order.provider,
    providerOrderId: order.providerOrderId,
    providerPaymentId: order.providerPaymentId,
    providerStatus: order.providerStatus,
    providerUnmappedStatus: order.providerUnmappedStatus,
    status: order.status,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    failedAt: order.failedAt,
    failureReason: order.failureReason,
    entitlementId: order.entitlementId,
    lastProviderEvent: order.lastProviderEvent,
    lastProviderAt: order.lastProviderAt,
    returnUrl: order.returnUrl,
  };
}

function withProviderFields(
  patch: Partial<Doc<"paymentOrders">>,
  fields: {
    providerPaymentId?: string;
    providerStatus?: string;
    providerUnmappedStatus?: string;
  },
): Partial<Doc<"paymentOrders">> {
  if (fields.providerPaymentId !== undefined) {
    patch.providerPaymentId = fields.providerPaymentId;
  }
  if (fields.providerStatus !== undefined) {
    patch.providerStatus = fields.providerStatus;
  }
  if (fields.providerUnmappedStatus !== undefined) {
    patch.providerUnmappedStatus = fields.providerUnmappedStatus;
  }
  return patch;
}

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
      provider: "payu",
      providerOrderId: args.providerOrderId,
      status: "created",
      createdAt: Date.now(),
      returnUrl: args.returnUrl,
    });
  },
});

export const attachPayuRequest = internalMutation({
  args: {
    orderId: v.id("paymentOrders"),
    payuKey: v.string(),
    payuAmount: v.string(),
    payuProductInfo: v.string(),
    payuFirstname: v.string(),
    payuEmail: v.string(),
    payuPhone: v.string(),
    payuUdf1: v.optional(v.string()),
    payuUdf2: v.optional(v.string()),
    payuUdf3: v.optional(v.string()),
    payuUdf4: v.optional(v.string()),
    payuUdf5: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Partial<Doc<"paymentOrders">> = {
      payuKey: args.payuKey,
      payuAmount: args.payuAmount,
      payuProductInfo: args.payuProductInfo,
      payuFirstname: args.payuFirstname,
      payuEmail: args.payuEmail,
      payuPhone: args.payuPhone,
    };
    if (args.payuUdf1 !== undefined) patch.payuUdf1 = args.payuUdf1;
    if (args.payuUdf2 !== undefined) patch.payuUdf2 = args.payuUdf2;
    if (args.payuUdf3 !== undefined) patch.payuUdf3 = args.payuUdf3;
    if (args.payuUdf4 !== undefined) patch.payuUdf4 = args.payuUdf4;
    if (args.payuUdf5 !== undefined) patch.payuUdf5 = args.payuUdf5;
    await ctx.db.patch(args.orderId, patch);
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
      lastProviderEvent: "CREATE_ORDER",
      lastProviderAt: Date.now(),
    });
    return null;
  },
});

export const markPaymentPending = internalMutation({
  args: {
    orderId: v.id("paymentOrders"),
    eventType: v.string(),
    providerPaymentId: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
    providerUnmappedStatus: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const patch = withProviderFields(
      {
        lastProviderEvent: args.eventType,
        lastProviderAt: Date.now(),
      },
      args,
    );

    if (order.status === "paid" || order.status === "refunded") {
      await ctx.db.patch(args.orderId, patch);
      return null;
    }

    patch.status = "payment_pending";
    patch.failureReason = args.reason ?? "";
    await ctx.db.patch(args.orderId, patch);
    return null;
  },
});

export const markFailed = internalMutation({
  args: {
    orderId: v.id("paymentOrders"),
    reason: v.string(),
    eventType: v.string(),
    status: paymentOrderStatus,
    providerPaymentId: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
    providerUnmappedStatus: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const patch = withProviderFields(
      {
        lastProviderEvent: args.eventType,
        lastProviderAt: Date.now(),
      },
      args,
    );

    if (order.status === "paid" || order.status === "refunded") {
      await ctx.db.patch(args.orderId, patch);
      return null;
    }

    patch.status = args.status;
    patch.failedAt = Date.now();
    patch.failureReason = args.reason;
    await ctx.db.patch(args.orderId, patch);
    return null;
  },
});

/**
 * Core fulfillment step — idempotent. Called by the PayU callback
 * handler after hash verification, and also by the admin-reconcile
 * action when a callback was missed or ambiguous. Safe to call more than
 * once per order.
 */
export const fulfillPaid = internalMutation({
  args: {
    providerOrderId: v.string(),
    eventType: v.string(),
    providerPaymentId: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
    providerUnmappedStatus: v.optional(v.string()),
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
      await ctx.db.patch(
        order._id,
        withProviderFields(
          {
            lastProviderEvent: args.eventType,
            lastProviderAt: Date.now(),
          },
          args,
        ),
      );
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

    await ctx.db.patch(
      order._id,
      withProviderFields(
        {
          status: "paid",
          paidAt: order.paidAt ?? Date.now(),
          entitlementId,
          failureReason: "",
          lastProviderEvent: args.eventType,
          lastProviderAt: Date.now(),
        },
        args,
      ),
    );

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
    providerPaymentId: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
    providerUnmappedStatus: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    await ctx.db.patch(
      args.orderId,
      withProviderFields(
        {
          status: "refunded",
          lastProviderEvent: args.eventType,
          lastProviderAt: Date.now(),
        },
        args,
      ),
    );
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
 * post-checkout return page which watches the order until the callback
 * or reconciliation path settles it.
 */
export const myOrder = query({
  args: { providerOrderId: v.string() },
  returns: v.union(v.null(), PAYMENT_ORDER_PUBLIC_VALIDATOR),
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
    return projectPublicOrder(order);
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
    for (const row of rows) {
      let jobTitle: string | undefined;
      if (row.jobId) {
        const job = await ctx.db.get(row.jobId);
        jobTitle = job?.title;
      }
      out.push({
        _id: row._id,
        _creationTime: row._creationTime,
        productType: row.productType,
        planSlug: row.planSlug,
        jobId: row.jobId,
        jobTitle,
        amountPaise: row.amountPaise,
        currency: row.currency,
        status: row.status,
        providerOrderId: row.providerOrderId,
        createdAt: row.createdAt,
        paidAt: row.paidAt,
        failureReason: row.failureReason,
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
      providerPaymentId: v.optional(v.string()),
      providerStatus: v.optional(v.string()),
      providerUnmappedStatus: v.optional(v.string()),
      createdAt: v.number(),
      paidAt: v.optional(v.number()),
      failedAt: v.optional(v.number()),
      failureReason: v.optional(v.string()),
      lastProviderEvent: v.optional(v.string()),
      lastProviderAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 100, 500);
    const rows = await ctx.db.query("paymentOrders").order("desc").take(limit);
    const out = [];
    for (const row of rows) {
      const user = await ctx.db.get(row.userId);
      let jobTitle: string | undefined;
      if (row.jobId) {
        const job = await ctx.db.get(row.jobId);
        jobTitle = job?.title;
      }
      out.push({
        _id: row._id,
        _creationTime: row._creationTime,
        userId: row.userId,
        userEmail: user?.email,
        userName: user?.name,
        productType: row.productType,
        planSlug: row.planSlug,
        jobId: row.jobId,
        jobTitle,
        amountPaise: row.amountPaise,
        currency: row.currency,
        status: row.status,
        providerOrderId: row.providerOrderId,
        providerPaymentId: row.providerPaymentId,
        providerStatus: row.providerStatus,
        providerUnmappedStatus: row.providerUnmappedStatus,
        createdAt: row.createdAt,
        paidAt: row.paidAt,
        failedAt: row.failedAt,
        failureReason: row.failureReason,
        lastProviderEvent: row.lastProviderEvent,
        lastProviderAt: row.lastProviderAt,
      });
    }
    return out;
  },
});
