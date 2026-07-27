import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PageContent } from "@click-first/shared-types";
import fixture from "./fixture-plumber.json";

export interface SiteBundle {
  site: {
    id: string;
    business_name: string;
    primary_category?: string;
    url?: string;
    nap: {
      phone?: string;
      streetAddress?: string;
      addressLocality?: string;
      postalCode?: string;
      addressCountry?: string;
    };
  };
  pages: Array<{
    id: string;
    slug: string;
    page_type: string;
    title_tag: string;
    meta_description: string;
    h1: string;
    content: PageContent;
    schema_jsonld: Record<string, unknown>;
    status: string;
  }>;
}

const dir = dirname(fileURLToPath(import.meta.url));
const generatedPath = join(dir, "..", "data", "generated", "site.json");

export function loadSiteBundle(): SiteBundle {
  if (existsSync(generatedPath)) {
    return JSON.parse(readFileSync(generatedPath, "utf8")) as SiteBundle;
  }
  return fixture as unknown as SiteBundle;
}

export function navFromBundle(bundle: SiteBundle) {
  return bundle.pages
    .filter((p) => p.page_type === "service")
    .map((p) => ({
      href: `/${p.slug}/`,
      label: p.h1.split(" à ")[0] || p.h1,
    }));
}
