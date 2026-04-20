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

## What's where

```
convex/
  schema.ts           tables: users, categories, jobs, entitlements,
                      applications, plans
  helpers.ts          requireUser/requireAdmin/hasAccess + projectJob
                      (the paywall masking lives here)
  users.ts            getOrCreateDevUser, me, makeMeAdmin
  categories.ts       list, adminUpsert
  jobs.ts             listPublished, getById, admin CRUD, seedSampleData
  entitlements.ts     myAccess, mockUnlockJob, mockSubscribe, listPlans
  applications.ts     mine, setStatus, recordApply, remove
  payments.ts         PHASE 2 STUB — Cashfree action
  http.ts             PHASE 2 STUB — Cashfree webhook

src/
  App.tsx             ConvexProvider + AuthProvider + react-router
  lib/
    convex.ts         ConvexReactClient(process.env.CONVEX_URL)
    devUser.ts        localStorage-backed devId (phase 1 identity)
    auth.tsx          AuthProvider + useCurrentUser/useDevId
  components/
    SiteShell.tsx     TopNav + Outlet + Footer
    TopNav.tsx        sticky nav, role-gated Admin link
    Footer.tsx
    Icon.tsx          Material Symbols wrapper
    JobCard.tsx       paywall-aware card (blurs hidden fields)
    PaywallOverlay.tsx
    UnlockSheet.tsx   modal: $9 unlock OR weekly/monthly/yearly sub
  routes/
    Explore.tsx       hero + categories filter + curated list
    JobDetail.tsx     description + Apply or PaywallOverlay
    Pricing.tsx       three plans + per-role explanation
    Tracker.tsx       saved/applied/interviewing/offer/rejected board
    admin/
      AdminLayout.tsx role-gated shell
      AdminJobs.tsx   table view
      AdminJobForm.tsx create/edit form
```

## How the paywall works

The masking is **server-side**. `convex/helpers.ts#projectJob` only
emits `companyName`, `companyLogoUrl`, `location`, `applyUrl` and
`descriptionMd` when the caller holds an entitlement for that exact
job (or any active subscription). Locked rows literally don't ship
those fields over the wire — devtools can't peek.

Entitlements come from `entitlements.mockUnlockJob` /
`entitlements.mockSubscribe` for now. In phase 2 these are deleted
and replaced by an action in `convex/payments.ts` plus a Cashfree
webhook in `convex/http.ts`.

## Phase 2 — Cashfree

Wiring points already in place:

- `convex/payments.ts` — drop the action implementation here.
- `convex/http.ts` — webhook receiver.
- `src/components/UnlockSheet.tsx` — swap
  `useMutation(api.entitlements.mockX)` for
  `useAction(api.payments.createOrder)` + redirect.
- `.env.local` — add `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY`.

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
