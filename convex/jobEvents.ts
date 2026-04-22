import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { jobEventKind } from "./schema";
import { maybeUser, requireAdmin } from "./helpers";

/**
 * Fire-and-forget pageview ping, called once from `src/routes/JobDetail.tsx`
 * on mount. Authenticated users get stamped; anonymous views are still
 * counted (userId left undefined).
 */
export const recordView = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "published") return null;
    const user = await maybeUser(ctx);
    await ctx.db.insert("jobEvents", {
      jobId: args.jobId,
      userId: user?._id,
      kind: "view",
      at: Date.now(),
    });
    return null;
  },
});

/**
 * Returns `{ views, unlocks, applies }` counts per job id. Admin-only.
 * Used to annotate rows in the admin jobs table.
 */
export const adminCountsByJob = query({
  args: {},
  returns: v.array(
    v.object({
      jobId: v.id("jobs"),
      views: v.number(),
      unlocks: v.number(),
      applies: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("jobEvents").collect();
    const by: Record<
      string,
      { views: number; unlocks: number; applies: number }
    > = {};
    for (const e of events) {
      const key = e.jobId as unknown as string;
      if (!by[key]) by[key] = { views: 0, unlocks: 0, applies: 0 };
      if (e.kind === "view") by[key].views++;
      if (e.kind === "unlock") by[key].unlocks++;
      if (e.kind === "apply") by[key].applies++;
    }
    return Object.entries(by).map(([jobId, counts]) => ({
      jobId: jobId as unknown as import("./_generated/dataModel").Id<"jobs">,
      ...counts,
    }));
  },
});

/**
 * Fire-and-forget click event, called when a user taps on a job card
 * from the explore page (before navigating to the detail page).
 */
export const recordClick = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "published") return null;
    const user = await maybeUser(ctx);
    await ctx.db.insert("jobEvents", {
      jobId: args.jobId,
      userId: user?._id,
      kind: "click",
      at: Date.now(),
    });
    return null;
  },
});

// Re-export the kind validator to keep imports predictable.
export { jobEventKind };

