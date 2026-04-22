import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

// Import api for runQuery reference
import { api } from "./_generated/api";

http.route({
  path: "/cashfree/return",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId")?.trim();
    if (!orderId) {
      return new Response("Missing orderId", { status: 400 });
    }

    const publicUrl = process.env.PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");
    if (!publicUrl) {
      return new Response("PUBLIC_APP_URL is not configured", { status: 500 });
    }

    const redirectUrl = new URL(`${publicUrl}/payment/return`);
    redirectUrl.searchParams.set("orderId", orderId);

    return Response.redirect(redirectUrl.toString(), 302);
  }),
});

/**
 * Cashfree webhook endpoint. Cashfree POSTs payment lifecycle events
 * here — `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`,
 * `PAYMENT_USER_DROPPED_WEBHOOK`, and refund events.
 *
 * Security: every request carries `x-webhook-signature` and
 * `x-webhook-timestamp`. The signature is base64(HMAC-SHA256(timestamp +
 * rawBody)) using the client secret. Any request that does not verify
 * is silently rejected with 401.
 *
 * Idempotency: fulfillment mutations are safe to call multiple times
 * per `providerOrderId`. Cashfree retries failed webhooks for ~72h, so
 * we always return 200 after processing a verified event.
 */
http.route({
  path: "/cashfree/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    if (!signature || !timestamp) {
      return new Response("Missing signature headers", { status: 401 });
    }

    const secret =
      process.env.CASHFREE_WEBHOOK_SECRET?.trim() ||
      process.env.CASHFREE_SECRET_KEY?.trim();
    if (!secret) {
      console.error(
        "CASHFREE_WEBHOOK_SECRET / CASHFREE_SECRET_KEY is not configured.",
      );
      return new Response("Webhook misconfigured", { status: 500 });
    }

    const ok = await verifyCashfreeSignature({
      secret,
      timestamp,
      rawBody,
      receivedSignature: signature,
    });
    if (!ok) {
      return new Response("Invalid signature", { status: 401 });
    }

    let payload: CashfreeWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as CashfreeWebhookPayload;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const eventType = (payload.type || "").toUpperCase();
    const providerOrderId = payload.data?.order?.order_id;
    if (!providerOrderId) {
      return new Response("Missing order_id", { status: 400 });
    }

    const order = await ctx.runQuery(
      internal.paymentOrders.getByProviderOrderId,
      { providerOrderId },
    );
    if (!order) {
      // Unknown order — still return 200 so Cashfree stops retrying an
      // event we can't process. Log for investigation.
      console.warn(
        `Cashfree webhook: unknown order_id=${providerOrderId}, event=${eventType}`,
      );
      return new Response("ok", { status: 200 });
    }

    try {
      if (isSuccessEvent(eventType, payload)) {
        await ctx.runMutation(internal.paymentOrders.fulfillPaid, {
          providerOrderId,
          eventType,
        });
      } else if (isFailureEvent(eventType, payload)) {
        const reason =
          payload.data?.payment?.payment_message ||
          payload.data?.error_details?.error_description ||
          `Cashfree ${eventType}`;
        const derivedStatus =
          eventType.includes("DROPPED") || eventType.includes("CANCEL")
            ? ("canceled" as const)
            : ("failed" as const);
        await ctx.runMutation(internal.paymentOrders.markFailed, {
          orderId: order._id,
          reason: String(reason).slice(0, 500),
          eventType,
          status: derivedStatus,
        });
      } else if (isRefundEvent(eventType, payload)) {
        await ctx.runMutation(internal.paymentOrders.markRefunded, {
          orderId: order._id,
          eventType,
        });
      } else {
        // Unhandled event type — record it but don't fail the webhook.
        console.info(
          `Cashfree webhook: ignoring event ${eventType} for ${providerOrderId}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `Cashfree webhook fulfillment failed for ${providerOrderId}: ${msg}`,
      );
      return new Response("fulfillment error", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  }),
});

/**
 * Verify Cashfree's webhook signature using HMAC-SHA256 via Web Crypto.
 * The default Convex runtime exposes `crypto.subtle`, so we can do this
 * without needing `"use node"`.
 */
async function verifyCashfreeSignature({
  secret,
  timestamp,
  rawBody,
  receivedSignature,
}: {
  secret: string;
  timestamp: string;
  rawBody: string;
  receivedSignature: string;
}): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(timestamp + rawBody),
    );
    const computed = bytesToBase64(new Uint8Array(signed));
    return timingSafeEqual(computed, receivedSignature);
  } catch {
    return false;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

type CashfreeWebhookPayload = {
  type?: string;
  data?: {
    order?: { order_id?: string; order_status?: string };
    payment?: {
      payment_status?: string;
      payment_message?: string;
      cf_payment_id?: string | number;
    };
    refund?: { refund_status?: string; cf_refund_id?: string | number };
    error_details?: {
      error_code?: string;
      error_description?: string;
    };
  };
};

function isSuccessEvent(
  eventType: string,
  payload: CashfreeWebhookPayload,
): boolean {
  if (eventType === "PAYMENT_SUCCESS_WEBHOOK") return true;
  const status = payload.data?.payment?.payment_status?.toUpperCase?.();
  if (
    (eventType === "PAYMENT_STATUS_WEBHOOK" || eventType === "ORDER_PAID_WEBHOOK") &&
    (status === "SUCCESS" || status === "PAID")
  ) {
    return true;
  }
  return false;
}

function isFailureEvent(
  eventType: string,
  payload: CashfreeWebhookPayload,
): boolean {
  if (
    eventType === "PAYMENT_FAILED_WEBHOOK" ||
    eventType === "PAYMENT_USER_DROPPED_WEBHOOK"
  ) {
    return true;
  }
  const status = payload.data?.payment?.payment_status?.toUpperCase?.();
  if (status === "FAILED" || status === "USER_DROPPED" || status === "CANCELLED") {
    return true;
  }
  return false;
}

function isRefundEvent(
  eventType: string,
  _payload: CashfreeWebhookPayload,
): boolean {
  return (
    eventType === "REFUND_STATUS_WEBHOOK" ||
    eventType === "REFUND_SUCCESS_WEBHOOK"
  );
}

export default http;
