import { ConvexReactClient } from "convex/react";

// Must stay a literal `process.env.CONVEX_URL` so Bun can inline it for the browser bundle
// (see bunfig.toml [serve.static] env). Do not indirect through `const e = process.env`.
const url = process.env.CONVEX_URL;
if (!url) {
  throw new Error(
    "CONVEX_URL is not set. Add it to .env.local and restart the dev server so Bun can inline it for the browser.",
  );
}

export const convex = new ConvexReactClient(url);
