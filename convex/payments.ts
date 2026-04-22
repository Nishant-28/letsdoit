"use node";

import { v } from "convex/values";
import { randomUUID } from "node:crypto";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { planSlug } from "./schema";

/**
 * Cashfree Payments — phase-1 integration.
 *
 * Supports two products:
 *   - Subscription (`productType: "subscription"`) — grants access to every
 *     published job for the plan's `periodDays`.
 *   - Single-job unlock (`productType: "job_unlock"`) — grants access to
 *     one job; remains valid until the job is archived.
 *
 * The Node action only creates Cashfree orders and our own
 * `paymentOrders` ledger row. Entitlements are never granted here — the
 * only path that writes `entitlements` in the cashfree source is the
 * signed webhook in `convex/http.ts`. This keeps fulfillment honest: a
 * user can click "checkout" without payment, but cannot unlock content
 * without a verified Cashfree event.
 *
 * Env required (set with `npx convex env set`):
 *   CASHFREE_APP_ID        — Cashfree client id for the PG app
 *   CASHFREE_SECRET_KEY    — Cashfree client secret
 *   CASHFREE_ENV           — "sandbox" (default) or "production"
 *   CASHFREE_API_VERSION   — optional, defaults to "2023-08-01"
 *   CASHFREE_WEBHOOK_SECRET— signing key used for webhook HMAC verification
 *                            (usually the same as CASHFREE_SECRET_KEY)
 *   PUBLIC_APP_URL         — public base URL of the web app, used for
 *                            Cashfree's return_url
 */

type CashfreeOrderResponse = {
  order_id: string;
  payment_session_id: string;
  order_status?: string;
  cf_order_id?: number | string;
  [k: string]: unknown;
};

type CashfreeErrorResponse = {
  code?: string;
  message?: string;
  type?: string;
};

function getCashfreeConfig() {
  const env = (process.env.CASHFREE_ENV ?? "sandbox").toLowerCase();
  const appId = process.env.CASHFREE_APP_ID?.trim();
  const secret = process.env.CASHFREE_SECRET_KEY?.trim();
  const apiVersion = process.env.CASHFREE_API_VERSION?.trim() || "2023-08-01";
  if (!appId || !secret) {
    throw new Error(
      "Cashfree credentials missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY via `npx convex env set`.",
    );
  }
  const mode = env === "production" ? "production" : "sandbox";
  const apiBase =
    mode === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";
  return { mode, appId, secret, apiVersion, apiBase };
}

function getPublicAppUrl(): string {
  const raw = process.env.PUBLIC_APP_URL?.trim();
  if (!raw) {
    throw new Error(
      "PUBLIC_APP_URL is not set. Set it with `npx convex env set PUBLIC_APP_URL https://your-app.example.com`.",
    );
  }
  return raw.replace(/\/$/, "");
}

