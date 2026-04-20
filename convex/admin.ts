import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./helpers";

/**
 * Dashboard numbers for `/admin`. Cheap, not paginated — OK for a small
 * demo deployment. Replace with aggregated counts once tables grow.
 */
export const adminStats = query({
  args: {},
  returns: v.object({
    jobs: v.object({
      draft: v.number(),
      published: v.number(),
      archived: v.number(),
    }),
    subscriptions: v.object({
      active: v.number(),
      canceled: v.number(),
    }),
    roleUnlocks: v.number(),
    users: v.number(),
    companies: v.number(),
    categories: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allJobs = await ctx.db.query("jobs").collect();
    const jobs = { draft: 0, published: 0, archived: 0 };
    for (const j of allJobs) jobs[j.status]++;

    const allEnts = await ctx.db.query("entitlements").collect();
    let subsActive = 0;
    let subsCanceled = 0;
    let roleUnlocks = 0;
    for (const e of allEnts) {
      if (e.kind === "subscription" && e.status === "active") subsActive++;
      if (e.kind === "subscription" && e.status === "canceled") subsCanceled++;
      if (e.kind === "role") roleUnlocks++;
    }

    const users = (await ctx.db.query("users").collect()).length;
    const companies = (await ctx.db.query("companies").collect()).length;
    const categories = (await ctx.db.query("categories").collect()).length;

    return {
      jobs,
      subscriptions: { active: subsActive, canceled: subsCanceled },
      roleUnlocks,
      users,
      companies,
      categories,
    };
  },
});
