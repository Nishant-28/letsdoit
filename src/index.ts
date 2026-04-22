import { serve, file } from "bun";
import { extname, join } from "path";
import tailwind from "bun-plugin-tailwind";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".jsx": "text/javascript",
  ".ts": "text/javascript",
  ".tsx": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

async function serveStatic(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Serve index.html for root
  if (pathname === "/") {
    const indexPath = join(import.meta.dir, "index.html");
    let html = await file(indexPath).text();
    // Dev server serves CSS at /frontend.css; omit from HTML so `bun run build` can bundle CSS.
    if (process.env.NODE_ENV !== "production") {
      html = html.replace(
        "</head>",
        '  <link rel="stylesheet" href="/frontend.css" />\n</head>'
      );
    }
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Try to serve static file
  const filePath = join(import.meta.dir, pathname.slice(1));
  const ext = extname(filePath);

  // Only try to serve if it looks like a static asset
  if (ext && MIME_TYPES[ext]) {
    try {
      const fd = await file(filePath).text();
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      return new Response(fd, {
        headers: { "Content-Type": mimeType },
      });
    } catch {
      // File not found, fall through to SPA handling
    }
  }

  // Handle favicon
  if (pathname === "/favicon.ico") {
    return new Response("", { status: 204 });
  }

  // For all other routes (SPA client-side routing), serve index.html
  try {
    const indexPath = join(import.meta.dir, "index.html");
    const fd = await file(indexPath).text();
    return new Response(fd, {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

type FrontendBundle = { js: Blob; css: Blob };

let frontendPending: Promise<FrontendBundle> | null = null;

function getFrontendBundle(): Promise<FrontendBundle> {
  return (frontendPending ??= (async () => {
    const result = await Bun.build({
      entrypoints: ["./src/frontend.tsx"],
      target: "browser",
      plugins: [tailwind],
      // No `outdir`: serve artifacts directly so we never return a stale
      // `src/frontend.js` from disk missing `process.env.*` defines.
      define: {
        "process.env.NODE_ENV": JSON.stringify(
          process.env.NODE_ENV || "development"
        ),
        "process.env.CONVEX_URL": JSON.stringify(
          process.env.CONVEX_URL ?? ""
        ),
        "process.env.VITE_WORKOS_CLIENT_ID": JSON.stringify(
          process.env.VITE_WORKOS_CLIENT_ID ?? ""
        ),
        "process.env.VITE_WORKOS_REDIRECT_URI": JSON.stringify(
          process.env.VITE_WORKOS_REDIRECT_URI ?? ""
        ),
        "process.env.VITE_PUBLIC_POSTHOG_KEY": JSON.stringify(
          process.env.VITE_PUBLIC_POSTHOG_KEY ?? ""
        ),
        "process.env.VITE_PUBLIC_POSTHOG_HOST": JSON.stringify(
          process.env.VITE_PUBLIC_POSTHOG_HOST ?? ""
        ),
      },
    });

    if (!result.success) {
      console.error("Build failed:", result.logs);
      throw new Error("Build failed");
    }

    const entry = result.outputs.find((o) => o.kind === "entry-point");
    const css = result.outputs.find(
      (o) => o.kind === "asset" && o.path?.endsWith(".css")
    );
    if (!entry) {
      console.error("Build produced no entry-point output");
      throw new Error("Build failed");
    }
    if (!css) {
      console.error("Build produced no CSS asset (Tailwind output missing)");
      throw new Error("Build failed");
    }

    return { js: entry, css };
  })().finally(() => {
    frontendPending = null;
  }));
}

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    if (
      url.pathname === "/frontend.js" ||
      url.pathname === "/frontend.tsx" ||
      url.pathname === "/frontend.css"
    ) {
      try {
        const bundle = await getFrontendBundle();
        if (url.pathname === "/frontend.js" || url.pathname === "/frontend.tsx") {
          return new Response(bundle.js, {
            headers: { "Content-Type": "text/javascript;charset=utf-8" },
          });
        }
        return new Response(bundle.css, {
          headers: { "Content-Type": "text/css;charset=utf-8" },
        });
      } catch {
        return new Response("Build failed", { status: 500 });
      }
    }
    return serveStatic(req);
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
