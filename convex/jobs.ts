import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  jobLevel,
  jobStatus,
  workMode,
} from "./schema";
import {
  hasAccess,
  maybeUser,
  projectJob,
  requireAdmin,
  requireUser,
} from "./helpers";

const PUBLIC_JOB_VALIDATOR = v.object({
  _id: v.id("jobs"),
  _creationTime: v.number(),
  title: v.string(),
  level: jobLevel,
  workMode: workMode,
  skills: v.array(v.string()),
  tags: v.array(v.string()),
  subcategoryIds: v.array(v.id("subcategories")),
  categoryId: v.id("categories"),
  companyId: v.id("companies"),
  unlockPricePaise: v.number(),
  postedAt: v.number(),
  status: jobStatus,
  unlocked: v.boolean(),
  companyName: v.optional(v.string()),
  companyLogoUrl: v.optional(v.string()),
  companyWebsite: v.optional(v.string()),
  location: v.optional(v.string()),
  applyUrl: v.optional(v.string()),
  descriptionMd: v.optional(v.string()),
});

const ADMIN_JOB_VALIDATOR = v.object({
  _id: v.id("jobs"),
  _creationTime: v.number(),
  title: v.string(),
  companyId: v.id("companies"),
  companyName: v.string(),
  companyLogoUrl: v.string(),
  location: v.string(),
  workMode: workMode,
  level: jobLevel,
  categoryId: v.id("categories"),
  subcategoryIds: v.array(v.id("subcategories")),
  skills: v.array(v.string()),
  tags: v.array(v.string()),
  unlockPricePaise: v.number(),
  applyUrl: v.string(),
  descriptionMd: v.string(),
  postedAt: v.number(),
  status: jobStatus,
  salaryMinPaise: v.optional(v.number()),
  salaryMaxPaise: v.optional(v.number()),
  salaryCurrency: v.optional(v.string()),
});

export const listPublished = query({
  args: {
    categorySlug: v.optional(v.string()),
    subcategorySlug: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(PUBLIC_JOB_VALIDATOR),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);

    let jobs;
    if (args.categorySlug) {
      const cat = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .unique();
      if (!cat) return [];
      jobs = await ctx.db
        .query("jobs")
        .withIndex("by_category_status", (q) =>
          q.eq("categoryId", cat._id).eq("status", "published"),
        )
        .order("desc")
        .take(limit);
    } else {
      jobs = await ctx.db
        .query("jobs")
        .withIndex("by_status_postedAt", (q) => q.eq("status", "published"))
        .order("desc")
        .take(limit);
    }

    if (args.subcategorySlug) {
      const sub = await ctx.db
        .query("subcategories")
        .withIndex("by_slug", (q) => q.eq("slug", args.subcategorySlug!))
        .unique();
      if (!sub) return [];
      jobs = jobs.filter((j) => j.subcategoryIds.includes(sub._id));
    }

    const search = args.search?.trim().toLowerCase();
    if (search) {
      jobs = jobs.filter((j) =>
        [j.title, ...j.skills, ...j.tags].some((s) =>
          s.toLowerCase().includes(search),
        ),
      );
    }

    const user = await maybeUser(ctx);
    const out = [];
    for (const job of jobs) {
      const unlocked = user ? await hasAccess(ctx, user._id, job._id) : false;
      out.push(await projectJob(ctx, job, unlocked));
    }
    return out;
  },
});

export const getById = query({
  args: { id: v.id("jobs") },
  returns: v.union(v.null(), PUBLIC_JOB_VALIDATOR),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job || job.status !== "published") return null;
    const user = await maybeUser(ctx);
    const unlocked = user ? await hasAccess(ctx, user._id, job._id) : false;
    return await projectJob(ctx, job, unlocked);
  },
});

function toAdminJob(
  j: import("./_generated/dataModel").Doc<"jobs">,
  company: import("./_generated/dataModel").Doc<"companies"> | null,
) {
  return {
    _id: j._id,
    _creationTime: j._creationTime,
    title: j.title,
    companyId: j.companyId,
    companyName: company?.name ?? "",
    companyLogoUrl: company?.logoUrl ?? "",
    location: j.location,
    workMode: j.workMode,
    level: j.level,
    categoryId: j.categoryId,
    subcategoryIds: j.subcategoryIds,
    skills: j.skills,
    tags: j.tags,
    unlockPricePaise: j.unlockPricePaise,
    applyUrl: j.applyUrl,
    descriptionMd: j.descriptionMd,
    postedAt: j.postedAt,
    status: j.status,
    salaryMinPaise: j.salaryMinPaise,
    salaryMaxPaise: j.salaryMaxPaise,
    salaryCurrency: j.salaryCurrency,
  };
}

