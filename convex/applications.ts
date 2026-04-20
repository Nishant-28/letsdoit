import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { applicationStatus } from "./schema";
import { hasAccess, maybeUser, requireUser } from "./helpers";

const MINE_ROW = v.object({
  _id: v.id("applications"),
  jobId: v.id("jobs"),
  status: applicationStatus,
  notes: v.optional(v.string()),
  updatedAt: v.number(),
  jobTitle: v.string(),
  companyName: v.optional(v.string()),
  location: v.optional(v.string()),
  applyUrl: v.optional(v.string()),
  unlocked: v.boolean(),
});

export const mine = query({
  args: {},
  returns: v.array(MINE_ROW),
  handler: async (ctx) => {
    const user = await maybeUser(ctx);
    if (!user) return [];

    const apps = await ctx.db
      .query("applications")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const out = [];
    for (const a of apps) {
      const job = await ctx.db.get(a.jobId);
      if (!job) continue;
      const unlocked = await hasAccess(ctx, user._id, job._id);
      const company = unlocked ? await ctx.db.get(job.companyId) : null;
      out.push({
        _id: a._id,
        jobId: a.jobId,
        status: a.status,
        notes: a.notes,
        updatedAt: a.updatedAt,
        jobTitle: job.title,
        ...(unlocked
          ? {
              companyName: company?.name,
              location: job.location,
              applyUrl: job.applyUrl,
            }
          : {}),
        unlocked,
      });
    }
    return out;
  },
});

async function upsertApp(
  ctx: import("./_generated/server").MutationCtx,
  userId: import("./_generated/dataModel").Id<"users">,
  jobId: import("./_generated/dataModel").Id<"jobs">,
  status: "saved" | "applied" | "interviewing" | "offer" | "rejected",
  notes?: string,
) {
  const existing = await ctx.db
    .query("applications")
    .withIndex("by_user_job", (q) => q.eq("userId", userId).eq("jobId", jobId))
    .unique();
  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      status,
      notes: notes ?? existing.notes,
      updatedAt: now,
    });
    return existing._id;
  }
  return await ctx.db.insert("applications", {
    userId,
    jobId,
    status,
    notes,
    updatedAt: now,
  });
}

export const setStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    status: applicationStatus,
    notes: v.optional(v.string()),
  },
  returns: v.id("applications"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await upsertApp(ctx, user._id, args.jobId, args.status, args.notes);
  },
});

/**
 * Called from JobDetail when the user clicks Apply on an unlocked job.
 * Refuses if the user doesn't actually hold an entitlement (defense in
 * depth — UI also hides the button).
 */
export const recordApply = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.id("applications"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const access = await hasAccess(ctx, user._id, args.jobId);
    if (!access) throw new Error("No access to this job.");
    await ctx.db.insert("jobEvents", {
      jobId: args.jobId,
      userId: user._id,
      kind: "apply",
      at: Date.now(),
    });
    return await upsertApp(ctx, user._id, args.jobId, "applied");
  },
});

export const remove = mutation({
  args: { id: v.id("applications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const app = await ctx.db.get(args.id);
    if (!app || app.userId !== user._id) throw new Error("Not found.");
    await ctx.db.delete(args.id);
    return null;
  },
});
