import { httpRouter } from "convex/server";
import type { GenericActionCtx } from "convex/server";
import { httpAction } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import {
  buildAppPaymentReturnUrl,
  buildPayuResponseHashString,
  buildPayuVerifyHashString,
  derivePayuOutcome,
  extractPayuFailureReason,
  getPayuAdditionalCharges,
  getPayuConfig,
  mergePayuVerifyWithCallback,
  parsePayuFormPayload,
  sha512Hex,
} from "./payu";

type HttpActionCtx = GenericActionCtx<DataModel>;

/** After PayU POSTs to this endpoint, use 303 so the next hop is always GET (PRG). 302 can repeat POST to the app URL on some clients. */
const PAYU_RETURN_REDIRECT_STATUS = 303;

const http = httpRouter();

/**
 * OG meta endpoint for job share links.
 *
 * When a job URL like `/jobs/:id` is shared on WhatsApp/Telegram/LinkedIn,
 * link preview crawlers hit the SPA shell which has generic meta tags.
 * This endpoint can be used as an alternative share URL that returns
 * proper OG meta for a specific job.
 *
 * Usage: Share `https://<convex-deployment>/og/jobs/:id` or configure
 * your reverse proxy to serve this HTML for crawler user agents.
 */
http.route({
  path: "/og/jobs",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("id");

    if (!jobId) {
      return new Response("Missing job id", { status: 400 });
    }

    // Fetch only public fields (title, level, skills) — no sensitive data
    const job = await ctx.runQuery(
      // Use internal to avoid the public API validation on Id type
      // We'll just read the db directly in this httpAction
      // Actually httpActions can't use ctx.db, so we need to call a query
      // Let's use the public getById which already handles access control
      // But we only need title which is always public
      // For OG we'll create a minimal internal query
      // Actually, let's just use a simple approach: query the job table
      // httpAction doesn't have ctx.db, so let's use runQuery
      api.jobs.getById,
      { id: jobId as any },
    );

    const title = job?.title ?? "Job Opportunity";
    const level = job?.level ?? "";
    const skills = job?.skills?.slice(0, 3).join(", ") ?? "";
    const description = `${level ? level.charAt(0).toUpperCase() + level.slice(1) + " · " : ""}${skills || "Explore this opportunity on Let's Do It"}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} — Let's Do It</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)} — Let's Do It" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:site_name" content="Let's Do It" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)} — Let's Do It" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta http-equiv="refresh" content="0;url=/jobs/${escapeHtml(jobId)}" />
</head>
<body>
  <p>Redirecting to <a href="/jobs/${escapeHtml(jobId)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }),
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type PayuVerifyTransaction = {
  mihpayid?: string;
  status?: string;
  unmappedstatus?: string;
  error?: string;
  error_Message?: string;
  field9?: string;
  [k: string]: unknown;
};

type PayuVerifyResponse = {
  status?: number;
  msg?: string;
  transaction_details?: Record<string, PayuVerifyTransaction | undefined>;
};

type PayuVerifyResult = {
  outcome: "paid" | "payment_pending" | "failed" | "canceled" | null;
  providerPaymentId?: string;
  providerStatus?: string;
  providerUnmappedStatus?: string;
  failureReason?: string;
};

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function verifyPayuPayment(
  providerOrderId: string,
): Promise<PayuVerifyResult> {
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
    const text = await response.text();
    throw new Error(
      `PayU verify_payment failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const text = await response.text();
  let parsed: PayuVerifyResponse;
  try {
    parsed = JSON.parse(text) as PayuVerifyResponse;
  } catch {
    throw new Error("PayU verify_payment returned non-JSON data.");
  }

  const detail = parsed.transaction_details?.[providerOrderId];
  const providerPaymentId = asNonEmptyString(detail?.mihpayid);
  const providerStatus = asNonEmptyString(detail?.status);
  const providerUnmappedStatus = asNonEmptyString(detail?.unmappedstatus);

  if (!detail || providerStatus?.toLowerCase() === "not found") {
    return {
      outcome: null,
      providerPaymentId,
      providerStatus,
      providerUnmappedStatus,
      failureReason: asNonEmptyString(parsed.msg) ?? "Transaction not found in PayU.",
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
 * URL-encoded form body or query string: verify reverse hash, merge with
 * verify_payment, then fulfill. Used for PayU POST and for GET when the
 * full form is on the query string.
 */
async function settlePayuFormBody(
  ctx: HttpActionCtx,
  rawBody: string,
  eventType: "PAYU_CALLBACK" | "PAYU_GET_FORM",
): Promise<Response> {
  const payload = parsePayuFormPayload(rawBody);
  const providerOrderId = payload.txnid?.trim();
  if (!providerOrderId) {
    return Response.redirect(
      buildAppPaymentReturnUrl(undefined, { paymentError: "missing_txnid" }),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  const order = await ctx.runQuery(
    internal.paymentOrders.getByProviderOrderId,
    { providerOrderId },
  );
  if (!order) {
    console.warn(`PayU callback: unknown txnid=${providerOrderId}`);
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  if (
    !order.payuKey ||
    !order.payuAmount ||
    !order.payuProductInfo ||
    !order.payuFirstname ||
    !order.payuEmail
  ) {
    console.error(
      `PayU callback: order ${providerOrderId} is missing request snapshot fields.`,
    );
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  const receivedHash = payload.hash?.trim().toLowerCase();
  if (!receivedHash) {
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId, { paymentError: "missing_hash" }),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  const config = getPayuConfig();
  const expectedHash = await sha512Hex(
    buildPayuResponseHashString(
      {
        key: order.payuKey,
        txnid: order.providerOrderId,
        amount: payload.amount?.trim() ?? order.payuAmount,
        productinfo: payload.productinfo?.trim() ?? order.payuProductInfo,
        firstname: payload.firstname?.trim() ?? order.payuFirstname,
        email: payload.email?.trim() ?? order.payuEmail,
        udf1: payload.udf1?.trim() ?? order.payuUdf1,
        udf2: payload.udf2?.trim() ?? order.payuUdf2,
        udf3: payload.udf3?.trim() ?? order.payuUdf3,
        udf4: payload.udf4?.trim() ?? order.payuUdf4,
        udf5: payload.udf5?.trim() ?? order.payuUdf5,
        status: payload.status?.trim() ?? "",
        splitInfo: payload.splitInfo?.trim() || undefined,
        additionalCharges: getPayuAdditionalCharges(payload),
      },
      config.salt,
    ),
  );

  if (expectedHash !== receivedHash) {
    console.warn(`PayU callback: hash mismatch for ${providerOrderId}`);
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId, { paymentError: "invalid_hash" }),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  const callbackOutcome = derivePayuOutcome(
    payload.status,
    payload.unmappedstatus,
  );

  let verified: PayuVerifyResult | null = null;
  try {
    verified = await verifyPayuPayment(providerOrderId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`PayU verify_payment failed for ${providerOrderId}: ${message}`);
  }

  const finalOutcome = mergePayuVerifyWithCallback(callbackOutcome, verified);
  const providerPaymentId =
    verified?.providerPaymentId ?? payload.mihpayid?.trim();
  const providerStatus = verified?.providerStatus ?? payload.status?.trim();
  const providerUnmappedStatus =
    verified?.providerUnmappedStatus ?? payload.unmappedstatus?.trim();
  const failureReason =
    verified?.failureReason ?? extractPayuFailureReason(payload);

  if (order.status === "paid" && finalOutcome !== "paid") {
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  try {
    if (finalOutcome === "paid") {
      await ctx.runMutation(internal.paymentOrders.fulfillPaid, {
        providerOrderId,
        eventType,
        providerPaymentId,
        providerStatus,
        providerUnmappedStatus,
      });
    } else if (finalOutcome === "payment_pending") {
      await ctx.runMutation(internal.paymentOrders.markPaymentPending, {
        orderId: order._id,
        eventType,
        providerPaymentId,
        providerStatus,
        providerUnmappedStatus,
        reason: failureReason,
      });
    } else {
      await ctx.runMutation(internal.paymentOrders.markFailed, {
        orderId: order._id,
        reason: failureReason,
        eventType,
        status: finalOutcome,
        providerPaymentId,
        providerStatus,
        providerUnmappedStatus,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`PayU settlement failed for ${providerOrderId}: ${msg}`);
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId, { paymentError: "fulfillment" }),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  return Response.redirect(
    buildAppPaymentReturnUrl(providerOrderId),
    PAYU_RETURN_REDIRECT_STATUS,
  );
}

/**
 * GET-only fallback: no signed form, but we have a txnid. Settle using
 * verify_payment (same as admin reconcile) so a browser GET to surl still
 * unlocks when the server POST is missing or blocked.
 */
async function settlePayuFromVerifyApiOnly(
  ctx: HttpActionCtx,
  providerOrderId: string,
): Promise<Response> {
  const order = await ctx.runQuery(
    internal.paymentOrders.getByProviderOrderId,
    { providerOrderId },
  );
  if (!order) {
    console.warn(`PayU GET: unknown txnid=${providerOrderId}`);
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  if (order.status === "paid" && order.entitlementId) {
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  let verified: PayuVerifyResult;
  try {
    verified = await verifyPayuPayment(providerOrderId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`PayU verify_payment (GET) failed for ${providerOrderId}: ${message}`);
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  if (verified.outcome === null) {
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  const eventType = "PAYU_GET_VERIFY";
  const failureReason =
    verified.failureReason ?? "PayU could not confirm this payment yet.";

  try {
    if (verified.outcome === "paid") {
      await ctx.runMutation(internal.paymentOrders.fulfillPaid, {
        providerOrderId,
        eventType,
        providerPaymentId: verified.providerPaymentId,
        providerStatus: verified.providerStatus,
        providerUnmappedStatus: verified.providerUnmappedStatus,
      });
    } else if (verified.outcome === "payment_pending") {
      await ctx.runMutation(internal.paymentOrders.markPaymentPending, {
        orderId: order._id,
        eventType,
        providerPaymentId: verified.providerPaymentId,
        providerStatus: verified.providerStatus,
        providerUnmappedStatus: verified.providerUnmappedStatus,
        reason: failureReason,
      });
    } else {
      await ctx.runMutation(internal.paymentOrders.markFailed, {
        orderId: order._id,
        reason: failureReason,
        eventType,
        status: verified.outcome,
        providerPaymentId: verified.providerPaymentId,
        providerStatus: verified.providerStatus,
        providerUnmappedStatus: verified.providerUnmappedStatus,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`PayU GET settlement failed for ${providerOrderId}: ${msg}`);
    return Response.redirect(
      buildAppPaymentReturnUrl(providerOrderId, { paymentError: "fulfillment" }),
      PAYU_RETURN_REDIRECT_STATUS,
    );
  }

  return Response.redirect(
    buildAppPaymentReturnUrl(providerOrderId),
    PAYU_RETURN_REDIRECT_STATUS,
  );
}

http.route({
  path: "/payu/return",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const queryStr = url.search.length > 1 ? url.search.slice(1) : "";
    if (queryStr) {
      const fromQuery = parsePayuFormPayload(queryStr);
      if (fromQuery.hash?.trim() && fromQuery.txnid?.trim()) {
        return settlePayuFormBody(ctx, queryStr, "PAYU_GET_FORM");
      }
    }
    const providerOrderId =
      url.searchParams.get("orderId")?.trim() ||
      url.searchParams.get("order_id")?.trim() ||
      url.searchParams.get("txnid")?.trim() ||
      url.searchParams.get("Txnid")?.trim();
    if (!providerOrderId) {
      return Response.redirect(
        buildAppPaymentReturnUrl(undefined, { paymentError: "missing_txnid" }),
        PAYU_RETURN_REDIRECT_STATUS,
      );
    }
    return settlePayuFromVerifyApiOnly(ctx, providerOrderId);
  }),
});

/**
 * PayU Hosted Checkout callback endpoint. PayU POSTs URL-encoded form
 * fields here after the customer completes, fails, or cancels the
 * hosted checkout flow. We verify the reverse hash, then settle the
 * local order server-side before redirecting the browser back into the
 * app.
 */
http.route({
  path: "/payu/return",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const rawBody = await req.text();
    return settlePayuFormBody(ctx, rawBody, "PAYU_CALLBACK");
  }),
});

export default http;
