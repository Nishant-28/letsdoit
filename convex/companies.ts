import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./helpers";

const COMPANY = v.object({
  _id: v.id("companies"),
  slug: v.string(),
  name: v.string(),
  logoUrl: v.string(),
  websiteUrl: v.optional(v.string()),
  description: v.optional(v.string()),
  hqLocation: v.optional(v.string()),
});

export const list = query({
  args: {},
  returns: v.array(COMPANY),
  handler: async (ctx) => {
    const rows = await ctx.db.query("companies").collect();
    return rows
      .map((c) => ({
        _id: c._id,
        slug: c.slug,
        name: c.name,
        logoUrl: c.logoUrl,
        websiteUrl: c.websiteUrl,
        description: c.description,
        hqLocation: c.hqLocation,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getById = query({
  args: { id: v.id("companies") },
  returns: v.union(v.null(), COMPANY),
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.id);
    if (!c) return null;
    return {
      _id: c._id,
      slug: c.slug,
      name: c.name,
      logoUrl: c.logoUrl,
      websiteUrl: c.websiteUrl,
      description: c.description,
      hqLocation: c.hqLocation,
    };
  },
});

const COMPANY_INPUT = {
  slug: v.string(),
  name: v.string(),
  logoUrl: v.string(),
  websiteUrl: v.optional(v.string()),
  description: v.optional(v.string()),
  hqLocation: v.optional(v.string()),
};

export const adminCreate = mutation({
  args: { ...COMPANY_INPUT },
  returns: v.id("companies"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Company slug already exists.");
    return await ctx.db.insert("companies", args);
  },
});

export const adminUpdate = mutation({
  args: { id: v.id("companies"), ...COMPANY_INPUT },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...patch } = args;
    const clashing = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", patch.slug))
      .unique();
    if (clashing && clashing._id !== id) {
      throw new Error("Another company already uses that slug.");
    }
    await ctx.db.patch(id, patch);
    return null;
  },
});

export const adminDelete = mutation({
  args: { id: v.id("companies") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const attached = await ctx.db
      .query("jobs")
      .withIndex("by_company", (q) => q.eq("companyId", args.id))
      .first();
    if (attached) {
      throw new Error(
        "Refusing to delete: at least one job still references this company.",
      );
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
