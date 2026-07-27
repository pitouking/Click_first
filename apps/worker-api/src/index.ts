import type { Env } from "./env";
import { json, noContent } from "./http";
import {
  handleCreateSite,
  handleGbpDiagnose,
  handleGenerateImage,
  handleGeneratePage,
  handleListPages,
  handlePublishSite,
  handleSiteExtract,
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
      if (request.method === "POST" && url.pathname === "/sites") {
        return handleCreateSite(request, env);
      }
      if (request.method === "GET" && url.pathname.startsWith("/sites/") && url.pathname.endsWith("/pages")) {
        const siteId = url.pathname.split("/")[2];
        if (!siteId) return json({ error: "site_id required" }, 400);
        return handleListPages(env, siteId);
      }

      return json({ error: "not found", path: url.pathname }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "internal_error", message: String(err) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
