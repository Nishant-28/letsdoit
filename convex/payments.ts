"use node";

import { v } from "convex/values";
import { randomUUID } from "node:crypto";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { planSlug } from "./schema";
import {
  buildAppPaymentReturnUrl,
  buildPayuRequestHashString,
  buildPayuVerifyHashString,
  derivePayuOutcome,
  extractPayuFailureReason,
  formatPayuAmount,
  getPayuCallbackUrl,
  getPayuConfig,
  normalizePayuPhone,
  sanitizePayuField,
  sha512Hex,
} from "./payu";

/**
 * PayU Hosted Checkout integration.
 *
 * Supports two products:
 *   - Subscription (`productType: "subscription"`) — grants access to every
 *     published job for the plan's `periodDays`.
 *   - Single-job unlock (`productType: "job_unlock"`) — grants access to
 *     one job; remains valid until the job is archived.
 *
 * The Node action only creates PayU request payloads and our own
 * `paymentOrders` ledger row. Entitlements are never granted here — the
 * only path that writes `entitlements` in the `payu` source is the
 * verified callback / reconcile path in `convex/http.ts`. This keeps
 * fulfillment honest: a
 * user can click "checkout" without payment, but cannot unlock content
 * without a verified provider settlement.
 *
 * Env required (set with `bunx convex env set`):
 *   PAYU_KEY          — PayU merchant key
 *   PAYU_SALT         — PayU merchant salt
 *   PAYU_ENV          — "test" (default) or "production"
 *   PUBLIC_APP_URL    — public base URL of the web app
 *   CONVEX_SITE_URL   — public Convex HTTP site URL used for PayU callbacks
 *   PAYU_CALLBACK_URL — optional override for the PayU callback endpoint
 *   PAYU_VERIFY_URL   — optional override for the Verify Payment API endpoint
 */

type PayuVerifyTransaction = {
  mihpayid?: string;
  status?: string;
  unmappedstatus?: string;
  error?: string;
  error_Message?: string;
  field9?: string;
  bank_ref_num?: string;
  bank_ref_no?: string;
  amount?: string;
  mode?: string;
  [k: string]: unknown;
};

type PayuVerifyResponse = {
  status?: number;
  msg?: string;
  transaction_details?: Record<string, PayuVerifyTransaction | undefined>;
};

