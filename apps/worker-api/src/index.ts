import type { Env } from "./env";
import { json, noContent, requireToolAccess } from "./http";
import {
  handleCreateSite,
  handleExportSite,
  handleGbpDiagnose,
  handleGenerateImage,
  handleGenerateMatrix,
  handleGeneratePage,
  handleGetPage,
  handleGetSite,
  handleListPages,
  handleListSites,
  handlePublishSite,
  handleSiteExtract,
  handleSyncGbp,
  handleUpdatePage,
} from "./routes/handlers";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return noContent();

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "click-first-api", env: env.ENVIRONMENT });
    }

    const denied = requireToolAccess(request, env);
    if (denied) return denied;

    try {
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

      const pageMatch = url.pathname.match(/^\/pages\/([^/]+)$/);
      if (pageMatch) {
        const pageId = pageMatch[1]!;
        if (request.method === "GET") return handleGetPage(env, pageId);
        if (request.method === "PUT" || request.method === "PATCH") {
          return handleUpdatePage(request, env, pageId);
        }
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
