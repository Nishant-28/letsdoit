import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import {
  buildAppPaymentReturnUrl,
  buildPayuResponseHashString,
  buildPayuVerifyHashString,
  derivePayuOutcome,
  extractPayuFailureReason,
  getPayuAdditionalCharges,
  getPayuConfig,
  parsePayuFormPayload,
  sha512Hex,
} from "./payu";

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

http.route({
  path: "/payu/return",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const url = new URL(req.url);
    const orderId =
      url.searchParams.get("orderId")?.trim() ||
      url.searchParams.get("txnid")?.trim();
    if (!orderId) {
      return new Response("Missing orderId", { status: 400 });
    }
    return Response.redirect(buildAppPaymentReturnUrl(orderId), 302);
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
    const payload = parsePayuFormPayload(rawBody);
    const providerOrderId = payload.txnid?.trim();
    if (!providerOrderId) {
      return new Response("Missing txnid", { status: 400 });
    }

    const order = await ctx.runQuery(
      internal.paymentOrders.getByProviderOrderId,
      { providerOrderId },
    );
    if (!order) {
      console.warn(`PayU callback: unknown txnid=${providerOrderId}`);
      return Response.redirect(buildAppPaymentReturnUrl(providerOrderId), 302);
    }

    if (
      !order.payuKey ||
      !order.payuAmount ||
      !order.payuProductInfo ||
      !order.payuFirstname ||
      !order.payuEmail
    ) {
      console.error(`PayU callback: order ${providerOrderId} is missing request snapshot fields.`);
      return Response.redirect(buildAppPaymentReturnUrl(providerOrderId), 302);
    }

    const receivedHash = payload.hash?.trim().toLowerCase();
    if (!receivedHash) {
      return new Response("Missing hash", { status: 401 });
    }

    const config = getPayuConfig();
    const expectedHash = await sha512Hex(
      buildPayuResponseHashString(
        {
          key: order.payuKey,
          txnid: order.providerOrderId,
          amount: order.payuAmount,
          productinfo: order.payuProductInfo,
          firstname: order.payuFirstname,
          email: order.payuEmail,
          udf1: order.payuUdf1,
          udf2: order.payuUdf2,
          udf3: order.payuUdf3,
          udf4: order.payuUdf4,
          udf5: order.payuUdf5,
          status: payload.status?.trim() ?? "",
          splitInfo: payload.splitInfo?.trim() || undefined,
          additionalCharges: getPayuAdditionalCharges(payload),
        },
        config.salt,
      ),
    );

    if (expectedHash !== receivedHash) {
      console.warn(`PayU callback: hash mismatch for ${providerOrderId}`);
      return new Response("Invalid hash", { status: 401 });
    }

    const callbackOutcome = derivePayuOutcome(
      payload.status,
      payload.unmappedstatus,
    );

    let verified:
      | {
          outcome: "paid" | "payment_pending" | "failed" | "canceled" | null;
          providerPaymentId?: string;
          providerStatus?: string;
          providerUnmappedStatus?: string;
          failureReason?: string;
        }
      | null = null;

    try {
      verified = await verifyPayuPayment(providerOrderId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`PayU verify_payment failed for ${providerOrderId}: ${message}`);
    }

    const finalOutcome = verified
      ? (verified.outcome ?? "payment_pending")
      : callbackOutcome;
    const providerPaymentId =
      verified?.providerPaymentId ?? payload.mihpayid?.trim();
    const providerStatus = verified?.providerStatus ?? payload.status?.trim();
    const providerUnmappedStatus =
      verified?.providerUnmappedStatus ?? payload.unmappedstatus?.trim();
    const failureReason =
      verified?.failureReason ?? extractPayuFailureReason(payload);

    if (order.status === "paid" && finalOutcome !== "paid") {
      return Response.redirect(buildAppPaymentReturnUrl(providerOrderId), 302);
    }

    try {
      if (finalOutcome === "paid") {
        await ctx.runMutation(internal.paymentOrders.fulfillPaid, {
          providerOrderId,
          eventType: "PAYU_CALLBACK",
          providerPaymentId,
          providerStatus,
          providerUnmappedStatus,
        });
      } else if (finalOutcome === "payment_pending") {
        await ctx.runMutation(internal.paymentOrders.markPaymentPending, {
          orderId: order._id,
          eventType: "PAYU_CALLBACK",
          providerPaymentId,
          providerStatus,
          providerUnmappedStatus,
          reason: failureReason,
        });
      } else {
        await ctx.runMutation(internal.paymentOrders.markFailed, {
          orderId: order._id,
          reason: failureReason,
          eventType: "PAYU_CALLBACK",
          status: finalOutcome,
          providerPaymentId,
          providerStatus,
          providerUnmappedStatus,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`PayU settlement failed for ${providerOrderId}: ${msg}`);
      return new Response("fulfillment error", { status: 500 });
    }

    return Response.redirect(buildAppPaymentReturnUrl(providerOrderId), 302);
  }),
});

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

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
    const text = await response.text();
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

export default http;
