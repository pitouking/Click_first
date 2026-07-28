import type {
  AiTask,
  AboutPageContent,
  BusinessProfile,
  CategoryPageContent,
  ContactPageContent,
  GeneratePageRequest,
  HomePageContent,
  LocationPageContent,
  PageContent,
  ServicePageContent,
} from "@click-first/shared-types";
import type { Env } from "../env";

export type AiProviderId = "openai" | "deepseek" | "anthropic" | "auto";

export interface GenerateContentPayload {
  business_profile?: BusinessProfile;
  page_type?: string;
  service?: string | null;
  location?: string | null;
  raw?: unknown;
}

export interface GenerateContentOptions {
  /** Explicit provider from dashboard / API body. */
  provider?: AiProviderId | string | null;
}

/**
 * Single AI abstraction entrypoint. Business code must never call provider SDKs directly.
 * Without API keys, falls back to deterministic fixtures (local MVP / demo).
 */
export async function generateContent(
  task: AiTask,
  payload: GenerateContentPayload,
  env: Env,
  options: GenerateContentOptions = {},
): Promise<unknown> {
  const provider = pickProvider(task, env, options.provider);

  if (provider === "fixture") {
    return fixtureContent(task, payload);
  }

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
        env.OPENAI_MODEL?.trim() || "gpt-4o",
      );
    }
  } catch (err) {
    console.error("AI provider failed, falling back to fixture", err);
    return fixtureContent(task, payload);
  }

  return fixtureContent(task, payload);
}

export function listAiProviders(env: Env) {
  return {
    default: normalizeProvider(env.AI_PROVIDER) || "auto",
    available: {
      openai: Boolean(env.OPENAI_API_KEY),
      deepseek: Boolean(env.DEEPSEEK_API_KEY),
      anthropic: Boolean(env.ANTHROPIC_API_KEY),
    },
    openai_model: env.OPENAI_MODEL?.trim() || "gpt-4o",
  };
}

function normalizeProvider(value?: string | null): AiProviderId | null {
  const v = (value || "").trim().toLowerCase();
  if (v === "openai" || v === "chatgpt" || v === "gpt") return "openai";
  if (v === "deepseek") return "deepseek";
  if (v === "anthropic" || v === "claude") return "anthropic";
  if (v === "auto") return "auto";
  return null;
}

function hasKey(provider: Exclude<AiProviderId, "auto">, env: Env): boolean {
  if (provider === "openai") return Boolean(env.OPENAI_API_KEY);
  if (provider === "deepseek") return Boolean(env.DEEPSEEK_API_KEY);
  return Boolean(env.ANTHROPIC_API_KEY);
}

function pickProvider(
  task: AiTask,
  env: Env,
  preferred?: string | null,
): "anthropic" | "deepseek" | "openai" | "fixture" {
  const fromRequest = normalizeProvider(preferred);
  const fromEnv = normalizeProvider(env.AI_PROVIDER);

  const tryOrder: Array<"openai" | "deepseek" | "anthropic"> = [];
  if (fromRequest && fromRequest !== "auto") tryOrder.push(fromRequest);
  else if (fromEnv && fromEnv !== "auto") tryOrder.push(fromEnv);
  else {
    // Auto: prefer ChatGPT when available, then DeepSeek, then Claude.
    tryOrder.push("openai", "deepseek", "anthropic");
  }

  for (const p of tryOrder) {
    if (hasKey(p, env)) return p;
  }

  // If an explicit provider was requested but key missing, still try others before fixture.
  if ((fromRequest && fromRequest !== "auto") || (fromEnv && fromEnv !== "auto")) {
    for (const p of ["openai", "deepseek", "anthropic"] as const) {
      if (!tryOrder.includes(p) && hasKey(p, env)) return p;
    }
  }

  void task;
  return "fixture";
}

