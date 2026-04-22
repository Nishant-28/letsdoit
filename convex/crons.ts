import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Expire entitlements every 24 hours (subscriptions + per-job unlocks).
crons.interval("expire entitlements", { hours: 24 }, internal.entitlements.expireDue, {});

// Auto-archive published jobs older than 30 days (runs daily).
crons.interval("auto archive stale jobs", { hours: 24 }, internal.jobs.autoArchiveStale, {});

export default crons;
