import type { Env } from "./env";
import { json, noContent } from "./http";
import {
  handleCreateSite,
  handleExportSite,
  handleGbpDiagnose,
  handleGenerateImage,
  handleGenerateMatrix,
  handleGeneratePage,
  handleGetSite,
  handleListPages,
  handleListSites,
  handlePublishSite,
  handleSiteExtract,
  handleSyncGbp,
} from "./routes/handlers";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return noContent();

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "click-first-api", env: env.ENVIRONMENT });
      }

      if (request.method === "POST" && url.pathname === "/gbp/diagnose") {
        return handleGbpDiagnose(request, env);
      }
      if (request.method === "POST" && url.pathname === "/site/extract") {
        return handleSiteExtract(request, env);
      }
      if (request.method === "POST" && url.pathname === "/generate-page") {
        return handleGeneratePage(request, env);
      }
      if (request.method === "POST" && url.pathname === "/generate-image") {
        return handleGenerateImage(request, env);
      }
      if (request.method === "POST" && url.pathname === "/publish-site") {
        return handlePublishSite(request, env);
      }
      if (request.method === "POST" && url.pathname === "/generate-matrix") {
        return handleGenerateMatrix(request, env);
      }

      if (request.method === "GET" && url.pathname === "/sites") {
        return handleListSites(env);
      }
      if (request.method === "POST" && url.pathname === "/sites") {
        return handleCreateSite(request, env);
      }

      const siteMatch = url.pathname.match(/^\/sites\/([^/]+)(?:\/(pages|sync-gbp|export))?$/);
      if (siteMatch) {
        const siteId = siteMatch[1]!;
        const action = siteMatch[2];
        if (request.method === "GET" && !action) return handleGetSite(env, siteId);
        if (request.method === "GET" && action === "pages") return handleListPages(env, siteId);
        if (request.method === "GET" && action === "export") return handleExportSite(env, siteId);
        if (request.method === "POST" && action === "sync-gbp") return handleSyncGbp(env, siteId);
      }

      return json({ error: "not found", path: url.pathname }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "internal_error", message: String(err) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