function getConvexSiteUrl(): string | null {
  const raw = process.env.CONVEX_SITE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function getCashfreeNotifyUrl(): string {
  const explicit = process.env.CASHFREE_NOTIFY_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const site = getConvexSiteUrl();
  if (!site) {
    throw new Error(
      "CASHFREE_NOTIFY_URL is not set and CONVEX_SITE_URL is unavailable. Set CASHFREE_NOTIFY_URL to your Convex site URL plus `/cashfree/webhook`.",
    );
  }
  return `${site.replace(/\/$/, "")}/cashfree/webhook`;
}

function getCashfreeReturnUrls(providerOrderId: string): {
  appReturnUrl: string;
  cashfreeReturnUrl: string;
} {
  const publicUrl = getPublicAppUrl();
  const appReturnUrl = `${publicUrl}/payment/return?orderId=${encodeURIComponent(providerOrderId)}`;

  if (publicUrl.startsWith("https://")) {
    return { appReturnUrl, cashfreeReturnUrl: appReturnUrl };
  }

  const site = getConvexSiteUrl();
  if (!site) {
    throw new Error(
      "Cashfree requires an HTTPS return URL. Set PUBLIC_APP_URL to an https URL or configure CONVEX_SITE_URL so Convex can redirect back to your local app.",
    );
  }

  const wrapperUrl = new URL(`${site}/cashfree/return`);
  wrapperUrl.searchParams.set("orderId", providerOrderId);

  return {
    appReturnUrl,
    cashfreeReturnUrl: wrapperUrl.toString(),
  };
}

/**
 * Create a Cashfree order and return the hosted-checkout URL for the
 * client to redirect into. Idempotent per product: a user with an
 * already-active subscription will not be allowed to stack another
 * concurrent subscription order (access is already granted).
 */
export const createOrder = action({
  args: {
    productType: v.union(
      v.literal("subscription"),
      v.literal("job_unlock"),
    ),
    planSlug: v.optional(planSlug),
    jobId: v.optional(v.id("jobs")),
  },
  returns: v.object({
    orderId: v.string(),
    paymentSessionId: v.string(),
    cashfreeMode: v.union(v.literal("sandbox"), v.literal("production")),
    amountPaise: v.number(),
    currency: v.string(),
  }),
  handler: async (ctx, args) => {
    if (args.productType === "subscription" && !args.planSlug) {
      throw new Error("planSlug is required for subscription purchases.");
    }
    if (args.productType === "job_unlock" && !args.jobId) {
      throw new Error("jobId is required for job unlock purchases.");
    }

    const user = await ctx.runQuery(internal.users.internalGetMe, {});
    if (!user) throw new Error("Sign in to purchase.");
    if (!user.phoneE164) {
      throw new Error(
        "Add your phone number in Profile before checkout — Cashfree requires a contact phone.",
      );
    }

    let amountPaise = 0;
    let currency = "INR";
    let planSlugValue: "weekly" | "monthly" | "quarterly" | "yearly" | undefined;
    let jobIdValue: Id<"jobs"> | undefined;
    let productLabel = "";

    if (args.productType === "subscription") {
      const plan = await ctx.runQuery(internal.entitlements.getPlanBySlug, {
        slug: args.planSlug!,
      });
      if (!plan) throw new Error(`Unknown plan: ${args.planSlug}`);
      amountPaise = plan.pricePaise;
      planSlugValue = args.planSlug;
      productLabel = plan.label;
    } else {
      const job = await ctx.runQuery(internal.jobs.internalGetForPurchase, {
        id: args.jobId!,
      });
      if (!job) throw new Error("Job not found.");
      if (job.status !== "published") {
        throw new Error("This job is no longer available for purchase.");
      }
      amountPaise = job.unlockPricePaise;
      jobIdValue = job._id;
      productLabel = `Unlock: ${job.title}`;
    }

    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new Error("Invalid price for the selected product.");
    }

    const config = getCashfreeConfig();
    const providerOrderId = `ldi_${randomUUID().replace(/-/g, "")}`;
    const { appReturnUrl, cashfreeReturnUrl } =
      getCashfreeReturnUrls(providerOrderId);
    const notifyUrl = getCashfreeNotifyUrl();

    const orderId = await ctx.runMutation(internal.paymentOrders.insertOrder, {
      userId: user._id,
      productType: args.productType,
      planSlug: planSlugValue,
      jobId: jobIdValue,
      amountPaise,
      currency,
      providerOrderId,
      returnUrl: appReturnUrl,
    });

    const phoneDigits = user.phoneE164.replace(/\D/g, "").slice(-10);

    const body = {
      order_id: providerOrderId,
      order_amount: amountPaise / 100,
      order_currency: currency,
      order_note: productLabel,
      customer_details: {
        customer_id: user._id as unknown as string,
        customer_name: user.name || "Customer",
        customer_email: user.email,
        customer_phone: phoneDigits,
      },
      order_meta: {
        return_url: cashfreeReturnUrl,
        notify_url: notifyUrl,
      },
    };

    let response: Response;
    try {
      response = await fetch(`${config.apiBase}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-version": config.apiVersion,
          "x-client-id": config.appId,
          "x-client-secret": config.secret,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.paymentOrders.markCreationFailed, {
        orderId,
        reason: `Network error: ${msg}`,
      });
      throw new Error("Could not reach Cashfree. Please try again.");
    }

    if (!response.ok) {
      const text = await safeText(response);
      await ctx.runMutation(internal.paymentOrders.markCreationFailed, {
        orderId,
        reason: `Cashfree ${response.status}: ${text.slice(0, 500)}`,
      });
      console.error(`Cashfree createOrder failed (${response.status}): ${text}`);
      throw new Error(extractCashfreeError(response.status, text));
    }

    const data = (await response.json()) as CashfreeOrderResponse;
    if (!data.payment_session_id) {
      await ctx.runMutation(internal.paymentOrders.markCreationFailed, {
        orderId,
        reason: "Cashfree response missing payment_session_id",
      });
      throw new Error("Unexpected Cashfree response. Please try again.");
    }

    await ctx.runMutation(internal.paymentOrders.attachSession, {
      orderId,
      paymentSessionId: data.payment_session_id,
    });

    return {
      orderId: providerOrderId,
      paymentSessionId: data.payment_session_id,
      cashfreeMode: config.mode,
      amountPaise,
      currency,
    };
  },
});

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function extractCashfreeError(status: number, raw: string): string {
  try {
    const parsed = JSON.parse(raw) as CashfreeErrorResponse;
    if (parsed.message) {
      return parsed.code
        ? `${parsed.message} (${parsed.code})`
        : parsed.message;
    }
  } catch {
    // Non-JSON provider response; fall through to generic message.
  }
  return `Checkout could not be started (${status}). Please try again.`;
}

/**
 * Admin-only reconciliation action: pull the latest state for a local
 * order from Cashfree (useful if a webhook was missed). Updates the
 * local `paymentOrders` row and grants the entitlement if the server
 * reports the order as paid.
 */
export const adminReconcileOrder = action({
  args: { providerOrderId: v.string() },
  returns: v.object({
    providerOrderId: v.string(),
    status: v.string(),
    action: v.string(),
  }),
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.internalGetMe, {});
    if (!me || me.role !== "admin") {
      throw new Error("Admin access required.");
    }

    const order = await ctx.runQuery(
      internal.paymentOrders.getByProviderOrderId,
      { providerOrderId: args.providerOrderId },
    );
    if (!order) throw new Error("Order not found.");

    const config = getCashfreeConfig();
    const res = await fetch(
      `${config.apiBase}/orders/${encodeURIComponent(args.providerOrderId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-version": config.apiVersion,
          "x-client-id": config.appId,
          "x-client-secret": config.secret,
        },
      },
    );
    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(
        `Cashfree reconcile failed (${res.status}): ${text.slice(0, 300)}`,
      );
    }

    const data = (await res.json()) as { order_status?: string };
    const providerStatus = (data.order_status ?? "").toUpperCase();

    let actionTaken = "no_change";
    if (providerStatus === "PAID") {
      const result = await ctx.runMutation(internal.paymentOrders.fulfillPaid, {
        providerOrderId: args.providerOrderId,
        eventType: "ADMIN_RECONCILE",
      });
      actionTaken = result.alreadyPaid ? "already_paid" : "marked_paid";
    } else if (providerStatus === "EXPIRED" || providerStatus === "CANCELLED") {
      await ctx.runMutation(internal.paymentOrders.markFailed, {
        orderId: order._id,
        reason: `Cashfree status: ${providerStatus}`,
        eventType: "ADMIN_RECONCILE",
        status: providerStatus === "EXPIRED" ? "failed" : "canceled",
      });
      actionTaken = "marked_" + (providerStatus === "EXPIRED" ? "failed" : "canceled");
    }

    return {
      providerOrderId: args.providerOrderId,
      status: providerStatus || "UNKNOWN",
      action: actionTaken,
    };
  },
});
