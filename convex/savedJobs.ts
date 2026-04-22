import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { maybeUser, requireUser, getUserAccessSet, canAccessJob } from "./helpers";

/**
 * Toggle a job as saved/bookmarked. If already saved, removes it.
 * Returns true if the job is now saved, false if it was unsaved.
 */
export const toggleSaved = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_user_job", (q) =>
        q.eq("userId", user._id).eq("jobId", args.jobId),
      )
      .first();

    if (existing && existing.status === "saved") {
      // Unsave
      await ctx.db.delete(existing._id);
      return false;
    }

    if (existing) {
      // Already has a non-saved status (applied, etc) — don't toggle
      return true;
    }

    // Save it
    await ctx.db.insert("applications", {
      userId: user._id,
      jobId: args.jobId,
      status: "saved",
      updatedAt: Date.now(),
    });
    return true;
  },
});

/**
 * Returns all job IDs the user has saved/bookmarked.
 * Used client-side to show the saved indicator on job cards.
 */
export const mySavedJobIds = query({
  args: {},
  returns: v.array(v.id("jobs")),
  handler: async (ctx) => {
    const user = await maybeUser(ctx);
    if (!user) return [];

    const saved = await ctx.db
      .query("applications")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", user._id))
      .collect();

    return saved
      .filter((a) => a.status === "saved")
      .map((a) => a.jobId);
  },
});

/**
 * Returns saved jobs with preview data for the user's saved page.
 */
export const listSaved = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("applications"),
      jobId: v.id("jobs"),
      savedAt: v.number(),
      jobTitle: v.string(),
      jobLevel: v.string(),
      jobWorkMode: v.string(),
      jobSkills: v.array(v.string()),
      jobUnlocked: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const user = await maybeUser(ctx);
    if (!user) return [];

    const saved = await ctx.db
      .query("applications")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", user._id))
      .collect();

    const access = await getUserAccessSet(ctx, user._id);

    const out = [];
    for (const app of saved) {
      if (app.status !== "saved") continue;
      const job = await ctx.db.get(app.jobId);
      if (!job || job.status !== "published") continue;
      out.push({
        _id: app._id,
        jobId: app.jobId,
        savedAt: app.updatedAt,
        jobTitle: job.title,
        jobLevel: job.level,
        jobWorkMode: job.workMode,
        jobSkills: job.skills,
        jobUnlocked: canAccessJob(access, job._id),
      });
    }

    return out.sort((a, b) => b.savedAt - a.savedAt);
  },
});
