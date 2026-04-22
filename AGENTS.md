# AGENTS.md

## Commands

| Command | Description |
|---------|------------|
| `bun install` | Install dependencies |
| `bun dev` | Start frontend dev server (port 3000) |
| `bun run build` | Production build to `dist/` |
| `bunx convex dev` | Sync Convex backend (runs schema + functions) |

Always run `bunx convex dev` before `bun dev` on first setup.

## Stack

- **Runtime**: Bun (not Node.js)
- **Frontend**: React 19 + Vite-style HMR via `bun --hot`
- **Styling**: Tailwind v4 + shadcn/ui components
- **Backend**: Convex (database, queries, mutations, real-time)
- **Auth**: WorkOS AuthKit via Convex

## Project Structure

```
convex/           # Backend functions
  schema.ts       # Database tables
  auth.config.ts  # WorkOS JWT validation
  helpers.ts     # requireUser, requireAdmin, projectJob (paywall logic)
src/
  lib/          # Utilities (convex.ts, payu.ts, auth.tsx)
  components/    # UI components
  routes/        # Page components (react-router)
```

## Paywall Architecture

The paywall is **server-side only**. `convex/helpers.ts#projectJob` filters sensitive fields (`companyName`, `location`, `applyUrl`, `descriptionMd`) before shipping to client. Never client-side gate — that's insecure.

## Auth Flow

1. User clicks Login/Signup → redirects to WorkOS
2. WorkOS redirects to `/callback` → `syncFromWorkOS` creates/updates `users` table
3. If not onboarded → redirect to `/onboarding`
4. Otherwise → `/app`

Admin auto-promotion: `inet.nishant@gmail.com` → admin role.

## Environment Variables

Required in `.env.local`:
- `CONVEX_URL`
- `WORKOS_CLIENT_ID` (server)
- `WORKOS_API_KEY` (server)
- `VITE_WORKOS_CLIENT_ID` (client)
- `VITE_WORKOS_REDIRECT_URI`

For payments (if enabled):
- `PAYU_KEY`, `PAYU_SALT`, `PAYU_ENV`, `PUBLIC_APP_URL`, `CONVEX_SITE_URL`

## TypeScript

- `tsconfig.json`: strict mode enabled
- Paths: `@/*` maps to `./src/*`
- No `noEmit` — Bun handles transpilation

## Key Convex Guidelines

Read `convex/_generated/ai/guidelines.md` first for Convex API patterns.

## Existing Documentation

- `README.md`: Project overview and paywall explanation
- `AUTH_SETUP.md`: Auth implementation details (redundant with README)
- `MIGRATION_GUIDE.md`: Phone field migration (may be stale)
- `WORKOS_CONVEX.md`: External WorkOS docs copy (delete candidate)