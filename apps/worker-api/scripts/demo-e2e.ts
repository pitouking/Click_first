/**
 * End-to-end local demo against wrangler dev:
 * intake → gbp diagnose → create site → generate-matrix → publish → export Astro content
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.API_BASE || "http://127.0.0.1:8787";
const here = dirname(fileURLToPath(import.meta.url));
const astroGenerated = join(here, "../../astro-template/src/data/generated/site.json");

export const MISSING_SERVICES = [
  "Photovoltaïque",
  "Isolation",
  "Maçonnerie",
  "Rénovation",
  "Terrassement",
  "Piscines",
  "Revêtement des sols",
] as const;

const business_profile = {
  business_name: "Bâti Énergie Marcel Test",
  primary_category: "Construction & Rénovation",
  secondary_categories: ["Énergie & Isolation", "Maçonnerie", "Terrassement", "Piscines"],
  nap: {
    phone: "+33478000000",
    streetAddress: "12 rue des Artisans",
    addressLocality: "Villeurbanne",
    postalCode: "69100",
    addressCountry: "FR",
  },
  services: [...MISSING_SERVICES],
  locations: ["Villeurbanne", "Lyon", "Caluire-et-Cuire"],
  hours: [
    {
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
  url: "https://bati-energie-marcel-test.example",
  priceRange: "$$",
  siret: "12345678900012",
  missing_fields: [],
};

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status} ${JSON.stringify(data)}`);
  return data as T;
}

async function main() {
  console.log("API:", API);
  console.log("Services × Locations:", business_profile.services.length, "×", business_profile.locations.length);

  if (!(await fetch(`${API}/health`)).ok) throw new Error("API health check failed");

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
  console.log("GBP diagnose:", diagnose.optimization_status);

  const site = await post<{ site_id: string }>("/sites", { business_profile, gbp: true });
  console.log("site_id:", site.site_id);

  await post(`/sites/${site.site_id}/sync-gbp`);

  const matrix = await post<{ generated_count: number; pages: { page_id: string }[] }>("/generate-matrix", {
    site_id: site.site_id,
    include_core_pages: true,
  });
  console.log("matrix pages:", matrix.generated_count);

  const publish = await post<{ build_status: string; pages_published: string[]; deployed_url: string }>(
    "/publish-site",
    {
      site_id: site.site_id,
      page_ids: matrix.pages.map((p) => p.page_id),
      cloudflare_target: "internal",
    },
  );
  console.log("publish:", publish.build_status, publish.pages_published.length, "→", publish.deployed_url);

  const exported = await fetch(`${API}/sites/${site.site_id}/export`).then((r) => r.json());
  await mkdir(dirname(astroGenerated), { recursive: true });
  await writeFile(astroGenerated, JSON.stringify(exported, null, 2));
  console.log("Wrote Astro content:", astroGenerated);
  console.log("Dashboard:", `http://127.0.0.1:3000/?site_id=${site.site_id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