export const adminList = query({
  args: {},
  returns: v.array(ADMIN_JOB_VALIDATOR),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const jobs = await ctx.db.query("jobs").order("desc").collect();
    const out = [];
    for (const j of jobs) {
      const company = await ctx.db.get(j.companyId);
      out.push(toAdminJob(j, company));
    }
    return out;
  },
});

export const adminGet = query({
  args: { id: v.id("jobs") },
  returns: v.union(v.null(), ADMIN_JOB_VALIDATOR),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const j = await ctx.db.get(args.id);
    if (!j) return null;
    const company = await ctx.db.get(j.companyId);
    return toAdminJob(j, company);
  },
});

const JOB_INPUT = {
  title: v.string(),
  companyId: v.id("companies"),
  location: v.string(),
  workMode: workMode,
  level: jobLevel,
  categoryId: v.id("categories"),
  subcategoryIds: v.array(v.id("subcategories")),
  skills: v.array(v.string()),
  tags: v.array(v.string()),
  unlockPricePaise: v.number(),
  applyUrl: v.string(),
  descriptionMd: v.string(),
  status: jobStatus,
  salaryMinPaise: v.optional(v.number()),
  salaryMaxPaise: v.optional(v.number()),
  salaryCurrency: v.optional(v.string()),
};

export const adminCreate = mutation({
  args: { ...JOB_INPUT },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("jobs", {
      ...args,
      postedAt: Date.now(),
    });
  },
});

export const adminUpdate = mutation({
  args: { id: v.id("jobs"), ...JOB_INPUT },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return null;
  },
});

export const adminArchive = mutation({
  args: { id: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: "archived" });
    return null;
  },
});

