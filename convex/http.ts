import { httpRouter } from "convex/server";

const http = httpRouter();

/**
 * PHASE 3 STUB — Cashfree webhook receiver.
 *
 * Will accept POST /cashfree/webhook, verify the
 * `x-webhook-signature` header against CASHFREE_SECRET_KEY, and call an
 * internal mutation to insert the matching `entitlements` row.
 *
 * TODO(phase-3): implement signature verification + entitlement creation.
 */

export default http;