const PAYU_FIELDS_VALIDATOR = v.object({
  key: v.string(),
  txnid: v.string(),
  amount: v.string(),
  productinfo: v.string(),
  firstname: v.string(),
  email: v.string(),
  phone: v.string(),
  surl: v.string(),
  furl: v.string(),
  curl: v.optional(v.string()),
  hash: v.string(),
  udf1: v.optional(v.string()),
  udf2: v.optional(v.string()),
  udf3: v.optional(v.string()),
  udf4: v.optional(v.string()),
  udf5: v.optional(v.string()),
});

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** PayU `firstname` — full display name when possible; sensible fallback from email. */
function buildPayuFirstname(user: {
  name?: string | null;
  email?: string | null;
}): string {
  const fullName = (user.name ?? "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (fullName) {
    return sanitizePayuField(fullName, "Customer", 60);
  }
  const email = (user.email ?? "").trim();
  const at = email.indexOf("@");
  if (at > 0) {
    const local = email
      .slice(0, at)
      .replace(/[.+_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (local) {
      return sanitizePayuField(local, "Customer", 60);
    }
  }
  return "Customer";
}

async function verifyPayuPayment(providerOrderId: string) {
  const config = getPayuConfig();
  const command = "verify_payment";
  const verifyHash = await sha512Hex(
    buildPayuVerifyHashString(config.key, command, providerOrderId, config.salt),
  );

  const body = new URLSearchParams({
    key: config.key,
    command,
    var1: providerOrderId,
    hash: verifyHash,
  });

  const response = await fetch(config.verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await safeText(response);
    throw new Error(
      `PayU verify_payment failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const text = await response.text();
  let payload: PayuVerifyResponse;
  try {
    payload = JSON.parse(text) as PayuVerifyResponse;
  } catch {
    throw new Error("PayU verify_payment returned non-JSON data.");
  }

  const detail = payload.transaction_details?.[providerOrderId];
  const providerPaymentId = asNonEmptyString(detail?.mihpayid);
  const providerStatus = asNonEmptyString(detail?.status);
  const providerUnmappedStatus = asNonEmptyString(detail?.unmappedstatus);

  if (!detail || providerStatus?.toLowerCase() === "not found") {
    return {
      outcome: null,
      providerPaymentId,
      providerStatus,
      providerUnmappedStatus,
      failureReason: asNonEmptyString(payload.msg) ?? "Transaction not found in PayU.",
    };
  }

  return {
    outcome: derivePayuOutcome(providerStatus, providerUnmappedStatus),
    providerPaymentId,
    providerStatus,
    providerUnmappedStatus,
    failureReason: extractPayuFailureReason(detail),
  };
}

/**
 * Create a PayU request payload and return the hosted-checkout form
 * fields for the client to POST into PayU Hosted Checkout.
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
    paymentUrl: v.string(),
    method: v.literal("POST"),
    fields: PAYU_FIELDS_VALIDATOR,
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

    let amountPaise = 0;
    let currency = "INR";
    let planSlugValue: "weekly" | "monthly" | "quarterly" | "yearly" | undefined;
    let jobIdValue: Id<"jobs"> | undefined;
    let productInfo = "";

    if (args.productType === "subscription") {
      const plan = await ctx.runQuery(internal.entitlements.getPlanBySlug, {
        slug: args.planSlug!,
      });
      if (!plan) throw new Error(`Unknown plan: ${args.planSlug}`);
      amountPaise = plan.pricePaise;
      planSlugValue = args.planSlug;
      productInfo = `subscription:${plan.slug}`;
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
      productInfo = `job_unlock:${job._id}`;
    }

    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new Error("Invalid price for the selected product.");
    }

    const config = getPayuConfig();
    const providerOrderId = `ldi_${randomUUID().replace(/-/g, "")}`;
    const appReturnUrl = buildAppPaymentReturnUrl(providerOrderId);
    const payuReturnUrl = getPayuCallbackUrl();

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

    const phone = normalizePayuPhone(user.phoneE164);
    if (!phone) {
      await ctx.runMutation(internal.paymentOrders.markCreationFailed, {
        orderId,
        reason: "A valid phone number is required before checkout.",
      });
      throw new Error("Add a valid phone number in Profile before checkout.");
    }

    const fields = {
      key: config.key,
      txnid: providerOrderId,
      amount: formatPayuAmount(amountPaise),
      productinfo: sanitizePayuField(productInfo, "payment", 80),
      firstname: buildPayuFirstname(user),
      email: sanitizePayuField(user.email, "customer@example.com", 100),
      phone,
      surl: payuReturnUrl,
      furl: payuReturnUrl,
      curl: payuReturnUrl,
      udf1: String(orderId),
      udf2: args.productType,
      udf3:
        args.productType === "subscription"
          ? args.planSlug
          : (args.jobId as string | undefined),
      udf4: undefined,
      udf5: undefined,
      hash: "",
    };

    await ctx.runMutation(internal.paymentOrders.attachPayuRequest, {
      orderId,
      payuKey: fields.key,
      payuAmount: fields.amount,
      payuProductInfo: fields.productinfo,
      payuFirstname: fields.firstname,
      payuEmail: fields.email,
      payuPhone: fields.phone,
      payuUdf1: fields.udf1,
      payuUdf2: fields.udf2,
      payuUdf3: fields.udf3,
      payuUdf4: fields.udf4,
      payuUdf5: fields.udf5,
    });

    const hash = await sha512Hex(buildPayuRequestHashString(fields, config.salt));

    return {
      orderId: providerOrderId,
      paymentUrl: config.paymentUrl,
      method: "POST" as const,
      fields: {
        ...fields,
        hash,
      },
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

/**
 * Admin-only reconciliation action: pull the latest state for a local
 * order from PayU (useful if a callback was missed or ambiguous).
 * Updates the local `paymentOrders` row and grants the entitlement if
 * the server reports the order as paid.
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

    const verified = await verifyPayuPayment(args.providerOrderId);

    let actionTaken = "no_change";
    if (verified.outcome === "paid") {
      const result = await ctx.runMutation(internal.paymentOrders.fulfillPaid, {
        providerOrderId: args.providerOrderId,
        eventType: "VERIFY_PAYMENT_API",
        providerPaymentId: verified.providerPaymentId,
        providerStatus: verified.providerStatus,
        providerUnmappedStatus: verified.providerUnmappedStatus,
      });
      actionTaken = result.alreadyPaid ? "already_paid" : "marked_paid";
    } else if (verified.outcome === "payment_pending") {
      await ctx.runMutation(internal.paymentOrders.markPaymentPending, {
        orderId: order._id,
        eventType: "VERIFY_PAYMENT_API",
        providerPaymentId: verified.providerPaymentId,
        providerStatus: verified.providerStatus,
        providerUnmappedStatus: verified.providerUnmappedStatus,
        reason: verified.failureReason,
      });
      actionTaken = "marked_pending";
    } else if (verified.outcome === "failed" || verified.outcome === "canceled") {
      await ctx.runMutation(internal.paymentOrders.markFailed, {
        orderId: order._id,
        reason: verified.failureReason ?? "PayU reported a failed payment.",
        eventType: "VERIFY_PAYMENT_API",
        status: verified.outcome,
        providerPaymentId: verified.providerPaymentId,
        providerStatus: verified.providerStatus,
        providerUnmappedStatus: verified.providerUnmappedStatus,
      });
      actionTaken = `marked_${verified.outcome}`;
    } else if (verified.outcome === null) {
      actionTaken = "verify_inconclusive";
    }

    return {
      providerOrderId: args.providerOrderId,
      status: verified.providerUnmappedStatus ?? verified.providerStatus ?? "UNKNOWN",
      action: actionTaken,
    };
  },
});
