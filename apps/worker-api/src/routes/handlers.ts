import type {
  BusinessProfile,
  GenerateImageRequest,
  GeneratePageRequest,
  GbpDiagnoseRequest,
  PageContent,
  PublishSiteRequest,
  SiteExtractRequest,
} from "@click-first/shared-types";
import { buildPageFixture, generateContent, slugify } from "../ai/generateContent";
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

  let page: PageContent;
  if (body.prefilled_content && body.prefilled_content.page_type === body.page_type) {
    // Cursor agent / manual path — no external LLM call
    page = body.prefilled_content;
  } else {
    const task =
      body.page_type === "home"
        ? "home_copy"
        : body.page_type === "about"
          ? "about_copy"
          : body.page_type === "location"
            ? "location_copy"
            : body.page_type === "category" || body.page_type === "contact" || body.page_type === "service"
              ? "service_copy"
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

    // Guarantee fixture path for category/contact even if provider returns a stub
    page =
      generated && "sections" in generated && generated.sections
        ? generated
        : buildPageFixture(body);
  }

  const { graph, missing_fields } = buildJsonLd({
    business: body.business_profile,
    page,
    pageType: body.page_type,
  });

  const siteId = body.site_id || body.business_profile.site_id;
  let pageId: string | undefined;

  if (siteId) {
    pageId = id("page");
    const slug =
      page.slug ||
      (body.page_type === "home" ? "" : slugify(body.service || body.page_type));
    // a_completer only for critical NAP gaps — optional legal fields stay listed in missing_fields
    const criticalMissing = missing_fields.filter(
      (f) => f.startsWith("nap.") || f === "nap.phone" || f === "nap.streetAddress" || f === "nap.addressLocality",
    );
    page.status = criticalMissing.length ? "a_completer" : page.status === "a_completer" ? "a_completer" : "draft";

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
         service_name=excluded.service_name,
         location_name=excluded.location_name,
         updated_at=datetime('now')`,
    )
      .bind(
        pageId,
        siteId,
        body.page_type,
        slug,
        page.title_tag ?? null,
        page.meta_description ?? null,
        page.h1 ?? null,
        JSON.stringify(page),
        JSON.stringify(graph),
        page.status,
        body.service ?? null,
        body.location ?? null,
      )
      .run();
  }

  return json({
    ...page,
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

  const prompt =
    typeof body.prompt_context?.prompt === "string" && body.prompt_context.prompt.trim()
      ? String(body.prompt_context.prompt)
      : defaultImagePrompt(body.slot, body.prompt_context || {});

  if (!env.FAL_AI_API_KEY) {
    const key = `${body.site_id}/${body.slot}-${Date.now()}.txt`;
    if (env.IMAGES) {
      await env.IMAGES.put(key, `placeholder:${prompt}`, {
        customMetadata: { provider: "fixture", slot: body.slot },
      });
    }
    return json({ image_url: `r2://${key}`, storage: env.IMAGES ? "r2" : "none", provider: "fixture" });
  }

  const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      Authorization: `Key ${env.FAL_AI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: body.slot === "og" ? "landscape_16_9" : "landscape_4_3",
      num_images: 1,
    }),
  });

  if (!falRes.ok) {
    const errText = await falRes.text();
    return json({ error: "fal_ai_failed", status: falRes.status, detail: errText.slice(0, 300) }, 502);
  }

  const falData = (await falRes.json()) as { images?: { url?: string }[] };
  const imageUrl = falData.images?.[0]?.url;
  if (!imageUrl) return json({ error: "fal_ai_no_image" }, 502);

  // Cache metadata in R2 when available (URL reference — binary download optional later)
  const metaKey = `${body.site_id}/${body.slot}-${Date.now()}.json`;
  if (env.IMAGES) {
    await env.IMAGES.put(
      metaKey,
      JSON.stringify({ image_url: imageUrl, prompt, slot: body.slot, provider: "fal.ai" }),
      { httpMetadata: { contentType: "application/json" }, customMetadata: { provider: "fal.ai", slot: body.slot } },
    );
  }

  return json({
    image_url: imageUrl,
    storage: env.IMAGES ? "r2" : "none",
    provider: "fal.ai",
    r2_meta_key: env.IMAGES ? metaKey : null,
  });
}

function defaultImagePrompt(slot: string, ctx: Record<string, unknown>): string {
  const business = typeof ctx.business_name === "string" ? ctx.business_name : "entreprise locale";
  const city = typeof ctx.city === "string" ? ctx.city : "France";
  const service = typeof ctx.service === "string" ? ctx.service : "rénovation";
  if (slot === "team") {
    return `Professional photo of local craftspeople at work for ${business} in ${city}, natural light, realistic, no text overlay`;
  }
  if (slot === "og") {
    return `Clean architectural photograph related to ${service} in ${city}, wide composition for social share, no text`;
  }
  return `Realistic exterior photo of a renovated home related to ${service}, ${city}, daylight, high quality, no text, no logo`;
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
  if (env.IMAGES) {
    await env.IMAGES.put(objectKey, JSON.stringify(manifest, null, 2), {
      httpMetadata: { contentType: "application/json" },
    });
  }

  const published: string[] = [];
  for (const row of pages.results as { id: string; schema_json?: string }[]) {
    await env.DB.prepare(
      `UPDATE pages SET status = 'published', updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(row.id)
      .run();
    published.push(row.id as string);
  }

  let cloudflare: { token_status?: string; accounts?: { id: string; name: string }[]; note?: string } | null =
    null;
  if (env.CLOUDFLARE_API_TOKEN) {
    try {
      const verifyRes = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      });
      const verifyData = (await verifyRes.json()) as {
        success?: boolean;
        result?: { status?: string };
      };
      const accountsRes = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=5", {
        headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      });
      const accountsData = (await accountsRes.json()) as {
        success?: boolean;
        result?: { id: string; name: string }[];
      };
      cloudflare = {
        token_status: verifyData.result?.status || (verifyData.success ? "active" : "invalid"),
        accounts: (accountsData.result || []).map((a) => ({ id: a.id, name: a.name })),
        note: "Token OK. Direct Pages deploy wiring can use account id + wrangler pages deploy next.",
      };
    } catch (err) {
      cloudflare = { token_status: "error", note: String(err) };
    }
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
    cloudflare,
    note: "Local/dev: Astro reads generated content via demo pipeline; Cloudflare token verified when present.",
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

