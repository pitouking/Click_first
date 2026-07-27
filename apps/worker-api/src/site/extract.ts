import type { SiteExtractRequest, SiteExtractResponse } from "@click-first/shared-types";

/**
 * Lightweight site extract for MVP. Full crawl can be swapped later.
 * Never invents NAP — only returns what is found (or empty + warnings).
 */
export async function extractSite(req: SiteExtractRequest): Promise<SiteExtractResponse> {
  const warnings: string[] = [];
  if (!req.url) {
    return emptyExtract(["url manquante"]);
  }

  let html = "";
  try {
    const res = await fetch(req.url, {
      headers: { "user-agent": "ClickFirstBot/0.1 (+internal)" },
      redirect: "follow",
    });
    if (!res.ok) {
      return emptyExtract([`fetch failed: HTTP ${res.status}`]);
    }
    html = await res.text();
  } catch (err) {
    return emptyExtract([`fetch error: ${String(err)}`]);
  }

  const phoneMatch = html.match(/href=["']tel:([^"']+)["']/i);
  const phone = phoneMatch?.[1]?.trim();

  const jsonLdBlocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  let existing_schema: Record<string, unknown> = {};
  for (const block of jsonLdBlocks) {
    try {
      existing_schema = JSON.parse(block[1] || "{}") as Record<string, unknown>;
      break;
    } catch {
      warnings.push("JSON-LD illisible ignoré");
    }
  }

  const services_mentioned = guessServices(html);
  if (!phone) warnings.push("Aucun téléphone tel: détecté — à compléter manuellement");
  if (!services_mentioned.length) warnings.push("Aucun service détecté de façon fiable");

  return {
    pages_crawled: 1,
    nap_found: phone ? { phone } : {},
    services_mentioned,
    about_copy_candidate: firstParagraph(html),
    testimonials_found: [],
    certifications_mentioned: findCerts(html),
    images_found: [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].slice(0, 10).map((m) => m[1] || ""),
    existing_schema,
    warnings,
  };
}

function emptyExtract(warnings: string[]): SiteExtractResponse {
  return {
    pages_crawled: 0,
    nap_found: {},
    services_mentioned: [],
    about_copy_candidate: "",
    testimonials_found: [],
    certifications_mentioned: [],
    images_found: [],
    existing_schema: {},
    warnings,
  };
}

function firstParagraph(html: string): string {
  const m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return m ? stripTags(m[1] || "").slice(0, 500) : "";
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function guessServices(html: string): string[] {
  const text = stripTags(html).toLowerCase();
  const catalog = [
    "débouchage",
    "fuite d'eau",
    "chauffe-eau",
    "sanitaire",
    "rénovation salle de bain",
    "urgence plomberie",
    "installation robinetterie",
    "détecteur de fuite",
  ];
  return catalog.filter((s) => text.includes(s));
}

function findCerts(html: string): string[] {
  const text = stripTags(html);
  const out: string[] = [];
  for (const c of ["RGE", "Qualibat", "Qualifelec", "PGN"]) {
    if (text.includes(c)) out.push(c);
  }
  return out;
}
