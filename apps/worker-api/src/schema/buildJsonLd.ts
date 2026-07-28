import type { BusinessProfile, PageContent, PageType } from "@click-first/shared-types";

/**
 * Deterministic JSON-LD assembly — NEVER call an LLM from this module.
 * Missing NAP / credentials / reviews are omitted and reported as missing_fields.
 */
export function buildJsonLd(args: {
  business: BusinessProfile;
  page: PageContent;
  pageType: PageType;
}): { graph: Record<string, unknown>; missing_fields: string[] } {
  const missing: string[] = [...(args.business.missing_fields || [])];
  const nap = args.business.nap;
  const graph: Record<string, unknown>[] = [];

  if (!nap.phone) missing.push("nap.phone");
  if (!nap.streetAddress && !nap.address) missing.push("nap.streetAddress");
  if (!nap.addressLocality) missing.push("nap.addressLocality");
  if (!nap.postalCode) missing.push("nap.postalCode");

  const hasUsableNap =
    Boolean(nap.phone) &&
    Boolean(nap.addressLocality) &&
    Boolean(nap.streetAddress || nap.address) &&
    Boolean(nap.postalCode);

  if (hasUsableNap) {
    const localBusiness: Record<string, unknown> = {
      "@type": "LocalBusiness",
      "@id": `${args.business.url || "https://example.local"}/#business`,
      name: args.business.business_name,
      telephone: nap.phone,
      url: args.business.url,
      address: {
        "@type": "PostalAddress",
        streetAddress: nap.streetAddress || nap.address,
        addressLocality: nap.addressLocality,
        postalCode: nap.postalCode,
        addressCountry: nap.addressCountry || "FR",
      },
    };

    if (args.business.priceRange) localBusiness.priceRange = args.business.priceRange;
    if (args.business.geo?.latitude != null && args.business.geo?.longitude != null) {
      localBusiness.geo = {
        "@type": "GeoCoordinates",
        latitude: args.business.geo.latitude,
        longitude: args.business.geo.longitude,
      };
    }
    if (nap.addressLocality) {
      localBusiness.areaServed = [{ "@type": "City", name: nap.addressLocality }];
    }
    if (args.business.hours?.length) {
      localBusiness.openingHoursSpecification = args.business.hours.map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: h.dayOfWeek,
        opens: h.opens,
        closes: h.closes,
      }));
    }
    if (args.business.services.length) {
      localBusiness.hasOfferCatalog = {
        "@type": "OfferCatalog",
        name: "Services",
        itemListElement: args.business.services.map((name) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name },
        })),
      };
    }
    if (args.business.siret) {
      localBusiness.identifier = {
        "@type": "PropertyValue",
        name: "SIRET",
        value: args.business.siret,
      };
    } else {
      missing.push("siret");
    }
    if (args.business.sameAs?.length) localBusiness.sameAs = args.business.sameAs;

    graph.push(localBusiness);
  }

  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${args.business.url || "https://example.local"}/${args.page.slug || ""}#webpage`,
    name: args.page.title_tag,
    description: args.page.meta_description,
    url: `${args.business.url || "https://example.local"}/${args.page.slug || ""}`,
    isPartOf: { "@id": `${args.business.url || "https://example.local"}/#website` },
  };
  graph.push(webPage);

  if (args.pageType === "service" && "sections" in args.page) {
    graph.push({
      "@type": "Service",
      name: args.page.h1,
      provider: { "@id": `${args.business.url || "https://example.local"}/#business` },
      areaServed: nap.addressLocality
        ? { "@type": "City", name: nap.addressLocality }
        : undefined,
    });

    const faq = (args.page as { sections?: { faq?: { question: string; answer: string }[] } })
      .sections?.faq;
    if (faq?.length) {
      graph.push({
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      });
    }
  }

  graph.push({
    "@type": "WebSite",
    "@id": `${args.business.url || "https://example.local"}/#website`,
    name: args.business.business_name,
    url: args.business.url || "https://example.local",
  });

  const uniqueMissing = [...new Set(missing)];
  return {
    graph: {
      "@context": "https://schema.org",
      "@graph": graph.filter((node) => node && Object.keys(node).length > 0),
    },
    missing_fields: uniqueMissing,
  };
}