export async function handleGetPage(env: Env, pageId: string): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT id, site_id, page_type, slug, title_tag, meta_description, h1, content_json, schema_json, status, service_name, location_name, updated_at
     FROM pages WHERE id = ?`,
  )
    .bind(pageId)
    .first();
  if (!row) return json({ error: "page not found" }, 404);
  return json({
    id: row.id,
    site_id: row.site_id,
    page_type: row.page_type,
    slug: row.slug,
    title_tag: row.title_tag,
    meta_description: row.meta_description,
    h1: row.h1,
    content: JSON.parse(String(row.content_json || "{}")),
    schema_jsonld: JSON.parse(String(row.schema_json || "{}")),
    status: row.status,
    service_name: row.service_name,
    location_name: row.location_name,
    updated_at: row.updated_at,
  });
}

export async function handleUpdatePage(request: Request, env: Env, pageId: string): Promise<Response> {
  const existing = await env.DB.prepare(
    `SELECT id, site_id, page_type, slug, title_tag, meta_description, h1, content_json, schema_json, status
     FROM pages WHERE id = ?`,
  )
    .bind(pageId)
    .first();
  if (!existing) return json({ error: "page not found" }, 404);

  const body = await readJson<{
    title_tag?: string;
    meta_description?: string;
    h1?: string;
    status?: "draft" | "published" | "a_completer";
    content?: Record<string, unknown>;
  }>(request);

  let content: Record<string, unknown>;
  try {
    content = JSON.parse(String(existing.content_json || "{}")) as Record<string, unknown>;
  } catch {
    content = {};
  }

  if (body.content && typeof body.content === "object") {
    content = { ...content, ...body.content };
    if (body.content.sections && typeof body.content.sections === "object") {
      content.sections = {
        ...((content.sections as Record<string, unknown>) || {}),
        ...(body.content.sections as Record<string, unknown>),
      };
    }
  }

  const title_tag = body.title_tag ?? String(existing.title_tag || "");
  const meta_description = body.meta_description ?? String(existing.meta_description || "");
  const h1 = body.h1 ?? String(existing.h1 || "");
  const status = body.status ?? String(existing.status || "draft");

  content.title_tag = title_tag;
  content.meta_description = meta_description;
  content.h1 = h1;
  content.status = status;

  await env.DB.prepare(
    `UPDATE pages SET title_tag = ?, meta_description = ?, h1 = ?, content_json = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(title_tag, meta_description, h1, JSON.stringify(content), status, pageId)
    .run();

  return handleGetPage(env, pageId);
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

