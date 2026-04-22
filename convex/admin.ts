import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./helpers";
import { jobStatus } from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Operator dashboard metrics for `/admin`. Aggregated on-demand from the
 * core tables; safe for the current data size. When the platform grows
 * meaningfully, swap the `.collect()` calls for materialized counters
 * maintained by mutations (see `skills/schema-builder`).
 *
 * `now` is taken as an argument so we never call `Date.now()` inside a
 * query — otherwise every time-window computation would invalidate the
 * cache on every millisecond. The client passes the current time.
 */
export const adminStats = query({
  args: {
    now: v.optional(v.number()),
  },
  returns: v.object({
    users: v.object({
      total: v.number(),
      newLast30d: v.number(),
      candidates: v.number(),
      recruiters: v.number(),
      onboarded: v.number(),
    }),
    jobs: v.object({
      total: v.number(),
      draft: v.number(),
      published: v.number(),
      archived: v.number(),
      postedLast7d: v.number(),
    }),
    applications: v.object({
      total: v.number(),
      active: v.number(),
      last7d: v.number(),
    }),
    subscriptions: v.object({
      active: v.number(),
      canceled: v.number(),
    }),
    roleUnlocks: v.number(),
    companies: v.number(),
    categories: v.number(),
    activity24h: v.object({
      views: v.number(),
      unlocks: v.number(),
      applies: v.number(),
    }),
    recentJobs: v.array(
      v.object({
        _id: v.id("jobs"),
        title: v.string(),
        companyName: v.string(),
        status: jobStatus,
        postedAt: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Anchor all time windows on a client-supplied `now`, falling back
    // to _creationTime based comparisons otherwise. We still avoid
    // Date.now() inside the query.
    const now = args.now ?? 0;
    const day = now - DAY_MS;
    const week = now - 7 * DAY_MS;
    const month = now - 30 * DAY_MS;

    // Users ----------------------------------------------------------
    const allUsers = await ctx.db.query("users").collect();
    let candidates = 0;
    let recruiters = 0;
    let onboarded = 0;
    let newLast30d = 0;
    for (const u of allUsers) {
      if (u.intent === "candidate") candidates++;
      if (u.intent === "recruiter") recruiters++;
      if (u.onboardedAt !== undefined) onboarded++;
      if (now > 0 && (u.createdAt ?? u._creationTime) >= month) {
        newLast30d++;
      }
    }

    // Jobs -----------------------------------------------------------
    const allJobs = await ctx.db.query("jobs").collect();
    const jobs = { draft: 0, published: 0, archived: 0 };
    let postedLast7d = 0;
    const sortedJobs = allJobs
      .slice()
      .sort((a, b) => b.postedAt - a.postedAt);
    for (const j of allJobs) {
      jobs[j.status]++;
      if (now > 0 && j.postedAt >= week) postedLast7d++;
    }

    const recentJobs = [];
    for (const j of sortedJobs.slice(0, 5)) {
      const company = await ctx.db.get(j.companyId);
      recentJobs.push({
        _id: j._id,
        title: j.title,
        companyName: company?.name ?? "—",
        status: j.status,
        postedAt: j.postedAt,
      });
    }

    // Applications ---------------------------------------------------
    const allApps = await ctx.db.query("applications").collect();
    let appsActive = 0;
    let appsLast7d = 0;
    for (const a of allApps) {
      if (["applied", "interviewing", "offer"].includes(a.status)) {
        appsActive++;
      }
      if (now > 0 && a.updatedAt >= week) appsLast7d++;
    }

    // Entitlements ---------------------------------------------------
    const allEnts = await ctx.db.query("entitlements").collect();
    let subsActive = 0;
    let subsCanceled = 0;
    let roleUnlocks = 0;
    for (const e of allEnts) {
      if (e.kind === "subscription" && e.status === "active") subsActive++;
      if (e.kind === "subscription" && e.status === "canceled") subsCanceled++;
      if (e.kind === "role") roleUnlocks++;
    }

    // Activity (last 24h) -------------------------------------------
    const allEvents = await ctx.db.query("jobEvents").collect();
    const activity24h = { views: 0, unlocks: 0, applies: 0 };
    for (const ev of allEvents) {
      if (now <= 0 || ev.at < day) continue;
      if (ev.kind === "view") activity24h.views++;
      else if (ev.kind === "unlock") activity24h.unlocks++;
      else if (ev.kind === "apply") activity24h.applies++;
    }

    const companies = (await ctx.db.query("companies").collect()).length;
    const categories = (await ctx.db.query("categories").collect()).length;

    return {
      users: {
        total: allUsers.length,
        newLast30d,
        candidates,
        recruiters,
        onboarded,
      },
      jobs: {
        total: allJobs.length,
        draft: jobs.draft,
        published: jobs.published,
        archived: jobs.archived,
        postedLast7d,
      },
      applications: {
        total: allApps.length,
        active: appsActive,
        last7d: appsLast7d,
      },
      subscriptions: { active: subsActive, canceled: subsCanceled },
      roleUnlocks,
      companies,
      categories,
      activity24h,
      recentJobs,
    };
  },
});

export const listUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      name: v.string(),
      role: v.string(),
      intent: v.optional(v.string()),
      onboardedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      intent: u.intent,
      onboardedAt: u.onboardedAt,
      createdAt: u.createdAt,
    })).sort((a, b) => b.createdAt - a.createdAt);
  },
});
