/**
 * End-to-end local demo against wrangler dev:
 * intake (create site) → gbp diagnose → generate Home + Service → publish → write Astro content
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.API_BASE || "http://127.0.0.1:8787";
const here = dirname(fileURLToPath(import.meta.url));
const astroGenerated = join(here, "../../astro-template/src/data/generated/site.json");

const business_profile = {
  business_name: "Plomberie Marcel Test",
  primary_category: "Plombier",
  secondary_categories: ["Entreprise de plomberie", "Réparation de chauffe-eau"],
  nap: {
    phone: "+33478000000",
    streetAddress: "12 rue des Canalisations",
    addressLocality: "Villeurbanne",
    postalCode: "69100",
    addressCountry: "FR",
  },
  services: [
    "Débouchage",
    "Recherche de fuite",
    "Remplacement chauffe-eau",
    "Installation robinetterie",
    "Dégât des eaux",
    "Entretien chaudière",
  ],
  locations: ["Villeurbanne"],
  hours: [
    {
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
  url: "https://plomberie-marcel-test.example",
  priceRange: "$$",
  siret: "12345678900012",
  missing_fields: [],
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status} ${JSON.stringify(data)}`);
  return data as T;
}

async function main() {
  console.log("API:", API);

  const health = await fetch(`${API}/health`);
  if (!health.ok) throw new Error("API health check failed — start wrangler dev first");

  const diagnose = await post<{ optimization_status: string; gbp_action_checklist: string[] }>(
    "/gbp/diagnose",
    {
      business_name: business_profile.business_name,
      categories: {
        primary: business_profile.primary_category,
        secondary: business_profile.secondary_categories,
      },
      services: business_profile.services,
      description_length: 200,
      photos_count: 5,
      attributes_completed: false,
      hours_provided: true,
      qa_count: 1,
    },
  );
  console.log("GBP diagnose:", diagnose.optimization_status, diagnose.gbp_action_checklist.length, "actions");

  const site = await post<{ site_id: string }>("/sites", {
    business_profile,
    gbp: true,
  });
  console.log("site_id:", site.site_id);

  const home = await post<Record<string, unknown>>("/generate-page", {
    site_id: site.site_id,
    business_profile: { ...business_profile, site_id: site.site_id },
    page_type: "home",
  });
  console.log("home page:", home.page_id, home.status);

  const service = await post<Record<string, unknown>>("/generate-page", {
    site_id: site.site_id,
    business_profile: { ...business_profile, site_id: site.site_id },
    page_type: "service",
    service: "Débouchage",
  });
  console.log("service page:", service.page_id, service.slug, service.status);

  const publish = await post<{
    build_status: string;
    deployed_url: string;
    pages_published: string[];
  }>("/publish-site", {
    site_id: site.site_id,
    page_ids: [home.page_id, service.page_id],
    cloudflare_target: "internal",
  });
  console.log("publish:", publish.build_status, publish.deployed_url);

  const pagesRes = await fetch(`${API}/sites/${site.site_id}/pages`);
  const pagesJson = (await pagesRes.json()) as {
    pages: Array<{
      id: string;
      slug: string;
      page_type: string;
      title_tag: string;
      status: string;
    }>;
  };

  // Fetch full page payloads from D1 via regenerate content we already have
  const bundle = {
    site: {
      id: site.site_id,
      business_name: business_profile.business_name,
      primary_category: business_profile.primary_category,
      url: business_profile.url,
      nap: business_profile.nap,
    },
    pages: [
      {
        id: String(home.page_id),
        slug: "",
        page_type: "home",
        title_tag: String(home.title_tag),
        meta_description: String(home.meta_description),
        h1: String(home.h1),
        content: home,
        schema_jsonld: home.schema_jsonld,
        status: "published",
      },
      {
        id: String(service.page_id),
        slug: String(service.slug || "debouchage"),
        page_type: "service",
        title_tag: String(service.title_tag),
        meta_description: String(service.meta_description),
        h1: String(service.h1),
        content: service,
        schema_jsonld: service.schema_jsonld,
        status: "published",
      },
    ],
  };

  await mkdir(dirname(astroGenerated), { recursive: true });
  await writeFile(astroGenerated, JSON.stringify(bundle, null, 2));
  console.log("Wrote Astro content:", astroGenerated);
  console.log("Dashboard:", `http://127.0.0.1:3000/?site_id=${site.site_id}`);
  console.log("Pages after publish:", pagesJson.pages.map((p) => `${p.page_type}:${p.status}`).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