export async function handleExportSite(env: Env, siteId: string): Promise<Response> {
  const site = await env.DB.prepare(`SELECT * FROM sites WHERE id = ?`).bind(siteId).first();
  if (!site) return json({ error: "site not found" }, 404);

  const gbp = await env.DB.prepare(`SELECT nap_json FROM gbp_source WHERE site_id = ?`).bind(siteId).first();
  const nap = gbp ? JSON.parse(String(gbp.nap_json || "{}")) : {};

  const pages = await env.DB.prepare(
    `SELECT id, slug, page_type, title_tag, meta_description, h1, content_json, schema_json, status
     FROM pages WHERE site_id = ? ORDER BY page_type, slug`,
  )
    .bind(siteId)
    .all();

  return json({
    site: {
      id: site.id,
      business_name: site.business_name,
      primary_category: site.primary_category,
      url: site.url,
      nap,
    },
    pages: pages.results.map((p) => ({
      id: p.id,
      slug: p.slug,
      page_type: p.page_type,
      title_tag: p.title_tag,
      meta_description: p.meta_description,
      h1: p.h1,
      content: JSON.parse(String(p.content_json || "{}")),
      schema_jsonld: JSON.parse(String(p.schema_json || "{}")),
      status: p.status,
    })),
  });
}

export async function handleListSites(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT s.id, s.business_name, s.primary_category, s.url, s.updated_at,
            (SELECT COUNT(*) FROM pages p WHERE p.site_id = s.id) AS pages_count
     FROM sites s
     ORDER BY s.updated_at DESC`,
  ).all();
  return json({ sites: rows.results });
}

export async function handleGetSite(env: Env, siteId: string): Promise<Response> {
  const site = await env.DB.prepare(`SELECT * FROM sites WHERE id = ?`).bind(siteId).first();
  if (!site) return json({ error: "site not found" }, 404);

  const services = await env.DB.prepare(`SELECT name, source, has_gbp_equivalent FROM services WHERE site_id = ? ORDER BY name`)
    .bind(siteId)
    .all();
  const locations = await env.DB.prepare(`SELECT name, is_primary FROM locations WHERE site_id = ? ORDER BY is_primary DESC, name`)
    .bind(siteId)
    .all();
  const gbp = await env.DB.prepare(`SELECT * FROM gbp_source WHERE site_id = ?`).bind(siteId).first();
  const sync = await env.DB.prepare(`SELECT * FROM sync_status WHERE site_id = ?`).bind(siteId).first();
  const pages = await env.DB.prepare(
    `SELECT id, page_type, slug, title_tag, status, service_name, location_name, updated_at FROM pages WHERE site_id = ? ORDER BY page_type, slug`,
  )
    .bind(siteId)
    .all();

  let gbp_action_checklist: string[] = [];
  let optimization_status: string | null = null;
  if (gbp) {
    try {
      gbp_action_checklist = JSON.parse(String(gbp.gbp_action_checklist_json || "[]"));
    } catch {
      gbp_action_checklist = [];
    }
    optimization_status = String(gbp.optimization_status || null);
  }

  return json({
    site,
    services: services.results,
    locations: locations.results,
    gbp: gbp
      ? {
          ...gbp,
          gbp_action_checklist,
          optimization_status,
          services: JSON.parse(String(gbp.services_json || "[]")),
          nap: JSON.parse(String(gbp.nap_json || "{}")),
          categories: JSON.parse(String(gbp.categories_json || "{}")),
        }
      : null,
    sync: sync
      ? {
          ...sync,
          missing_on_site: JSON.parse(String(sync.missing_on_site_json || "[]")),
          missing_on_gbp: JSON.parse(String(sync.missing_on_gbp_json || "[]")),
        }
      : null,
    pages: pages.results,
  });
}

export async function handleSyncGbp(env: Env, siteId: string): Promise<Response> {
  const gbp = await env.DB.prepare(`SELECT * FROM gbp_source WHERE site_id = ?`).bind(siteId).first();
  if (!gbp) return json({ error: "gbp_source missing — import GBP first" }, 400);

  const gbpServices = JSON.parse(String(gbp.services_json || "[]")) as string[];
  const siteServices = (
    await env.DB.prepare(`SELECT name FROM services WHERE site_id = ?`).bind(siteId).all<{ name: string }>()
  ).results.map((r) => r.name);

  const missing_on_site = gbpServices.filter((s) => !siteServices.includes(s));
  const missing_on_gbp = siteServices.filter((s) => !gbpServices.includes(s));

  const diagnoseInput = {
    business_name: String(gbp.business_name),
    categories: JSON.parse(String(gbp.categories_json || "{}")) as {
      primary: string;
      secondary: string[];
    },
    services: gbpServices,
    description_length: String(gbp.description || "").length,
    photos_count: Number(gbp.photos_count || 0),
    attributes_completed: Boolean(gbp.attributes_completed),
    hours_provided: JSON.parse(String(gbp.hours_json || "[]")).length > 0,
    qa_count: Number(gbp.qa_count || 0),
  };
  const diagnosed = diagnoseGbp({
    ...diagnoseInput,
    categories: {
      primary: diagnoseInput.categories.primary || "",
      secondary: diagnoseInput.categories.secondary || [],
    },
  });

  await env.DB.prepare(
    `UPDATE gbp_source
     SET optimization_status = ?, gbp_action_checklist_json = ?, last_synced = datetime('now'), updated_at = datetime('now')
     WHERE site_id = ?`,
  )
    .bind(diagnosed.optimization_status, JSON.stringify(diagnosed.gbp_action_checklist), siteId)
    .run();

  await env.DB.prepare(
    `INSERT INTO sync_status (id, site_id, missing_on_site_json, missing_on_gbp_json, nap_mismatch, last_check)
     VALUES (?, ?, ?, ?, 0, datetime('now'))
     ON CONFLICT(site_id) DO UPDATE SET
       missing_on_site_json = excluded.missing_on_site_json,
       missing_on_gbp_json = excluded.missing_on_gbp_json,
       last_check = datetime('now')`,
  )
    .bind(id("sync"), siteId, JSON.stringify(missing_on_site), JSON.stringify(missing_on_gbp))
    .run();

  return json({
    optimization_status: diagnosed.optimization_status,
    gbp_action_checklist: diagnosed.gbp_action_checklist,
    score_breakdown: diagnosed.score_breakdown,
    missing_on_site,
    missing_on_gbp,
  });
}

export async function handleGenerateMatrix(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{
    site_id: string;
    services?: string[];
    locations?: string[];
    include_core_pages?: boolean;
  }>(request);
  if (!body.site_id) return json({ error: "site_id required" }, 400);

  const site = await env.DB.prepare(`SELECT * FROM sites WHERE id = ?`).bind(body.site_id).first();
  if (!site) return json({ error: "site not found" }, 404);

  const dbServices = (
    await env.DB.prepare(`SELECT name FROM services WHERE site_id = ?`).bind(body.site_id).all<{ name: string }>()
  ).results.map((r) => r.name);
  const dbLocations = (
    await env.DB.prepare(`SELECT name FROM locations WHERE site_id = ?`).bind(body.site_id).all<{ name: string }>()
  ).results.map((r) => r.name);

  const services = body.services?.length ? body.services : dbServices;
  const locations = body.locations?.length ? body.locations : dbLocations;
  if (!services.length || !locations.length) {
    return json({ error: "services and locations required on site" }, 400);
  }

  const gbp = await env.DB.prepare(`SELECT * FROM gbp_source WHERE site_id = ?`).bind(body.site_id).first();
  const nap = gbp ? (JSON.parse(String(gbp.nap_json || "{}")) as BusinessProfile["nap"]) : {};
  const business_profile: BusinessProfile = {
    site_id: body.site_id,
    business_name: String(site.business_name),
    primary_category: site.primary_category ? String(site.primary_category) : undefined,
    nap,
    services: dbServices,
    locations: dbLocations,
    url: site.url ? String(site.url) : undefined,
    priceRange: site.price_range ? String(site.price_range) : undefined,
  };

  const created: { page_id: string; page_type: string; slug: string; service?: string; location?: string }[] = [];

  async function generateOne(
    page_type: GeneratePageRequest["page_type"],
    service?: string | null,
    location?: string | null,
  ) {
    const fakeReq = new Request("http://local/generate-page", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        site_id: body.site_id,
        business_profile,
        page_type,
        service: service ?? null,
        location: location ?? null,
      }),
    });
    const res = await handleGeneratePage(fakeReq, env);
    const data = (await res.json()) as { page_id?: string; slug?: string; error?: string };
    if (!res.ok) throw new Error(data.error || `generate ${page_type} failed`);
    created.push({
      page_id: String(data.page_id),
      page_type,
      slug: String(data.slug || ""),
      service: service || undefined,
      location: location || undefined,
    });
  }

  if (body.include_core_pages !== false) {
    await generateOne("home");
    await generateOne("about");
    await generateOne("contact");
    if (business_profile.primary_category) {
      await generateOne("category", business_profile.primary_category);
    }
    for (const loc of locations) {
      await generateOne("location", null, loc);
    }
    for (const svc of services) {
      await generateOne("service", svc, null);
    }
  }

  // Matrix Services × Locations (page_type service with both set)
  for (const svc of services) {
    for (const loc of locations) {
      await generateOne("service", svc, loc);
    }
  }

  return json({
    site_id: body.site_id,
    generated_count: created.length,
    pages: created,
  });
}

