export type PayuEnvironment = "test" | "production";

export type PayuCheckoutFields = {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  curl?: string;
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
};

export type PayuCallbackPayload = Record<string, string | undefined> & {
  mihpayid?: string;
  mode?: string;
  status?: string;
  unmappedstatus?: string;
  key?: string;
  txnid?: string;
  amount?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  phone?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  hash?: string;
  additional_charges?: string;
  additionalCharges?: string;
  splitInfo?: string;
  error?: string;
  error_Message?: string;
  field9?: string;
  bank_ref_num?: string;
  bank_ref_no?: string;
  PG_TYPE?: string;
};

export type PayuOrderOutcome =
  | "paid"
  | "payment_pending"
  | "failed"
  | "canceled";

export type PayuRequestSnapshot = {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
};

const PAYU_TEST_PAYMENT_URL = "https://test.payu.in/_payment";
const PAYU_PRODUCTION_PAYMENT_URL = "https://secure.payu.in/_payment";
const PAYU_TEST_VERIFY_URL =
  "https://test.payu.in/merchant/postservice.php?form=2";
const PAYU_PRODUCTION_VERIFY_URL =
  "https://info.payu.in/merchant/postservice.php?form=2";

export function getPayuConfig() {
  const key = process.env.PAYU_KEY?.trim();
  const salt = process.env.PAYU_SALT?.trim();
  const rawEnv = (process.env.PAYU_ENV ?? "test").trim().toLowerCase();

  if (!key || !salt) {
    throw new Error(
      "PayU credentials missing. Set PAYU_KEY and PAYU_SALT via `bunx convex env set`.",
    );
  }

  const mode: PayuEnvironment =
    rawEnv === "production" ? "production" : "test";

  return {
    key,
    salt,
    mode,
    paymentUrl:
      mode === "production" ? PAYU_PRODUCTION_PAYMENT_URL : PAYU_TEST_PAYMENT_URL,
    verifyUrl:
      process.env.PAYU_VERIFY_URL?.trim() ||
      (mode === "production" ? PAYU_PRODUCTION_VERIFY_URL : PAYU_TEST_VERIFY_URL),
  };
}

export function getPublicAppUrl(): string {
  const raw = process.env.PUBLIC_APP_URL?.trim();
  if (!raw) {
    throw new Error(
      "PUBLIC_APP_URL is not set. Set it with `bunx convex env set PUBLIC_APP_URL https://your-app.example.com`.",
    );
  }
  const normalized = raw.replace(/\/$/, "");
  let hostname: string;
  try {
    hostname = new URL(normalized).hostname.toLowerCase();
  } catch {
    throw new Error(
      "PUBLIC_APP_URL must be a full URL (include https:// or http://), e.g. https://app.example.com",
    );
  }
  if (hostname === "convex.site" || hostname.endsWith(".convex.site")) {
    throw new Error(
      "PUBLIC_APP_URL must be your web app origin, not *.convex.site. Set CONVEX_SITE_URL for PayU callbacks only; PUBLIC_APP_URL is where users land after checkout.",
    );
  }
  return normalized;
}

export function getConvexSiteUrl(): string {
  const raw = process.env.CONVEX_SITE_URL?.trim();
  if (!raw) {
    throw new Error(
      "CONVEX_SITE_URL is not set. Set it with `bunx convex env set CONVEX_SITE_URL https://<deployment>.convex.site`.",
    );
  }
  return raw.replace(/\/$/, "");
}