function fixtureContent(task: AiTask, payload: GenerateContentPayload): unknown {
  if (
    task === "home_copy" ||
    task === "service_copy" ||
    task === "about_copy" ||
    task === "location_copy"
  ) {
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
    const location = req.location || null;
    const place = location || city;
    const slug = location ? `${slugify(service)}-a-${slugify(location)}` : slugify(service);
    const page: ServicePageContent = {
      page_type: "service",
      slug,
      title_tag: `${service} à ${place} | ${name}`,
      meta_description: `${service} à ${place} par ${name}. Diagnostic, devis transparent, intervention soignée.`,
      h1: `${service} à ${place}`,
      sections: {
        intro: `Besoin d'un ${service.toLowerCase()} à ${place} ? ${name} accompagne les habitants avec un diagnostic clair et une intervention planifiée.`,
        service_details: [
          {
            h2: `Comment se déroule un ${service.toLowerCase()} ?`,
            content: `Nous analysons le besoin, proposons un devis détaillé, puis réalisons l'intervention à ${place} dans les règles de l'art.`,
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
            question: `Combien coûte un ${service.toLowerCase()} à ${place} ?`,
            answer:
              "Le tarif dépend du diagnostic. Nous fournissons un devis écrit avant travaux — jamais de chiffre inventé dans le contenu.",
          },
          {
            question: "Faut-il être présent pendant l'intervention ?",
            answer: "Oui, idéalement pour valider les choix techniques et réceptionner les travaux.",
          },
        ],
        cta: `Demandez votre devis ${service.toLowerCase()} à ${place}`,
      },
      schema: { type: "Service", auto_generated: true },
      images: {},
      internal_links: { related_services: bp.services.filter((s) => s !== service).slice(0, 3) },
      status: "draft",
    };
    return page;
  }

  if (req.page_type === "category") {
    const category = req.service || bp.primary_category || "Services";
    const page: CategoryPageContent = {
      page_type: "category",
      slug: slugify(category),
      title_tag: `${category} à ${city} | ${name}`,
      meta_description: `${category} à ${city} — prestations ${name}.`,
      h1: `${category} à ${city}`,
      sections: {
        intro: `${name} regroupe sous « ${category} » des prestations locales à ${city}.`,
        services_in_category: bp.services.slice(0, 8).map((s) => ({
          name: s,
          summary: `${s} proposé par ${name} à ${city}.`,
        })),
        trust_building: `Catégorie alignée sur le profil métier — aucune invention de services hors liste validée.`,
        faq: [
          {
            question: `Quels services ${category.toLowerCase()} proposez-vous à ${city} ?`,
            answer: bp.services.length
              ? `Parmi les prestations listées : ${bp.services.slice(0, 5).join(", ")}.`
              : "La liste des services est à compléter dans le dashboard.",
          },
        ],
        cta: `Voir les services ${category.toLowerCase()} à ${city}`,
      },
      schema: { type: "CollectionPage", auto_generated: true },
      images: {},
      status: "draft",
    };
    return page;
  }

  if (req.page_type === "location") {
    const location = req.location || bp.locations[0] || city;
    const page: LocationPageContent = {
      page_type: "location",
      slug: `zone-${slugify(location)}`,
      title_tag: `${bp.primary_category || "Services"} à ${location} | ${name}`,
      meta_description: `${name} intervient à ${location} et alentours.`,
      h1: `${bp.primary_category || "Services locaux"} à ${location}`,
      sections: {
        intro: `${name} accompagne les habitants de ${location} pour leurs projets locaux.`,
        local_context: `Zone d'intervention : ${location}. Les services listés ci-dessous correspondent au catalogue validé du site — rien n'est inventé.`,
        services_available: bp.services.map((s) => ({
          name: s,
          summary: `${s} à ${location}.`,
        })),
        trust_building: `NAP et zone issus du profil business — pas de quartiers inventés.`,
        faq: [
          {
            question: `Intervenez-vous bien à ${location} ?`,
            answer: `Oui, ${location} fait partie des zones déclarées pour ${name}.`,
          },
        ],
        cta: `Demander un devis à ${location}`,
      },
      schema: { type: "WebPage", auto_generated: true },
      images: {},
      status: "draft",
    };
    return page;
  }

  if (req.page_type === "about") {
    const page: AboutPageContent = {
      page_type: "about",
      slug: "a-propos",
      title_tag: `À propos | ${name}`,
      meta_description: `Découvrez ${name}, entreprise locale à ${city}.`,
      h1: `À propos de ${name}`,
      sections: {
        intro: `${name} est une entreprise locale basée à ${city}.`,
        story: bp.description
          ? bp.description
          : `Notre équipe accompagne particuliers et professionnels sur ${bp.primary_category || "leurs projets"} à ${city}. (Description longue à compléter si absente du profil.)`,
        values: ["Transparence des devis", "Travaux documentés", "Ancrage local"],
        trust_building:
          bp.missing_fields?.includes("certifications")
            ? "Certifications à compléter dans le dashboard."
            : `Informations légales et credentials : uniquement si fournis (SIRET, labels) — jamais inventés.`,
        cta: "Parler à l'équipe",
      },
      schema: { type: "AboutPage", auto_generated: true },
      images: {},
      status: "draft",
    };
    return page;
  }

  if (req.page_type === "contact") {
    const address = [bp.nap.streetAddress || bp.nap.address, bp.nap.postalCode, bp.nap.addressLocality]
      .filter(Boolean)
      .join(", ");
    const page: ContactPageContent = {
      page_type: "contact",
      slug: "contact",
      title_tag: `Contact | ${name}`,
      meta_description: `Contactez ${name} à ${city}.`,
      h1: `Contactez ${name}`,
      sections: {
        intro: `Une question sur un devis ou une intervention à ${city} ?`,
        how_to_reach: bp.nap.phone
          ? `Téléphone : ${bp.nap.phone}${address ? ` — Adresse : ${address}` : ""}`
          : "Téléphone à compléter dans le dashboard (NAP).",
        service_area: bp.locations.length
          ? `Zones : ${bp.locations.join(", ")}`
          : `Zone principale : ${city}`,
        cta: "Demander un rappel",
      },
      schema: { type: "ContactPage", auto_generated: true },
      images: {},
      status: bp.nap.phone ? "draft" : "a_completer",
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
  const pageType = payload.page_type || "home";
  const example = buildPageFixture({
    business_profile: payload.business_profile || {
      business_name: "Example",
      nap: {},
      services: [],
      locations: [],
    },
    page_type: pageType as GeneratePageRequest["page_type"],
    service: payload.service,
    location: payload.location,
  });

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
        {
          role: "system",
          content:
            "Tu génères du contenu SEO local en français. Réponds UNIQUEMENT avec un JSON valide qui respecte exactement le contrat de page fourni (mêmes clés). N'invente jamais de NAP, avis, notes, prix chiffrés ou certifications absents du profil. IMPORTANT: ne recopie PAS les phrases d'exemple — réécris title_tag, meta_description, h1 et TOUTES les sections avec une copy originale.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task,
            instructions:
              "Remplis le contrat JSON avec une copy originale et locale. Garde page_type, structure des clés, schema.auto_generated=true, status=draft. Change obligatoirement storybrand_title, subtitle, intro, faq et cta (textes différents de l'exemple).",
            contract_shape_only: example,
            must_differ_from_example_fields: [
              "sections.hero.storybrand_title",
              "sections.hero.subtitle",
              "sections.intro",
              "sections.cta",
            ],
            payload,
          }),
        },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI-compatible ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  return parsed;
}
