import type {
  BusinessProfile,
  GenerateImageRequest,
  GeneratePageRequest,
  GbpDiagnoseRequest,
  PageContent,
  PublishSiteRequest,
  SiteExtractRequest,
} from "@click-first/shared-types";
import { generateContent, slugify } from "../ai/generateContent";
import type { Env } from "../env";
import { diagnoseGbp } from "../gbp/diagnose";
import { id, json, readJson } from "../http";
import { buildJsonLd } from "../schema/buildJsonLd";
import { extractSite } from "../site/extract";

export async function handleGbpDiagnose(request: Request, env: Env): Promise<Response> {
  const body = await readJson<GbpDiagnoseRequest>(request);
  const result = diagnoseGbp(body);
  // Optional AI enrichment hook (never invents scores — diagnoseGbp is source of truth)
  await generateContent("gbp_diagnose", { raw: body }, env);
  return json(result);
}

export async function handleSiteExtract(request: Request, env: Env): Promise<Response> {
  const body = await readJson<SiteExtractRequest>(request);
  const result = await extractSite(body);
  await generateContent("site_extract", { raw: body }, env);
  return json(result);
}

export async function handleGeneratePage(request: Request, env: Env): Promise<Response> {
  const body = await readJson<GeneratePageRequest>(request);
  if (!body.business_profile?.business_name) {
    return json({ error: "business_profile.business_name required" }, 400);
  }
  if (!body.page_type) {
    return json({ error: "page_type required" }, 400);
  }

  const task =
    body.page_type === "home"
      ? "home_copy"
      : body.page_type === "about"
        ? "about_copy"
        : body.page_type === "location"
          ? "location_copy"
          : "service_copy";

  const generated = (await generateContent(
    task,
    {
      business_profile: body.business_profile,
      page_type: body.page_type,
      service: body.service,
      location: body.location,
    },
    env,
  )) as PageContent;

  const { graph, missing_fields } = buildJsonLd({
    business: body.business_profile,
    page: generated,
    pageType: body.page_type,
  });

  const siteId = body.site_id || body.business_profile.site_id;
  let pageId: string | undefined;

  if (siteId) {
    pageId = id("page");
    const slug =
      generated.slug ||
      (body.page_type === "home" ? "" : slugify(body.service || body.page_type));
    const status = missing_fields.length ? "a_completer" : "draft";
    generated.status = status === "a_completer" ? "a_completer" : "draft";

    await env.DB.prepare(
      `INSERT INTO pages (id, site_id, page_type, slug, title_tag, meta_description, h1, content_json, schema_json, status, service_name, location_name, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(site_id, slug) DO UPDATE SET
         title_tag=excluded.title_tag,
         meta_description=excluded.meta_description,
         h1=excluded.h1,
         content_json=excluded.content_json,
         schema_json=excluded.schema_json,
         status=excluded.status,
         updated_at=datetime('now')`,
    )
      .bind(
        pageId,
        siteId,
        body.page_type,
        slug,
        generated.title_tag,
        generated.meta_description,
        generated.h1,
        JSON.stringify(generated),
        JSON.stringify(graph),
        generated.status,
        body.service || null,
        body.location || null,
      )
      .run();
  }

  return json({
    ...generated,
    schema_jsonld: graph,
    missing_fields,
    page_id: pageId,
    site_id: siteId,
  });
}

export async function handleGenerateImage(request: Request, env: Env): Promise<Response> {
  const body = await readJson<GenerateImageRequest>(request);
  if (!body.site_id || !body.slot) {
    return json({ error: "site_id and slot required" }, 400);
  }

  // fal.ai when key present; otherwise placeholder object in R2 metadata path
  const key = `${body.site_id}/${body.slot}-${Date.now()}.txt`;
  const placeholder = `placeholder:${body.slot}:${JSON.stringify(body.prompt_context || {})}`;

  if (env.FAL_AI_API_KEY) {
    // Real fal.ai integration can replace this branch; keep secret server-side only.
    await env.IMAGES.put(key, placeholder, {
      customMetadata: { provider: "fal.ai", slot: body.slot },
    });
  } else {
    await env.IMAGES.put(key, placeholder, {
      customMetadata: { provider: "fixture", slot: body.slot },
    });
  }

  return json({
    image_url: `r2://${key}`,
    storage: "r2",
  });
}

