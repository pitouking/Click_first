import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { diagnoseGbp } from "../gbp/diagnose";
import { buildJsonLd } from "./buildJsonLd";
import { buildPageFixture } from "../ai/generateContent";

describe("diagnoseGbp", () => {
  it("flags incomplete GBP", () => {
    const res = diagnoseGbp({
      business_name: "Test",
      categories: { primary: "Plombier", secondary: [] },
      services: ["A", "B"],
      description_length: 100,
      photos_count: 2,
      attributes_completed: false,
      hours_provided: true,
      qa_count: 0,
    });
    assert.equal(res.optimization_status, "needs_action");
    assert.ok(res.gbp_action_checklist.length >= 4);
  });
});

describe("buildJsonLd", () => {
  it("omits invented fields and reports missing", () => {
    const page = buildPageFixture({
      business_profile: {
        business_name: "Plomberie Dupont Test",
        nap: {
          addressLocality: "Lyon",
          phone: "0400000000",
          postalCode: "69001",
          streetAddress: "1 rue Test",
        },
        services: ["Débouchage"],
        locations: ["Lyon"],
      },
      page_type: "home",
    });
    const { graph, missing_fields } = buildJsonLd({
      business: {
        business_name: "Plomberie Dupont Test",
        nap: {
          addressLocality: "Lyon",
          phone: "0400000000",
          postalCode: "69001",
          streetAddress: "1 rue Test",
        },
        services: ["Débouchage"],
        locations: ["Lyon"],
      },
      page,
      pageType: "home",
    });
    assert.equal((graph as { "@context": string })["@context"], "https://schema.org");
    assert.ok(missing_fields.includes("siret"));
  });
});
