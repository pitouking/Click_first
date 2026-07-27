import type {
  AiTask,
  BusinessProfile,
  GeneratePageRequest,
  HomePageContent,
  PageContent,
  ServicePageContent,
} from "@click-first/shared-types";
import type { Env } from "../env";

export interface GenerateContentPayload {
  business_profile?: BusinessProfile;
  page_type?: string;
  service?: string | null;
  location?: string | null;
  raw?: unknown;
}

/**
 * Single AI abstraction entrypoint. Business code must never call provider SDKs directly.
 * Without API keys, falls back to deterministic fixtures (local MVP / demo).
 */
export async function generateContent(
  task: AiTask,
  payload: GenerateContentPayload,
  env: Env,
): Promise<unknown> {
  const provider = pickProvider(task, env);

  if (provider === "fixture") {
    return fixtureContent(task, payload);
  }

  // Provider hooks — structured output only. Real HTTP calls when keys exist.
  try {
    if (provider === "anthropic") {
      return await callAnthropic(task, payload, env.ANTHROPIC_API_KEY!);
    }
    if (provider === "deepseek") {
      return await callOpenAiCompatible(
        task,
        payload,
        env.DEEPSEEK_API_KEY!,
        "https://api.deepseek.com/chat/completions",
        "deepseek-chat",
      );
    }
    if (provider === "openai") {
      return await callOpenAiCompatible(
        task,
        payload,
        env.OPENAI_API_KEY!,
        "https://api.openai.com/v1/chat/completions",
        "gpt-4o-mini",
      );
    }
  } catch (err) {
    console.error("AI provider failed, falling back to fixture", err);
    return fixtureContent(task, payload);
  }

  return fixtureContent(task, payload);
}

function pickProvider(task: AiTask, env: Env): "anthropic" | "deepseek" | "openai" | "fixture" {
  if (task === "home_copy" || task === "about_copy") {
    if (env.ANTHROPIC_API_KEY) return "anthropic";
  }
  if (task === "service_copy" || task === "location_copy") {
    if (env.DEEPSEEK_API_KEY) return "deepseek";
    if (env.ANTHROPIC_API_KEY) return "anthropic";
  }
  if (task === "gbp_diagnose" || task === "site_extract") {
    if (env.ANTHROPIC_API_KEY) return "anthropic";
    if (env.OPENAI_API_KEY) return "openai";
  }
  return "fixture";
}

function fixtureContent(task: AiTask, payload: GenerateContentPayload): unknown {
  if (task === "home_copy" || task === "service_copy") {
    return buildPageFixture(payload as GeneratePageRequest);
  }
  if (task === "gbp_diagnose") {
    return { used_fixture: true };
  }
  if (task === "site_extract") {
    return { used_fixture: true };
  }
  return { used_fixture: true };
}

export function buildPageFixture(req: GeneratePageRequest): PageContent {
  const bp = req.business_profile;
  const city = bp.nap.addressLocality || "votre ville";
  const name = bp.business_name;
  const category = bp.primary_category || "Services locaux";

  if (req.page_type === "home") {
    const page: HomePageContent = {
      page_type: "home",
      slug: "",
      title_tag: `${category} à ${city} | ${name}`,
      meta_description: `${name} — ${category} à ${city}. Devis clair, intervention rapide, artisans locaux.`,
      h1: `${category} à ${city}`,
      sections: {
        hero: {
          badge_h1: `${category} à ${city}`,
          storybrand_title: `Retrouvez la sérénité chez vous, sans mauvaise surprise`,
          subtitle: `${name} aide les habitants de ${city} à réussir leurs projets d'énergie, d'isolation et de rénovation.`,
          cta_label: "Demander un devis gratuit",
        },
        intro: `${name} intervient à ${city} et alentours pour des travaux d'énergie, d'isolation, de construction et de rénovation — soignés, tracés et garantis.`,
        services_overview: bp.services.map((s) => ({
          name: s,
          summary: `Prestation ${s.toLowerCase()} réalisée par une équipe locale à ${city}.`,
        })),
        trust_building:
          bp.missing_fields?.includes("certifications")
            ? "Certifications à compléter dans le dashboard."
            : `Entreprise locale à ${city}, au service des particuliers et professionnels.`,
        faq: [
          {
            question: `Intervenez-vous en urgence à ${city} ?`,
            answer: `Oui, ${name} organise des créneaux prioritaires selon disponibilités à ${city}.`,
          },
          {
            question: "Le devis est-il gratuit ?",
            answer: "Oui, le premier devis est gratuit et sans engagement.",
          },
        ],
        cta: "Parlez-nous de votre besoin — réponse sous 24h ouvrées.",
      },
      schema: { type: "LocalBusiness", auto_generated: true },
      images: {},
      status: "draft",
    };
    return page;
  }

  if (req.page_type === "service") {
    const service = req.service || bp.services[0] || "Service";
    const slug = slugify(service);
    const page: ServicePageContent = {
      page_type: "service",
      slug,
      title_tag: `${service} à ${city} | ${name}`,
      meta_description: `${service} à ${city} par ${name}. Diagnostic, devis transparent, intervention soignée.`,
      h1: `${service} à ${city}`,
      sections: {
        intro: `Besoin d'un ${service.toLowerCase()} à ${city} ? ${name} accompagne les habitants avec un diagnostic clair et une intervention planifiée.`,
        service_details: [
          {
            h2: `Comment se déroule un ${service.toLowerCase()} ?`,
            content: `Nous analysons le besoin, proposons un devis détaillé, puis réalisons l'intervention à ${city} dans les règles de l'art.`,
          },
          {
            h2: "Ce qui est inclus",
            content:
              "Diagnostic initial, fourniture des pièces validées avec vous, nettoyage du chantier, conseils d'entretien.",
          },
        ],
        trust_building: `${name} documente chaque intervention — aucune donnée inventée : NAP et avis issus de vos sources validées.`,
        faq: [
          {
            question: `Combien coûte un ${service.toLowerCase()} à ${city} ?`,
            answer:
              "Le tarif dépend du diagnostic. Nous fournissons un devis écrit avant travaux — jamais de chiffre inventé dans le contenu.",
          },
          {
            question: "Faut-il être présent pendant l'intervention ?",
            answer: "Oui, idéalement pour valider les choix techniques et réceptionner les travaux.",
          },
        ],
        cta: `Demandez votre devis ${service.toLowerCase()} à ${city}`,
      },
      schema: { type: "Service", auto_generated: true },
      images: {},
      internal_links: { related_services: bp.services.filter((s) => s !== service).slice(0, 3) },
      status: "draft",
    };
    return page;
  }

  return {
    page_type: req.page_type,
    slug: req.page_type,
    title_tag: `${name} | ${req.page_type}`,
    meta_description: `${name} — page ${req.page_type}`,
    h1: req.page_type,
    schema: { type: "WebPage", auto_generated: true },
    images: {},
    status: "draft",
  };
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function callAnthropic(task: AiTask, payload: GenerateContentPayload, apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: task === "home_copy" || task === "about_copy" ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Return ONLY valid JSON for task=${task}. Payload=${JSON.stringify(payload)}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { text?: string }[] };
  const text = data.content?.[0]?.text || "{}";
  return JSON.parse(text);
}

async function callOpenAiCompatible(
  task: AiTask,
  payload: GenerateContentPayload,
  apiKey: string,
  url: string,
  model: string,
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only JSON matching the page contract." },
        { role: "user", content: `task=${task} payload=${JSON.stringify(payload)}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI-compatible ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return JSON.parse(data.choices?.[0]?.message?.content || "{}");
}
