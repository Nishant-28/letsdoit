# Let's Do It

Job-search platform with a paywall: titles are free, every other detail
(company, location, description, apply link) is gated behind either a
per-role unlock ($9) or a weekly / monthly / yearly subscription.

Stack: Bun + React 19 + Tailwind v4 + shadcn/ui + Convex (database,
queries, mutations, real-time).

## Quick start

```bash
bun install
```

In one terminal, start the Convex dev deployment (this generates the
typed API in `convex/_generated/`):

```bash
bunx convex dev
```

In another terminal, start the frontend:

```bash
bun dev
```

Open `http://localhost:3000`. On first load:

1. A `users` row is created automatically for your browser (keyed by a
   random `devId` in localStorage).
2. The Explore page is empty — click **Seed sample data** to insert
   the three demo categories, plans, and roles.
3. To try the admin panel, open `/pricing` and tap the small
   **(Dev) Make me admin** link at the bottom, then go to `/admin`.

## Payments — PayU Hosted Checkout

The app uses PayU Hosted Checkout for both subscriptions and one-off job
unlocks:

1. `api.payments.createOrder` creates a local `paymentOrders` row and
   returns a server-generated PayU form payload plus SHA-512 hash.
2. The frontend submits that payload to PayU using a hidden HTML form.
3. PayU POSTs the customer back to `CONVEX_SITE_URL/payu/return`.
4. `convex/http.ts` reverse-verifies the PayU hash, then settles the
   order server-side and redirects the browser to
   `/payment/return?orderId=<txnid>`.
5. `src/routes/PaymentReturn.tsx` watches the order status reactively.

Required Convex env vars:

- `PAYU_KEY`
- `PAYU_SALT`
- `PAYU_ENV` (`test` or `production`)
- `PUBLIC_APP_URL`
- `CONVEX_SITE_URL`
- `PAYU_CALLBACK_URL` (optional override)
- `PAYU_VERIFY_URL` (optional override)

Sandbox defaults:

- checkout endpoint: `https://test.payu.in/_payment`
- verify endpoint: `https://test.payu.in/merchant/postservice.php?form=2`

## Phase 2 — Real auth

Wiring point: `src/lib/auth.tsx` and `src/lib/devUser.ts`. Replace
`getDevId()` + `getOrCreateDevUser` with a WorkOS / Convex Auth
identity sync. All Convex functions accept `devId` today; rename
to use `ctx.auth.getUserIdentity()` then.

## Scripts

| Script | What it does |
| --- | --- |
| `bun dev` | Vite-style HMR via `bun --hot src/index.ts` |
| `bun start` | Production server |
| `bun run build` | Production bundle to `dist/` |
| `bunx convex dev` | Sync schema + functions to your Convex dev deployment |
