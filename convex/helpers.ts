import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Returns the caller's `users` row, resolving identity from the WorkOS
 * access token on the request. Throws on unauthenticated callers.
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
    .unique();
  if (!user) {
    throw new Error(
      "User row missing. Call users.syncFromWorkOS on sign-in.",
    );
  }
  return user;
}

export async function maybeUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
    .unique();
}

/**
 * Single operator email allowed in the admin surface. Mirrors
 * `src/lib/admin.ts` on the client. Changing admin access requires
 * touching both files intentionally.
 */
export const ADMIN_EMAIL = "inet.nishant@gmail.com";

/** Gmail and some IdPs vary casing; WorkOS JWT `email` may be missing on some token shapes. */
export function normalizeEmail(email: string | undefined | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function isOperatorEmail(email: string | undefined | null): boolean {
  return normalizeEmail(email) === normalizeEmail(ADMIN_EMAIL);
}

/**
 * Admin authorization is role-based. Admins are created by:
 * - legacy auto-promotion for `ADMIN_EMAIL` on sync, or
 * - onboarding / `claimAdminWithCode` when `ADMIN_SIGNUP_SECRET` matches.
 *
 * We do not trust client-selected role without the server-side secret check.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return user;
}

/**
 * True iff the user currently holds access to `jobId` — either a per-role
 * unlock OR any active subscription. Queries trust the `status` field;
 * a nightly cron flips expired rows (see `convex/crons.ts`).
 */
export async function hasAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  jobId: Id<"jobs">,
): Promise<boolean> {
  const active = await ctx.db
    .query("entitlements")
    .withIndex("by_user_status", (q) =>
      q.eq("userId", userId).eq("status", "active"),
    )
    .collect();

  for (const e of active) {
    if (e.kind === "subscription") return true;
    if (e.kind === "role" && e.jobId === jobId) return true;
  }
  return false;
}

/**
 * Project the public surface of a job, hiding sensitive fields when the
 * caller doesn't hold an entitlement. Company fields are resolved via
 * the `companies` table and only emitted when unlocked.
 */
export async function projectJob(
  ctx: QueryCtx | MutationCtx,
  job: Doc<"jobs">,
  unlocked: boolean,
): Promise<PublicJob> {
  const base = {
    _id: job._id,
    _creationTime: job._creationTime,
    title: job.title,
    level: job.level,
    workMode: job.workMode,
    skills: job.skills,
    tags: job.tags,
    subcategoryIds: job.subcategoryIds,
    categoryId: job.categoryId,
    companyId: job.companyId,
    unlockPricePaise: job.unlockPricePaise,
    postedAt: job.postedAt,
    status: job.status,
  };
  if (!unlocked) return { ...base, unlocked: false };
  const company = await ctx.db.get(job.companyId);
  return {
    ...base,
    unlocked: true,
    companyName: company?.name,
    companyLogoUrl: company?.logoUrl,
    companyWebsite: company?.websiteUrl,
    location: job.location,
    applyUrl: job.applyUrl,
    descriptionMd: job.descriptionMd,
  };
}

export type PublicJobBase = {
  _id: Id<"jobs">;
  _creationTime: number;
  title: Doc<"jobs">["title"];
  level: Doc<"jobs">["level"];
  workMode: Doc<"jobs">["workMode"];
  skills: Doc<"jobs">["skills"];
  tags: Doc<"jobs">["tags"];
  subcategoryIds: Doc<"jobs">["subcategoryIds"];
  categoryId: Doc<"jobs">["categoryId"];
  companyId: Doc<"jobs">["companyId"];
  unlockPricePaise: Doc<"jobs">["unlockPricePaise"];
  postedAt: Doc<"jobs">["postedAt"];
  status: Doc<"jobs">["status"];
};

export type PublicJob =
  | (PublicJobBase & { unlocked: false })
  | (PublicJobBase & {
      unlocked: true;
      companyName: string | undefined;
      companyLogoUrl: string | undefined;
      companyWebsite: string | undefined;
      location: string;
      applyUrl: string;
      descriptionMd: string;
    });

/**
 * Batch entitlement checker — fetches all active entitlements for a user
 * in a single query and returns a lookup-friendly structure.
 * Call once per request, then check `isSubscriber` or `unlockedJobIds.has(jobId)`.
 */
export type UserAccessSet = {
  isSubscriber: boolean;
  unlockedJobIds: Set<Id<"jobs">>;
};

const EMPTY_ACCESS: UserAccessSet = {
  isSubscriber: false,
  unlockedJobIds: new Set(),
};

export async function getUserAccessSet(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users"> | null,
): Promise<UserAccessSet> {
  if (!userId) return EMPTY_ACCESS;

  const active = await ctx.db
    .query("entitlements")
    .withIndex("by_user_status", (q) =>
      q.eq("userId", userId).eq("status", "active"),
    )
    .collect();

  let isSubscriber = false;
  const unlockedJobIds = new Set<Id<"jobs">>();

  for (const e of active) {
    if (e.kind === "subscription") {
      isSubscriber = true;
    } else if (e.kind === "role" && e.jobId) {
      unlockedJobIds.add(e.jobId);
    }
  }

  return { isSubscriber, unlockedJobIds };
}

/**
 * Determine if a user can see the full details of a specific job,
 * given a pre-fetched access set.
 */
export function canAccessJob(
  access: UserAccessSet,
  jobId: Id<"jobs">,
): boolean {
  return access.isSubscriber || access.unlockedJobIds.has(jobId);
}

