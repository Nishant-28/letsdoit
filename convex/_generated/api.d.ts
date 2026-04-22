/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as applications from "../applications.js";
import type * as categories from "../categories.js";
import type * as companies from "../companies.js";
import type * as crons from "../crons.js";
import type * as entitlements from "../entitlements.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as jobEvents from "../jobEvents.js";
import type * as jobs from "../jobs.js";
import type * as migrate from "../migrate.js";
import type * as paymentOrders from "../paymentOrders.js";
import type * as payments from "../payments.js";
import type * as payu from "../payu.js";
import type * as savedJobs from "../savedJobs.js";
import type * as subcategories from "../subcategories.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  applications: typeof applications;
  categories: typeof categories;
  companies: typeof companies;
  crons: typeof crons;
  entitlements: typeof entitlements;
  helpers: typeof helpers;
  http: typeof http;
  jobEvents: typeof jobEvents;
  jobs: typeof jobs;
  migrate: typeof migrate;
  paymentOrders: typeof paymentOrders;
  payments: typeof payments;
  payu: typeof payu;
  savedJobs: typeof savedJobs;
  subcategories: typeof subcategories;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
