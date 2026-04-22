import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Reconciles two kinds of stale entitlements every hour so paid users
 * don't keep global access for up to a day after their subscription
 * lapses, and job unlocks are dropped for jobs that have been archived
 * outside of the `jobs.adminArchive` path. Inline expiry in
 * `jobs.adminArchive` keeps the common case fast; this cron is the
 * safety net.
 */
crons.interval(
  "expire entitlements",
  { hours: 1 },
  internal.entitlements.expireDue,
  {},
);

crons.interval(
  "auto archive stale jobs",
  { hours: 24 },
  internal.jobs.autoArchiveStale,
  {},
);

export default crons;
