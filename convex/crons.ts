import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "expire entitlements",
  { hourUTC: 2, minuteUTC: 0 },
  internal.entitlements.expireDue,
);

export default crons;
