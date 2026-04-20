"use node";

/**
 * PHASE 3 STUB — Cashfree Payments integration.
 *
 * When this lands:
 *   - `createOrder` will be a Convex action that calls Cashfree's
 *     /pg/orders endpoint with CASHFREE_APP_ID + CASHFREE_SECRET_KEY
 *     (set in .env.local) and returns a hosted-checkout URL.
 *   - The webhook in `convex/http.ts` will verify the signature and
 *     call an internal mutation that inserts the matching `entitlements`
 *     row, replacing `entitlements.mockUnlockJob` /
 *     `entitlements.mockSubscribe`.
 *   - `UnlockSheet.tsx` will swap its `useMutation(api.entitlements.mockX)`
 *     calls for `useAction(api.payments.createOrder)` + redirect.
 *
 * TODO(phase-3): implement the action, see https://docs.cashfree.com/docs.
 */

export {};