export const adminDelete = mutation({
  args: { id: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});

/**
 * Idempotent local seed — populates a small set of categories, a few
 * companies, and sample jobs so the Explore page isn't empty on first run.
 * Safe to call multiple times.
 */
export const seedSampleData = mutation({
  args: {},
  returns: v.object({
    categoriesAdded: v.number(),
    companiesAdded: v.number(),
    jobsAdded: v.number(),
  }),
  handler: async (ctx) => {
    await requireUser(ctx);

    const seedCats: Array<{
      slug: string;
      name: string;
      icon: string;
      description: string;
    }> = [
      {
        slug: "software-engineering",
        name: "Software Engineering",
        icon: "code",
        description: "Backend, Frontend, Fullstack",
      },
      {
        slug: "data-science",
        name: "Data Science",
        icon: "analytics",
        description: "AI/ML, Analytics, Engineering",
      },
      {
        slug: "ui-ux-design",
        name: "UI/UX Design",
        icon: "architecture",
        description: "Product, Research, Visual",
      },
      {
        slug: "hardware",
        name: "Hardware Eng",
        icon: "memory",
        description: "Robotics, Circuits, Systems",
      },
    ];

    let categoriesAdded = 0;
    const catBySlug = new Map<
      string,
      import("./_generated/dataModel").Id<"categories">
    >();
    for (const c of seedCats) {
      const found = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", c.slug))
        .unique();
      if (found) {
        catBySlug.set(c.slug, found._id);
        continue;
      }
      const id = await ctx.db.insert("categories", c);
      catBySlug.set(c.slug, id);
      categoriesAdded++;
    }

    const seedPlans: Array<{
      slug: "weekly" | "monthly" | "yearly";
      pricePaise: number;
      periodDays: number;
      label: string;
    }> = [
      { slug: "weekly", pricePaise: 1900, periodDays: 7, label: "Weekly Pass" },
      { slug: "monthly", pricePaise: 4900, periodDays: 30, label: "Monthly Pass" },
      { slug: "yearly", pricePaise: 29900, periodDays: 365, label: "Yearly Pass" },
    ];
    for (const p of seedPlans) {
      const found = await ctx.db
        .query("plans")
        .withIndex("by_slug", (q) => q.eq("slug", p.slug))
        .unique();
      if (!found) await ctx.db.insert("plans", p);
    }

    const seedCompanies: Array<{
      slug: string;
      name: string;
      logoUrl: string;
    }> = [
      {
        slug: "stellaris-aerospace",
        name: "Stellaris Aerospace",
        logoUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuD4V480Ihpw3YdcPz1jFriePthN6uxkmEv3NMKaEpKTMdSGUist4MyV7aVmIOd2_JT_QVRhkLmkbcgsJGK3ptBwY8GBDLrFbv1AhkAEXun61fsahclCygGkLq08rcApWmuuu3brAS0l1Yb6cR4BcHM6alB_lXL7m5AWLOicFh5O6nxmptwWXrA30dXh4FWcuFVKR7fDdeErFOY8j1azt4olNofEmsRGEMp4iNTLkC5TCcCmVqDRg5UoTErV8Ie9-sdIgg-aO4TO5BM",
      },
      {
        slug: "solstice-energy",
        name: "Solstice Energy",
        logoUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuC01UkN5hO6eVEbheYfUsJ7TzGCDdDKhAoPGTP39dRxYLNmLkS6394KN6GecvvACknO36BpcAbCxd-8SEPkJV8XOQoJHcjI_KClG9crYutluztdi5GKajt_WGCyNJGgUBlq_8zHZ3FcTxenPTbDEWE0RPxYCqQgnNLW4oMnlKxOcw4VtDpR9GsD3bKM3p1aXu0J2HpFO8xrc49LskT6EMO0QuQKh27y1PoozqWhEeFCX1TsdQ3yZWfAdSamTD4GsOedTtohj17r5ZI",
      },
      {
        slug: "orbit-systems",
        name: "Orbit Systems",
        logoUrl:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuBHUoQB2o-avl_ZoPbmynSk5PPcExnTiAUoVXodGROVEJx6c6JqMnghYEnCBPieY0fwIfSZym3gQhj9mg_NbD9yl7CKMn8JQB81wuB_qIvkgJjys0YFCxhaCe71AsUMKEdvYxLQRRyYzGAfnKMJZFxcyKW9TKxSs5GIwd2ZFvTlDY-oCb10jXqvZFacIIeDabpXW50jsR6Krn83NAqkhvCYNbzAHCMivSJ5XLY2J_F9pDbzjuGao58UuiTLhWVXGAgUQ3OeewrQ1es",
      },
    ];

    let companiesAdded = 0;
    const companyBySlug = new Map<
      string,
      import("./_generated/dataModel").Id<"companies">
    >();
    for (const c of seedCompanies) {
      const found = await ctx.db
        .query("companies")
        .withIndex("by_slug", (q) => q.eq("slug", c.slug))
        .unique();
      if (found) {
        companyBySlug.set(c.slug, found._id);
        continue;
      }
      const id = await ctx.db.insert("companies", c);
      companyBySlug.set(c.slug, id);
      companiesAdded++;
    }

    const sampleJobs: Array<{
      title: string;
      companySlug: string;
      location: string;
      workMode: "remote" | "hybrid" | "onsite";
      level: "entry" | "junior" | "mid" | "senior";
      categorySlug: string;
      skills: string[];
      tags: string[];
      applyUrl: string;
      descriptionMd: string;
    }> = [
      {
        title: "Flight Systems Engineer",
        companySlug: "stellaris-aerospace",
        location: "Seattle, WA (Hybrid)",
        workMode: "hybrid",
        level: "entry",
        categorySlug: "software-engineering",
        skills: ["C++", "Avionics"],
        tags: ["new"],
        applyUrl: "https://example.com/careers/flight-systems",
        descriptionMd:
          "Join the avionics team building the next generation of suborbital flight controllers.",
      },
      {
        title: "Data Scientist, Grid Optimization",
        companySlug: "solstice-energy",
        location: "Austin, TX",
        workMode: "onsite",
        level: "junior",
        categorySlug: "data-science",
        skills: ["Python", "Machine Learning"],
        tags: [],
        applyUrl: "https://example.com/careers/grid-ds",
        descriptionMd:
          "Optimize the smart grid using probabilistic forecasting and reinforcement learning.",
      },
      {
        title: "UI/UX Designer, Mission Control",
        companySlug: "orbit-systems",
        location: "Remote",
        workMode: "remote",
        level: "entry",
        categorySlug: "ui-ux-design",
        skills: ["Figma", "Design Systems"],
        tags: [],
        applyUrl: "https://example.com/careers/ux-mission",
        descriptionMd:
          "Design the operator console for a real-time mission control suite used in orbital rendezvous.",
      },
    ];

    let jobsAdded = 0;
    for (const j of sampleJobs) {
      const dupes = await ctx.db
        .query("jobs")
        .filter((q) => q.eq(q.field("title"), j.title))
        .collect();
      if (dupes.length) continue;
      const categoryId = catBySlug.get(j.categorySlug);
      const companyId = companyBySlug.get(j.companySlug);
      if (!categoryId || !companyId) continue;
      await ctx.db.insert("jobs", {
        title: j.title,
        companyId,
        location: j.location,
        workMode: j.workMode,
        level: j.level,
        categoryId,
        subcategoryIds: [],
        skills: j.skills,
        tags: j.tags,
        unlockPricePaise: 900,
        applyUrl: j.applyUrl,
        descriptionMd: j.descriptionMd,
        postedAt: Date.now(),
        status: "published",
      });
      jobsAdded++;
    }

    return { categoriesAdded, companiesAdded, jobsAdded };
  },
});
