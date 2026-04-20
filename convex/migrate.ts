import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "company";
}

/**
 * Phase-A migration: for every `jobs` row that still carries the legacy
 * embedded `companyName` + `companyLogoUrl` fields, create or reuse a
 * `companies` row (keyed by slug-of-name) and patch the job with
 * `companyId` + `subcategoryIds: []`. Safe to run multiple times.
 *
 * Once every job has `companyId` we can tighten the schema validator back
 * to required and drop the legacy columns.
 */
export const embeddedCompaniesToTable = internalMutation({
  args: {},
  returns: v.object({
    jobsScanned: v.number(),
    jobsMigrated: v.number(),
    companiesCreated: v.number(),
  }),
  handler: async (ctx) => {
    const jobs = await ctx.db.query("jobs").collect();
    const slugToId = new Map<string, Id<"companies">>();
    let migrated = 0;
    let companiesCreated = 0;

    for (const job of jobs as Array<
      Doc<"jobs"> & {
        companyName?: string;
        companyLogoUrl?: string;
      }
    >) {
      if (job.companyId) continue;
      const name = job.companyName ?? "Unknown Company";
      const logoUrl = job.companyLogoUrl ?? "";
      const slug = slugify(name);

      let companyId = slugToId.get(slug);
      if (!companyId) {
        const existing = await ctx.db
          .query("companies")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .unique();
        if (existing) {
          companyId = existing._id;
        } else {
          companyId = await ctx.db.insert("companies", {
            slug,
            name,
            logoUrl,
          });
          companiesCreated += 1;
        }
        slugToId.set(slug, companyId);
      }

      await ctx.db.patch(job._id, {
        companyId,
        subcategoryIds: job.subcategoryIds ?? [],
        // Legacy fields are left in place during Phase A; a follow-up
        // deploy tightens the schema and these columns drop out naturally.
      });
      migrated += 1;
    }

    return {
      jobsScanned: jobs.length,
      jobsMigrated: migrated,
      companiesCreated,
    };
  },
});

/**
 * Phase-B cleanup: strip the legacy embedded fields from any job rows
 * that still have them. Run after the Phase-A migration and before
 * tightening the schema back to required-`companyId`.
 */
/**
 * Phase-A migration: delete legacy dev-only `users` rows that never had
 * a WorkOS identity attached. These were created by the pre-auth shim
 * and have no real counterpart; entitlements/applications attached to
 * them are also removed to keep referential integrity. Safe to run
 * multiple times; a no-op once the devId column is gone.
 */
export const dropLegacyUsers = internalMutation({
  args: {},
  returns: v.object({
    usersDeleted: v.number(),
    entitlementsDeleted: v.number(),
    applicationsDeleted: v.number(),
  }),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let usersDeleted = 0;
    let entitlementsDeleted = 0;
    let applicationsDeleted = 0;

    for (const user of users as Array<Doc<"users"> & { devId?: string }>) {
      if (user.workosId) continue;

      const ents = await ctx.db
        .query("entitlements")
        .withIndex("by_user_status", (q) => q.eq("userId", user._id))
        .collect();
      for (const e of ents) {
        await ctx.db.delete(e._id);
        entitlementsDeleted += 1;
      }

      const apps = await ctx.db
        .query("applications")
        .withIndex("by_user_updatedAt", (q) => q.eq("userId", user._id))
        .collect();
      for (const a of apps) {
        await ctx.db.delete(a._id);
        applicationsDeleted += 1;
      }

      await ctx.db.delete(user._id);
      usersDeleted += 1;
    }

    return { usersDeleted, entitlementsDeleted, applicationsDeleted };
  },
});

export const dropLegacyCompanyFields = internalMutation({
  args: {},
  returns: v.object({ cleaned: v.number() }),
  handler: async (ctx) => {
    const jobs = await ctx.db.query("jobs").collect();
    let cleaned = 0;
    for (const job of jobs as Array<
      Doc<"jobs"> & {
        companyName?: string;
        companyLogoUrl?: string;
      }
    >) {
      if (job.companyName === undefined && job.companyLogoUrl === undefined) {
        continue;
      }
      // Cast through unknown because the strict schema no longer lists
      // these fields; the patch API still accepts `undefined` to clear
      // leftover columns from legacy rows during migration.
      await ctx.db.patch(job._id, {
        companyName: undefined,
        companyLogoUrl: undefined,
      } as unknown as Partial<Doc<"jobs">>);
      cleaned += 1;
    }
    return { cleaned };
  },
});
