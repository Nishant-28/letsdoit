import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const userRole = v.union(v.literal("user"), v.literal("admin"));

/** Self-declared at onboarding; drives default landing page + future filters. */
export const userIntent = v.union(
  v.literal("candidate"),
  v.literal("recruiter"),
);

export const workMode = v.union(
  v.literal("remote"),
  v.literal("hybrid"),
  v.literal("onsite"),
);

export const jobLevel = v.union(
  v.literal("intern"),
  v.literal("entry"),
  v.literal("junior"),
  v.literal("mid"),
  v.literal("senior"),
  v.literal("staff"),
  v.literal("principal"),
);

export const jobStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

/**
 * `subscription` grants access to every published job while active.
 * `role` is historical naming for per-job unlocks — the `jobId` field on
 * the entitlement is the source of truth, not the literal string.
 */
export const entitlementKind = v.union(
  v.literal("subscription"),
  v.literal("role"),
);

export const entitlementSource = v.union(
  v.literal("mock"),
  v.literal("cashfree"),
  v.literal("admin"),
);

export const entitlementStatus = v.union(
  v.literal("active"),
  v.literal("canceled"),
  v.literal("expired"),
  v.literal("refunded"),
);

export const planSlug = v.union(
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("yearly"),
);

export const paymentProductType = v.union(
  v.literal("subscription"),
  v.literal("job_unlock"),
);

export const paymentOrderStatus = v.union(
  v.literal("created"),
  v.literal("payment_pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("canceled"),
  v.literal("refunded"),
);

export const paymentProvider = v.literal("cashfree");

export const applicationStatus = v.union(
  v.literal("saved"),
  v.literal("applied"),
  v.literal("interviewing"),
  v.literal("offer"),
  v.literal("rejected"),
);

export const jobEventKind = v.union(
  v.literal("view"),
  v.literal("unlock"),
  v.literal("apply"),
  v.literal("click"),
);

export default defineSchema({
  users: defineTable({
    workosId: v.string(),
    email: v.string(),
    name: v.string(),
    role: userRole,
    intent: v.optional(userIntent),
    /** India mobile number in E.164 format: +91XXXXXXXXXX */
    phoneE164: v.optional(v.string()),
    /** True after the user fills the onboarding form on first sign-in. */
    onboardedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_workosId", ["workosId"])
    .index("by_phoneE164", ["phoneE164"]),

  companies: defineTable({
    slug: v.string(),
    name: v.string(),
    logoUrl: v.string(),
    websiteUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    hqLocation: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  categories: defineTable({
    slug: v.string(),
    name: v.string(),
    icon: v.string(),
    description: v.string(),
  }).index("by_slug", ["slug"]),

  subcategories: defineTable({
    slug: v.string(),
    name: v.string(),
    categoryId: v.id("categories"),
    description: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["categoryId"]),

  jobs: defineTable({
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
    postedAt: v.number(),
    status: jobStatus,
    salaryMinPaise: v.optional(v.number()),
    salaryMaxPaise: v.optional(v.number()),
    salaryCurrency: v.optional(v.string()),
  })
    .index("by_status_postedAt", ["status", "postedAt"])
    .index("by_category_status", ["categoryId", "status"])
    .index("by_company", ["companyId"]),

  entitlements: defineTable({
    userId: v.id("users"),
    kind: entitlementKind,
    planSlug: v.optional(planSlug),
    jobId: v.optional(v.id("jobs")),
    startsAt: v.number(),
    expiresAt: v.optional(v.number()),
    source: entitlementSource,
    status: entitlementStatus,
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_user_job", ["userId", "jobId"])
    .index("by_status_expiresAt", ["status", "expiresAt"]),

  applications: defineTable({
    userId: v.id("users"),
    jobId: v.id("jobs"),
    status: applicationStatus,
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_updatedAt", ["userId", "updatedAt"])
    .index("by_user_job", ["userId", "jobId"]),

  plans: defineTable({
    slug: planSlug,
    pricePaise: v.number(),
    periodDays: v.number(),
    label: v.string(),
  }).index("by_slug", ["slug"]),

  /**
   * Durable record of a payment attempt. Created before we hand off to
   * Cashfree checkout; mutated idempotently by webhook events. The
   * entitlement is only granted after a verified `paid` transition, and
   * `entitlementId` is backfilled at that point for reconciliation.
   */
  paymentOrders: defineTable({
    userId: v.id("users"),
    productType: paymentProductType,
    planSlug: v.optional(planSlug),
    jobId: v.optional(v.id("jobs")),
    amountPaise: v.number(),
    currency: v.string(),
    provider: paymentProvider,
    /** Our own opaque order id, also sent to Cashfree as `order_id`. */
    providerOrderId: v.string(),
    /** Cashfree's `payment_session_id`; powers hosted checkout redirect. */
    paymentSessionId: v.optional(v.string()),
    status: paymentOrderStatus,
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    entitlementId: v.optional(v.id("entitlements")),
    /** Last webhook event type (e.g. PAYMENT_SUCCESS_WEBHOOK) for reconciliation. */
    lastWebhookEventType: v.optional(v.string()),
    lastWebhookAt: v.optional(v.number()),
    returnUrl: v.optional(v.string()),
  })
    .index("by_providerOrderId", ["providerOrderId"])
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_status_createdAt", ["status", "createdAt"]),

  jobEvents: defineTable({
    jobId: v.id("jobs"),
    userId: v.optional(v.id("users")),
    kind: jobEventKind,
    at: v.number(),
  })
    .index("by_job_kind", ["jobId", "kind"])
    .index("by_job_at", ["jobId", "at"]),
});
