import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * OG meta endpoint for job share links.
 *
 * When a job URL like `/jobs/:id` is shared on WhatsApp/Telegram/LinkedIn,
 * link preview crawlers hit the SPA shell which has generic meta tags.
 * This endpoint can be used as an alternative share URL that returns
 * proper OG meta for a specific job.
 *
 * Usage: Share `https://<convex-deployment>/og/jobs/:id` or configure
 * your reverse proxy to serve this HTML for crawler user agents.
 */
http.route({
  path: "/og/jobs",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("id");

    if (!jobId) {
      return new Response("Missing job id", { status: 400 });
    }

    // Fetch only public fields (title, level, skills) — no sensitive data
    const job = await ctx.runQuery(
      // Use internal to avoid the public API validation on Id type
      // We'll just read the db directly in this httpAction
      // Actually httpActions can't use ctx.db, so we need to call a query
      // Let's use the public getById which already handles access control
      // But we only need title which is always public
      // For OG we'll create a minimal internal query
      // Actually, let's just use a simple approach: query the job table
      // httpAction doesn't have ctx.db, so let's use runQuery
      api.jobs.getById,
      { id: jobId as any },
    );

    const title = job?.title ?? "Job Opportunity";
    const level = job?.level ?? "";
    const skills = job?.skills?.slice(0, 3).join(", ") ?? "";
    const description = `${level ? level.charAt(0).toUpperCase() + level.slice(1) + " · " : ""}${skills || "Explore this opportunity on Let's Do It"}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} — Let's Do It</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)} — Let's Do It" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:site_name" content="Let's Do It" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)} — Let's Do It" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta http-equiv="refresh" content="0;url=/jobs/${escapeHtml(jobId)}" />
</head>
<body>
  <p>Redirecting to <a href="/jobs/${escapeHtml(jobId)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }),
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Import api for runQuery reference
import { api } from "./_generated/api";

export default http;
