import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./helpers";

const SUBCATEGORY = v.object({
  _id: v.id("subcategories"),
  slug: v.string(),
  name: v.string(),
  categoryId: v.id("categories"),
  description: v.optional(v.string()),
});

export const listAll = query({
  args: {},
  returns: v.array(SUBCATEGORY),
  handler: async (ctx) => {
    const rows = await ctx.db.query("subcategories").collect();
    return rows
      .map((s) => ({
        _id: s._id,
        slug: s.slug,
        name: s.name,
        categoryId: s.categoryId,
        description: s.description,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listByCategory = query({
  args: { categoryId: v.id("categories") },
  returns: v.array(SUBCATEGORY),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("subcategories")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
    return rows
      .map((s) => ({
        _id: s._id,
        slug: s.slug,
        name: s.name,
        categoryId: s.categoryId,
        description: s.description,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

const SUBCAT_INPUT = {
  slug: v.string(),
  name: v.string(),
  categoryId: v.id("categories"),
  description: v.optional(v.string()),
};

export const adminCreate = mutation({
  args: { ...SUBCAT_INPUT },
  returns: v.id("subcategories"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("subcategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Subcategory slug already exists.");
    return await ctx.db.insert("subcategories", args);
  },
});

export const adminUpdate = mutation({
  args: { id: v.id("subcategories"), ...SUBCAT_INPUT },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...patch } = args;
    const clashing = await ctx.db
      .query("subcategories")
      .withIndex("by_slug", (q) => q.eq("slug", patch.slug))
      .unique();
    if (clashing && clashing._id !== id) {
      throw new Error("Another subcategory already uses that slug.");
    }
    await ctx.db.patch(id, patch);
    return null;
  },
});

export const adminDelete = mutation({
  args: { id: v.id("subcategories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const attached = await ctx.db
      .query("jobs")
      .filter((q) => q.neq(q.field("status"), "archived"))
      .collect();
    if (attached.some((j) => j.subcategoryIds.includes(args.id))) {
      throw new Error(
        "Refusing to delete: at least one active job still references this subcategory.",
      );
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