export function getPayuCallbackUrl(): string {
  const explicit = process.env.PAYU_CALLBACK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${getConvexSiteUrl()}/payu/return`;
}

/**
 * Browser redirect target after PayU callback. `providerOrderId` may be
 * omitted when only showing an error state (e.g. missing txnid).
 * Optional `extra` query params (e.g. `paymentError`) are merged for SPA handling.
 */
export function buildAppPaymentReturnUrl(
  providerOrderId: string | undefined,
  extra?: Record<string, string>,
): string {
  const url = new URL(`${getPublicAppUrl()}/payment/return`);
  if (providerOrderId) {
    url.searchParams.set("orderId", providerOrderId);
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Combine PayU `verify_payment` API outcome with the hosted-checkout POST
 * callback outcome. Reverse-hash verification already authenticated the
 * callback; a null verify outcome means "unknown / not indexed yet" and
 * must not downgrade a successful callback to payment_pending.
 */
export function mergePayuVerifyWithCallback(
  callbackOutcome: PayuOrderOutcome,
  verified: { outcome: PayuOrderOutcome | null } | null,
): PayuOrderOutcome {
  if (!verified) return callbackOutcome;
  const v = verified.outcome;
  if (v === "failed" || v === "canceled") {
    // Do not let a late / disagreeing verify API overrule a
    // reverse-hash-authenticated "paid" response from the callback.
    if (callbackOutcome === "paid") return "paid";
    return v;
  }
  if (v === "paid") return "paid";
  if (v === null) return callbackOutcome;
  return callbackOutcome === "paid" ? "paid" : "payment_pending";
}

export function sanitizePayuField(
  value: string | undefined | null,
  fallback: string,
  maxLength = 60,
): string {
  const normalized = (value ?? "").replace(/\|/g, " ").replace(/\s+/g, " ").trim();
  const safe = normalized || fallback;
  return safe.slice(0, maxLength);
}

export function normalizePayuPhone(value: string | undefined | null): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function formatPayuAmount(amountPaise: number): string {
  return (amountPaise / 100).toFixed(2);
}

export function parsePayuFormPayload(rawBody: string): PayuCallbackPayload {
  const params = new URLSearchParams(rawBody);
  const payload: PayuCallbackPayload = {};
  for (const [key, value] of params.entries()) {
    payload[key] = value;
  }
  return payload;
}

export function buildPayuRequestHashString(
  fields: PayuRequestSnapshot,
  salt: string,
): string {
  return [
    fields.key,
    fields.txnid,
    fields.amount,
    fields.productinfo,
    fields.firstname,
    fields.email,
    fields.udf1 ?? "",
    fields.udf2 ?? "",
    fields.udf3 ?? "",
    fields.udf4 ?? "",
    fields.udf5 ?? "",
    "",
    "",
    "",
    "",
    "",
    salt,
  ].join("|");
}

export function buildPayuResponseHashString(
  fields: PayuRequestSnapshot & {
    status: string;
    splitInfo?: string;
    additionalCharges?: string;
  },
  salt: string,
): string {
  const parts = [salt, fields.status];

  if (fields.splitInfo) {
    parts.push(fields.splitInfo);
  }

  parts.push(
    "",
    "",
    "",
    "",
    "",
    fields.udf5 ?? "",
    fields.udf4 ?? "",
    fields.udf3 ?? "",
    fields.udf2 ?? "",
    fields.udf1 ?? "",
    fields.email,
    fields.firstname,
    fields.productinfo,
    fields.amount,
    fields.txnid,
    fields.key,
  );

  const hashString = parts.join("|");
  return fields.additionalCharges
    ? `${fields.additionalCharges}|${hashString}`
    : hashString;
}

export function buildPayuVerifyHashString(
  key: string,
  command: string,
  var1: string,
  salt: string,
): string {
  return [key, command, var1, salt].join("|");
}

export async function sha512Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-512",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getPayuAdditionalCharges(
  payload: Pick<PayuCallbackPayload, "additional_charges" | "additionalCharges">,
): string | undefined {
  const raw = payload.additional_charges ?? payload.additionalCharges;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function derivePayuOutcome(
  status: string | undefined,
  unmappedStatus: string | undefined,
): PayuOrderOutcome {
  const normalizedStatus = (status ?? "").trim().toLowerCase();
  const normalizedUnmapped = (unmappedStatus ?? "").trim().toLowerCase();

  if (
    normalizedStatus === "success" ||
    normalizedStatus === "captured" ||
    normalizedStatus === "paid"
  ) {
    return "paid";
  }

  if (
    normalizedStatus === "pending" ||
    normalizedStatus === "initiated" ||
    normalizedStatus === "auth"
  ) {
    return "payment_pending";
  }

  if (normalizedStatus === "failure" || normalizedStatus === "failed") {
    if (normalizedUnmapped.includes("cancel")) return "canceled";
    return "failed";
  }

  if (normalizedStatus.includes("cancel")) {
    return "canceled";
  }

  if (
    normalizedUnmapped === "captured" ||
    normalizedUnmapped === "settled" ||
    normalizedUnmapped === "settlement" ||
    normalizedUnmapped === "autopost" ||
    normalizedUnmapped === "success" ||
    normalizedUnmapped === "paid"
  ) {
    return "paid";
  }

  if (
    normalizedUnmapped === "pending" ||
    normalizedUnmapped === "initiated" ||
    normalizedUnmapped === "in progress" ||
    normalizedUnmapped === "in_progress" ||
    normalizedUnmapped === "auth"
  ) {
    return "payment_pending";
  }

  if (
    normalizedUnmapped === "usercancelled" ||
    normalizedUnmapped === "usercancelled by user" ||
    normalizedUnmapped === "cancelled" ||
    normalizedUnmapped === "canceled"
  ) {
    return "canceled";
  }

  if (
    normalizedUnmapped.includes("fail") ||
    normalizedUnmapped.includes("drop") ||
    normalizedUnmapped.includes("bounce")
  ) {
    return "failed";
  }

  return "payment_pending";
}

export function extractPayuFailureReason(payload: {
  error_Message?: string;
  error?: string;
  field9?: string;
  unmappedstatus?: string;
  status?: string;
}): string {
  const candidates = [
    payload.error_Message,
    payload.error,
    payload.field9,
    payload.unmappedstatus,
    payload.status,
  ];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed.slice(0, 500);
  }
  return "PayU reported a failed payment.";
}