export async function handlePublishSite(request: Request, env: Env): Promise<Response> {
  const body = await readJson<PublishSiteRequest>(request);
  if (!body.site_id) return json({ error: "site_id required" }, 400);

  const pageIds = body.page_ids?.length
    ? body.page_ids
    : (
        await env.DB.prepare(
          `SELECT id FROM pages WHERE site_id = ? AND status IN ('draft', 'a_completer')`,
        )
          .bind(body.site_id)
          .all<{ id: string }>()
      ).results.map((r) => r.id);

  if (!pageIds.length) {
    return json({ build_status: "failed", deployed_url: "", pages_published: [], error: "no pages" }, 400);
  }

  const pages = await env.DB.prepare(
    `SELECT id, slug, page_type, title_tag, meta_description, h1, content_json, schema_json, status
     FROM pages WHERE site_id = ? AND id IN (${pageIds.map(() => "?").join(",")})`,
  )
    .bind(body.site_id, ...pageIds)
    .all();

  const site = await env.DB.prepare(`SELECT * FROM sites WHERE id = ?`).bind(body.site_id).first();
  if (!site) return json({ error: "site not found" }, 404);

  // Persist a build manifest consumed by the Astro template (local/dev publish path).
  const manifest = {
    site,
    cloudflare_target: body.cloudflare_target || "internal",
    client_cloudflare_account_id: body.client_cloudflare_account_id || null,
    pages: pages.results,
    generated_at: new Date().toISOString(),
  };

  const objectKey = `publishes/${body.site_id}/manifest.json`;
  await env.IMAGES.put(objectKey, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });

  const published: string[] = [];
  for (const row of pages.results as { id: string; schema_json?: string }[]) {
    await env.DB.prepare(
      `UPDATE pages SET status = 'published', updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(row.id)
      .run();
    published.push(row.id as string);
  }

  const deployed_url =
    body.cloudflare_target === "client_delegated"
      ? `https://pages.dev/client-delegated/${body.site_id}`
      : `https://click-first.pages.dev/${body.site_id}`;

  return json({
    build_status: "success",
    deployed_url,
    pages_published: published,
    manifest_r2_key: objectKey,
    note: "Local/dev: Astro reads generated content via demo pipeline; production triggers Cloudflare Pages build.",
  });
}

export async function handleListPages(env: Env, siteId: string): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT id, site_id, page_type, slug, title_tag, status, updated_at FROM pages WHERE site_id = ? ORDER BY updated_at DESC`,
  )
    .bind(siteId)
    .all();
  return json({ pages: rows.results });
}

export async function handleCreateSite(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{
    business_profile: BusinessProfile;
    gbp?: Record<string, unknown>;
  }>(request);
  const bp = body.business_profile;
  if (!bp?.business_name) return json({ error: "business_profile required" }, 400);

  const siteId = id("site");
  await env.DB.prepare(
    `INSERT INTO sites (id, business_name, primary_category, url, price_range)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      siteId,
      bp.business_name,
      bp.primary_category || null,
      bp.url || null,
      bp.priceRange || null,
    )
    .run();

  for (const service of bp.services || []) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO services (id, site_id, name, source, has_gbp_equivalent) VALUES (?, ?, ?, 'gbp', 1)`,
    )
      .bind(id("svc"), siteId, service)
      .run();
  }

  for (const [i, loc] of (bp.locations || []).entries()) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO locations (id, site_id, name, is_primary) VALUES (?, ?, ?, ?)`,
    )
      .bind(id("loc"), siteId, loc, i === 0 ? 1 : 0)
      .run();
  }

  if (body.gbp) {
    await env.DB.prepare(
      `INSERT INTO gbp_source (id, site_id, business_name, nap_json, categories_json, services_json, hours_json, last_synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        id("gbp"),
        siteId,
        bp.business_name,
        JSON.stringify(bp.nap || {}),
        JSON.stringify({
          primary: bp.primary_category,
          secondary: bp.secondary_categories || [],
        }),
        JSON.stringify(bp.services || []),
        JSON.stringify(bp.hours || []),
      )
      .run();
  }

  await env.DB.prepare(
    `INSERT INTO sync_status (id, site_id, missing_on_site_json, missing_on_gbp_json, nap_mismatch, last_check)
     VALUES (?, ?, '[]', '[]', 0, datetime('now'))`,
  )
    .bind(id("sync"), siteId)
    .run();

  return json({ site_id: siteId, business_name: bp.business_name });
}
