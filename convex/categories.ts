import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./helpers";

const CATEGORY = v.object({
  _id: v.id("categories"),
  slug: v.string(),
  name: v.string(),
  icon: v.string(),
  description: v.string(),
});

export const list = query({
  args: {},
  returns: v.array(CATEGORY),
  handler: async (ctx) => {
    const cats = await ctx.db.query("categories").collect();
    return cats
      .map((c) => ({
        _id: c._id,
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        description: c.description,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const adminUpsert = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    icon: v.string(),
    description: v.string(),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        icon: args.icon,
        description: args.description,
      });
      return existing._id;
    }
    return await ctx.db.insert("categories", args);
  },
});

export const adminCreate = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    icon: v.string(),
    description: v.string(),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Category slug already exists.");
    return await ctx.db.insert("categories", args);
  },
});

export const adminDelete = mutation({
  args: { id: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const subs = await ctx.db
      .query("subcategories")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .collect();
    if (subs.length) {
      throw new Error(
        "Refusing to delete: category still has subcategories. Delete them first.",
      );
    }
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_category_status", (q) => q.eq("categoryId", args.id))
      .first();
    if (jobs) {
      throw new Error("Refusing to delete: category still has jobs.");
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
